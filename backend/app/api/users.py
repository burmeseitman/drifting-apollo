from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.security.auth import get_active_admin_count, get_current_user, hash_password, require_admin

router = APIRouter(tags=["users"])


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found.",
        )
    return user


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(select(User).order_by(User.created_at.asc(), User.username.asc())).all()
    return [UserResponse.model_validate(user) for user in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    username = request.username.strip()
    existing_user = db.scalar(select(User).where(User.username == username))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already in use.",
        )

    user = User(
        username=username,
        hashed_password=hash_password(request.password),
        role=request.role.value,
        is_active=request.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = _get_user_or_404(db, user_id)

    if request.role is None and request.is_active is None and request.password is None:
        return UserResponse.model_validate(user)

    next_role = request.role.value if request.role is not None else user.role
    next_active = request.is_active if request.is_active is not None else user.is_active

    removing_admin_access = (
        user.role == UserRole.ADMIN.value
        and (next_role != UserRole.ADMIN.value or not next_active)
    )
    if removing_admin_access and get_active_admin_count(db, exclude_user_id=user.id) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one admin must stay active.",
        )

    if current_admin.id == user.id and request.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't turn off your own account.",
        )

    if request.role is not None:
        user.role = request.role.value
    if request.is_active is not None:
        user.is_active = request.is_active
    if request.password:
        user.hashed_password = hash_password(request.password)

    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

import ipaddress

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import AuthStatusResponse, BootstrapAdminRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.security.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_user_count,
    hash_password,
)
from app.security.rate_limiter import auth_rate_limiter

router = APIRouter(tags=["auth"])


def _client_host(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _is_loopback(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host == "localhost"


def _enforce_rate_limit(key: str, limit: int, window_seconds: int):
    retry_after = auth_rate_limiter.hit(key, limit=limit, window_seconds=window_seconds)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


@router.get("/auth/status", response_model=AuthStatusResponse)
async def auth_status(db: Session = Depends(get_db)):
    user_count = get_user_count(db)
    return AuthStatusResponse(
        setup_required=user_count == 0,
        user_count=user_count,
    )


@router.post("/auth/bootstrap", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def bootstrap_admin(
    request: BootstrapAdminRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    client_host = _client_host(http_request)
    if settings.bootstrap_local_only and not _is_loopback(client_host):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="First admin setup is only allowed from this machine.",
        )

    _enforce_rate_limit(
        key=f"bootstrap:{client_host}",
        limit=settings.bootstrap_rate_limit_count,
        window_seconds=settings.bootstrap_rate_limit_window_seconds,
    )

    if get_user_count(db) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The first admin can only be created before anyone else is added.",
        )

    user = User(
        username=request.username.strip(),
        hashed_password=hash_password(request.password),
        role=UserRole.ADMIN.value,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user),
        user=UserResponse.model_validate(user),
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    client_host = _client_host(http_request)
    rate_limit_key = f"login:{client_host}"
    _enforce_rate_limit(
        key=rate_limit_key,
        limit=settings.login_rate_limit_count,
        window_seconds=settings.login_rate_limit_window_seconds,
    )

    user = authenticate_user(db, request.username, request.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The username or password is incorrect.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is turned off.",
        )

    auth_rate_limiter.clear(rate_limit_key)
    return TokenResponse(
        access_token=create_access_token(user),
        user=UserResponse.model_validate(user),
    )


@router.get("/auth/me", response_model=UserResponse)
async def current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import log_suspicious_query
from app.core.logging import log_security_event
from app.models.chat import ChatMessage, ChatMessageRole
from app.models.user import User
from app.schemas.chat import ChatHistoryDeleteResponse, ChatHistoryResponse, ChatMessageResponse, ChatRequest, ChatResponse
from app.security.auth import get_current_user
from app.security.injection_detector import InjectionDetector
from app.services.llm_guard_service import LLMGuardService, LLMGuardUnavailableError
from app.services.ollama_service import OllamaService
from app.services.vector_service import VectorService

router = APIRouter()
ollama = OllamaService()
vector_db = VectorService()
llm_guard = LLMGuardService()

PROMPT_INJECTION_THRESHOLD = 0.92
MALICIOUS_URLS_THRESHOLD = 0.75


def _serialize_messages(messages: list[ChatMessage]) -> list[ChatMessageResponse]:
    return [ChatMessageResponse.model_validate(message) for message in messages]


def _guard_blocks_prompt(result) -> bool:
    return (
        result.score("PromptInjection") >= PROMPT_INJECTION_THRESHOLD
        or result.score("InvisibleText") > 0
        or result.score("TokenLimit") > 0
    )


def _guard_blocks_output(result) -> bool:
    return result.score("MaliciousURLs") >= MALICIOUS_URLS_THRESHOLD


def _scan_user_prompt(prompt: str, current_user: User) -> str:
    if llm_guard.is_enabled():
        try:
            result = llm_guard.analyze_prompt(prompt)
        except LLMGuardUnavailableError as exc:
            log_security_event(
                "LLM Guard input scan unavailable",
                user_id=current_user.username,
                details=str(exc),
            )
            if settings.llm_guard_fail_closed:
                raise HTTPException(status_code=503, detail="Safety service unavailable.") from exc

            result = None

        if result is not None:
            if _guard_blocks_prompt(result):
                log_security_event(
                    "Prompt blocked by LLM Guard",
                    user_id=current_user.username,
                    details=str(result.scanners),
                )
                raise HTTPException(status_code=400, detail="This request was blocked by a safety check.")

            return result.sanitized_text

    if InjectionDetector.is_malicious(prompt):
        log_suspicious_query(
            prompt,
            "Prompt Injection Detected",
            user_id=current_user.username,
        )
        raise HTTPException(status_code=400, detail="This request was blocked by a safety check.")

    return InjectionDetector.sanitize(prompt)


def _sanitize_retrieved_context(context: str, current_user: User) -> str:
    if not context.strip():
        return ""

    if not llm_guard.is_enabled():
        return context

    try:
        result = llm_guard.analyze_text_chunks(context, scanners_suppress=["TokenLimit"])
    except LLMGuardUnavailableError as exc:
        log_security_event(
            "LLM Guard context scan unavailable",
            user_id=current_user.username,
            details=str(exc),
        )
        if settings.llm_guard_fail_closed:
            raise HTTPException(status_code=503, detail="Safety service unavailable.") from exc

        return context

    if _guard_blocks_prompt(result):
        log_security_event(
            "Retrieved context dropped by LLM Guard",
            user_id=current_user.username,
            details=str(result.scanners),
        )
        return ""

    return result.sanitized_text


def _sanitize_model_output(prompt: str, response: str, current_user: User) -> str:
    if not llm_guard.is_enabled() or not settings.llm_guard_scan_output:
        return response

    try:
        result = llm_guard.analyze_output(prompt=prompt, output=response)
    except LLMGuardUnavailableError as exc:
        log_security_event(
            "LLM Guard output scan unavailable",
            user_id=current_user.username,
            details=str(exc),
        )
        if settings.llm_guard_fail_closed:
            raise HTTPException(status_code=503, detail="Safety service unavailable.") from exc

        return response

    if result.is_valid:
        return result.sanitized_text

    log_security_event(
        "Model output flagged by LLM Guard",
        user_id=current_user.username,
        details=str(result.scanners),
    )

    if _guard_blocks_output(result):
        return "I couldn't return that answer because it failed a safety check."

    if result.sanitized_text.strip():
        return result.sanitized_text

    return "I couldn't return that answer because it failed a safety check."


@router.get("/chat/history", response_model=ChatHistoryResponse)
async def chat_history(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statement = (
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    )
    messages = list(db.scalars(statement))
    messages.reverse()

    return ChatHistoryResponse(
        messages=_serialize_messages(messages),
        count=len(messages),
    )


@router.delete("/chat/history", response_model=ChatHistoryDeleteResponse)
async def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        delete(ChatMessage).where(ChatMessage.user_id == current_user.id),
    )
    db.commit()
    return ChatHistoryDeleteResponse(deleted=result.rowcount or 0)


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    selected_model = request.model.strip() or settings.ollama_model
    sanitized_prompt = _scan_user_prompt(request.prompt, current_user)
    context = ""

    if request.use_rag:
        try:
            results = vector_db.query_documents(sanitized_prompt)
            if results["documents"]:
                raw_context = "\n".join(results["documents"][0])
                context = _sanitize_retrieved_context(raw_context, current_user)
        except Exception:
            context = ""

    response = ollama.generate_response(selected_model, sanitized_prompt, context)
    response = _sanitize_model_output(sanitized_prompt, response, current_user)

    db.add_all(
        [
            ChatMessage(
                user_id=current_user.id,
                role=ChatMessageRole.USER.value,
                content=sanitized_prompt,
                model=selected_model,
                use_rag=request.use_rag,
                context_used=None,
            ),
            ChatMessage(
                user_id=current_user.id,
                role=ChatMessageRole.ASSISTANT.value,
                content=response,
                model=selected_model,
                use_rag=request.use_rag,
                context_used=bool(context),
            ),
        ],
    )
    db.commit()

    return ChatResponse(
        response=response,
        context_used=bool(context),
        model=selected_model,
    )

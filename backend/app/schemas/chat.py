from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    model: str = Field(default=settings.ollama_model, min_length=1, max_length=100)
    use_rag: bool = True


class ChatResponse(BaseModel):
    response: str
    context_used: bool
    model: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    model: str | None
    use_rag: bool | None
    context_used: bool | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]
    count: int


class ChatHistoryDeleteResponse(BaseModel):
    deleted: int

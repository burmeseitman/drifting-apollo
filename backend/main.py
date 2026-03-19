from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.docs import router as docs_router
from app.api.users import router as users_router
from app.core.config import settings
from app.core.database import init_db, is_database_available
from app.services.llm_guard_service import LLMGuardService
from app.services.ollama_service import OllamaService
from app.services.vector_service import VectorService

app = FastAPI(title="Secure Local AI Workspace (SLAW) API")
ollama_service = OllamaService()
vector_service = VectorService()
llm_guard_service = LLMGuardService()

# Configure CORS - Restrict for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(docs_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.on_event("startup")
async def startup():
    init_db()

@app.get("/")
async def root():
    return {"message": "Welcome to the Drifting-Apollo API."}

@app.get("/health")
async def health():
    database_available = is_database_available()
    chroma_available = vector_service.is_available()
    ollama_available = ollama_service.is_available()
    llm_guard_available = llm_guard_service.is_available()
    required_services = [database_available, chroma_available, ollama_available]
    if llm_guard_service.is_enabled():
        required_services.append(llm_guard_available)

    status = "healthy" if all(required_services) else "degraded"

    return {
        "status": status,
        "services": {
            "api": True,
            "database": database_available,
            "chroma": chroma_available,
            "ollama": ollama_available,
            "llm_guard": llm_guard_available,
        },
        "model": {
            "provider": "ollama",
            "name": ollama_service.get_default_model(),
        },
        "security": {
            "llm_guard_enabled": llm_guard_service.is_enabled(),
            "llm_guard_fail_closed": settings.llm_guard_fail_closed,
        },
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )

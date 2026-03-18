from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.chat import router as chat_router
from app.api.docs import router as docs_router
from app.services.ollama_service import OllamaService
from app.services.vector_service import VectorService

app = FastAPI(title="Secure Local AI Workspace (SLAW) API")
ollama_service = OllamaService()
vector_service = VectorService()

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
app.include_router(chat_router, prefix="/api")
app.include_router(docs_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to SLAW API - Secure Local AI Workspace"}

@app.get("/health")
async def health():
    chroma_available = vector_service.is_available()
    ollama_available = ollama_service.is_available()
    status = "healthy" if chroma_available and ollama_available else "degraded"

    return {
        "status": status,
        "services": {
            "api": True,
            "chroma": chroma_available,
            "ollama": ollama_available,
        },
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

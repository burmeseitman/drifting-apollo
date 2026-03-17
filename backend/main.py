from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.chat import router as chat_router
from app.api.docs import router as docs_router

app = FastAPI(title="Secure Local AI Workspace (SLAW) API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

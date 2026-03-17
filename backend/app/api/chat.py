from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.security.injection_detector import InjectionDetector
from app.core.logging import log_suspicious_query
from app.services.ollama_service import OllamaService
from app.services.vector_service import VectorService

router = APIRouter()
ollama = OllamaService()
vector_db = VectorService()

class ChatRequest(BaseModel):
    prompt: str
    model: str = "llama3"
    use_rag: bool = True

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # 1. Security Check
    if InjectionDetector.is_malicious(request.prompt):
        log_suspicious_query(request.prompt, "Prompt Injection Detected")
        raise HTTPException(status_code=400, detail="Malicious prompt detected and blocked.")

    # 2. Sanitize
    sanitized_prompt = InjectionDetector.sanitize(request.prompt)

    context = ""
    # 3. RAG Retrieval (Optional)
    if request.use_rag:
        try:
            results = vector_db.query_documents(sanitized_prompt)
            if results['documents']:
                context = "\n".join(results['documents'][0])
        except Exception as e:
            print(f"RAG Error: {e}")

    # 4. Generate AI Response
    response = ollama.generate_response(request.model, sanitized_prompt, context)
    
    return {"response": response, "context_used": bool(context)}

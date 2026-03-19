import requests

from app.core.config import settings


class OllamaService:
    def __init__(self, base_url: str | None = None, default_model: str | None = None):
        self.base_url = base_url or settings.ollama_base_url
        self.default_model = default_model or settings.ollama_model

    def get_default_model(self) -> str:
        return self.default_model

    def is_available(self) -> bool:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            response.raise_for_status()
            return True
        except Exception:
            return False

    def generate_response(self, model: str, prompt: str, context: str = ""):
        url = f"{self.base_url}/api/generate"
        
        full_prompt = f"Context: {context}\n\nQuestion: {prompt}" if context else prompt
        
        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": False
        }
        
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            return response.json().get("response", "The AI did not return an answer.")
        except Exception:
            return "The AI service is unavailable right now."

    def chat(self, model: str, messages: list):
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": False
        }
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            return response.json().get("message", {}).get("content", "The AI did not return an answer.")
        except Exception:
            return "The AI service is unavailable right now."

import requests

class OllamaService:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url

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
            return response.json().get("response", "No response from model.")
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

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
            return response.json().get("message", {}).get("content", "No content.")
        except Exception as e:
            return f"Error in chat: {str(e)}"

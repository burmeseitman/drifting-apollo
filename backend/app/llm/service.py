import os
import logging
from llama_cpp import Llama
from app.core.config import settings

logger = logging.getLogger(__name__)

class LocalLLMService:
    _instance = None
    _llm = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalLLMService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Already initialized if _llm is set
        if self._llm is not None:
            return
            
        self.model_path = os.path.abspath(os.path.join(settings.BASE_DIR, settings.llm_model_path))
        self.context_window = settings.llm_context_window
        
        if os.path.exists(self.model_path):
            try:
                logger.info(f"Loading model from {self.model_path}")
                self._llm = Llama(
                    model_path=self.model_path,
                    n_ctx=self.context_window,
                    n_threads=os.cpu_count() or 4,
                    verbose=False
                )
                logger.info("Model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                self._llm = None
        else:
            logger.warning(f"Model file not found at {self.model_path}")

    def is_available(self) -> bool:
        return self._llm is not None

    def get_default_model(self) -> str:
        return os.path.basename(self.model_path) if self.model_path else "unknown"

    def generate_response(self, model: str, prompt: str, context: str = ""):
        # Compatibility with Ollama's signature
        if not self.is_available():
            return "The AI service is unavailable right now."

        full_prompt = f"Context: {context}\n\nQuestion: {prompt}" if context else prompt
        
        try:
            # We ignore the 'model' parameter since we have a pre-loaded model
            output = self._llm(
                full_prompt,
                max_tokens=1024,
                stop=["User:", "\n\n\n"],
                echo=False
            )
            return output["choices"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Generation error: {e}")
            return "Local LLM service failed to process the request."

    def chat(self, model: str, messages: list):
        # Compatibility with Ollama's signature
        if not self.is_available():
            return "The AI service is unavailable right now."

        try:
            # We ignore the 'model' parameter
            response = self._llm.create_chat_completion(
                messages=messages,
                max_tokens=1024
            )
            return response["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return "Local LLM service failed to process the chat request."

from functools import lru_cache
from pathlib import Path
import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET_KEY = "slaw-dev-secret-change-me"
BASE_DIR = Path(__file__).resolve().parents[2]
SECRETS_DIR = BASE_DIR / ".secrets"
JWT_SECRET_FILE = SECRETS_DIR / "jwt_secret_key"


def _read_or_create_secret(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8").strip()

    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    generated_secret = secrets.token_urlsafe(48)
    path.write_text(generated_secret, encoding="utf-8")
    try:
        path.chmod(0o600)
    except PermissionError:
        pass
    return generated_secret


class Settings(BaseSettings):
    database_url: str = "sqlite:///./slaw.db"
    jwt_secret_key: str = DEFAULT_JWT_SECRET_KEY
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    api_host: str = "127.0.0.1"
    api_port: int = 8001
    api_reload: bool = False
    bootstrap_local_only: bool = True
    login_rate_limit_count: int = 5
    login_rate_limit_window_seconds: int = 300
    bootstrap_rate_limit_count: int = 3
    bootstrap_rate_limit_window_seconds: int = 600
    llm_model_path: str = "models/llama-3-8b.gguf"
    llm_context_window: int = 2048
    llm_guard_enabled: bool = False
    llm_guard_base_url: str = "http://localhost:8002"
    llm_guard_api_token: str = ""
    llm_guard_timeout_seconds: float = 8.0
    llm_guard_fail_closed: bool = False
    llm_guard_scan_output: bool = True
    llm_guard_chunk_size: int = 2000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def normalized_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql://", 1)
        return self.database_url

    @property
    def effective_jwt_secret_key(self) -> str:
        if self.jwt_secret_key != DEFAULT_JWT_SECRET_KEY:
            return self.jwt_secret_key

        return _read_or_create_secret(JWT_SECRET_FILE)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

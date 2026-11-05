from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CloudCost AI Backend"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql://akshitgupta@localhost:5432/cloudcost_ai"

    # JWT Authentication settings
    JWT_SECRET_KEY: str = "cloudcost-ai-super-secret-jwt-signing-key-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # LLM / AI Integration settings
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_TIMEOUT_SECONDS: int = 30

    # RAG / Embeddings settings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Redis & Celery Background Queue settings
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_TASK_ALWAYS_EAGER: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_llm_configured(self) -> bool:
        """Returns True if a non-placeholder API key is set."""
        key = self.OPENAI_API_KEY.strip()
        return bool(key and not key.startswith("your-") and not key.startswith("replace-") and key != "sk-placeholder")


settings = Settings()

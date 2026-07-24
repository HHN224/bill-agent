"""Application configuration loaded from environment variables."""

from functools import lru_cache
import os

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict


class Settings(BaseModel):
    """Runtime settings for the bookkeeping service."""

    model_config = ConfigDict(frozen=True)

    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""
    app_api_token: str = ""
    default_timezone: str = "Asia/Taipei"
    database_url: str = "sqlite:///./data/bookkeeping.db"

    @classmethod
    def from_environment(cls) -> "Settings":
        """Build settings from a local .env file and process environment."""
        load_dotenv()
        return cls(
            llm_api_key=os.getenv("LLM_API_KEY", ""),
            llm_base_url=os.getenv("LLM_BASE_URL", ""),
            llm_model=os.getenv("LLM_MODEL", ""),
            app_api_token=os.getenv("APP_API_TOKEN", ""),
            default_timezone=os.getenv("DEFAULT_TIMEZONE", "Asia/Taipei"),
            database_url=os.getenv(
                "DATABASE_URL", "sqlite:///./data/bookkeeping.db"
            ),
        )


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide immutable application settings."""
    return Settings.from_environment()

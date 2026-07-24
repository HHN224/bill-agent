from app.config import Settings


def test_settings_defaults() -> None:
    settings = Settings()

    assert settings.default_timezone == "Asia/Taipei"
    assert settings.database_url == "sqlite:///./data/bookkeeping.db"
    assert settings.llm_timeout_seconds == 8.0

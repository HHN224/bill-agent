"""SQLAlchemy engine, session factory, and database initialization."""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


def _sqlite_file_path(database_url: str) -> Path | None:
    """Return the local path from a file-backed SQLite URL."""
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return None

    database_path = database_url.removeprefix(prefix)
    if not database_path or database_path == ":memory:":
        return None
    return Path(database_path)


def create_database_engine(database_url: str) -> Engine:
    """Create a SQLAlchemy engine suitable for the configured database."""
    database_path = _sqlite_file_path(database_url)
    if database_path is not None:
        database_path.parent.mkdir(parents=True, exist_ok=True)

    connect_args = (
        {"check_same_thread": False}
        if database_url.startswith("sqlite")
        else {}
    )
    return create_engine(database_url, connect_args=connect_args)


engine = create_database_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def initialize_database(database_engine: Engine = engine) -> None:
    """Create all currently defined database tables."""
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=database_engine)


def get_db() -> Generator[Session, None, None]:
    """Yield one database session and always close it after the request."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

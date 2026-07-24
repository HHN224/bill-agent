"""SQLAlchemy 引擎、会话工厂和数据库初始化。"""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""


def _sqlite_file_path(database_url: str) -> Path | None:
    """从文件型 SQLite 地址中提取本地路径。"""
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return None

    database_path = database_url.removeprefix(prefix)
    if not database_path or database_path == ":memory:":
        return None
    return Path(database_path)


def create_database_engine(database_url: str) -> Engine:
    """按照数据库配置创建 SQLAlchemy 引擎。"""
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
    """创建当前已经定义的全部数据表。"""
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=database_engine)


def get_db() -> Generator[Session, None, None]:
    """为单次请求提供数据库会话，并在结束后确保关闭。"""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

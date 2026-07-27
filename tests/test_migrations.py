import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import inspect

from app.database import create_database_engine, initialize_database


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INITIAL_REVISION = "20260727_0001"


def alembic_config(database_url: str) -> Config:
    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.attributes["database_url"] = database_url
    return config


def test_upgrade_head_creates_schema_and_version(tmp_path: Path) -> None:
    database_file = tmp_path / "migrated.db"
    database_url = f"sqlite:///{database_file.as_posix()}"
    config = alembic_config(database_url)

    command.upgrade(config, "head")

    engine = create_database_engine(database_url)
    inspector = inspect(engine)
    assert {"alembic_version", "transactions"} <= set(
        inspector.get_table_names()
    )
    with engine.connect() as connection:
        version = connection.exec_driver_sql(
            "SELECT version_num FROM alembic_version"
        ).scalar_one()
    assert version == INITIAL_REVISION
    engine.dispose()

    command.check(config)


def test_upgrade_head_adopts_existing_create_all_database(
    tmp_path: Path,
) -> None:
    database_file = tmp_path / "legacy.db"
    database_url = f"sqlite:///{database_file.as_posix()}"
    engine = create_database_engine(database_url)
    initialize_database(engine)
    engine.dispose()

    command.upgrade(alembic_config(database_url), "head")

    migrated_engine = create_database_engine(database_url)
    with migrated_engine.connect() as connection:
        version = connection.exec_driver_sql(
            "SELECT version_num FROM alembic_version"
        ).scalar_one()
    assert version == INITIAL_REVISION
    migrated_engine.dispose()


def test_upgrade_rejects_incompatible_legacy_table(tmp_path: Path) -> None:
    database_file = tmp_path / "incompatible.db"
    database_url = f"sqlite:///{database_file.as_posix()}"
    engine = create_database_engine(database_url)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE transactions (id INTEGER PRIMARY KEY)"
        )
    engine.dispose()

    with pytest.raises(RuntimeError, match="incompatible"):
        command.upgrade(alembic_config(database_url), "head")


def test_migration_preserves_existing_application_loggers(
    tmp_path: Path,
) -> None:
    database_file = tmp_path / "logging.db"
    database_url = f"sqlite:///{database_file.as_posix()}"
    logger = logging.getLogger("app.migration-regression-test")
    logger.disabled = False

    command.upgrade(alembic_config(database_url), "head")

    assert logger.disabled is False

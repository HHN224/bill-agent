from sqlalchemy import inspect

from app.database import create_database_engine, initialize_database


def test_initialize_database_creates_transaction_table(tmp_path) -> None:
    database_file = tmp_path / "nested" / "bookkeeping.db"
    engine = create_database_engine(f"sqlite:///{database_file.as_posix()}")

    initialize_database(engine)

    inspector = inspect(engine)
    assert "transactions" in inspector.get_table_names()
    columns = {column["name"] for column in inspector.get_columns("transactions")}
    assert {
        "id",
        "type",
        "amount",
        "currency",
        "category",
        "subcategory",
        "merchant",
        "payment_method",
        "occurred_at",
        "note",
        "tags",
        "raw_text",
        "confidence",
        "created_at",
        "updated_at",
    } == columns

    engine.dispose()

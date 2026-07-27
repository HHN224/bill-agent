"""Create the initial transactions table.

Revision ID: 20260727_0001
Revises:
Create Date: 2026-07-27
"""

from collections.abc import Sequence

from alembic import context, op
import sqlalchemy as sa


revision: str = "20260727_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


EXPECTED_COLUMNS = {
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
}


def _adopt_legacy_table_if_compatible() -> bool:
    """Adopt a compatible table created before Alembic was introduced."""
    if context.is_offline_mode():
        return False

    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("transactions"):
        return False

    existing_columns = {
        column["name"] for column in inspector.get_columns("transactions")
    }
    if existing_columns != EXPECTED_COLUMNS:
        missing = sorted(EXPECTED_COLUMNS - existing_columns)
        unexpected = sorted(existing_columns - EXPECTED_COLUMNS)
        raise RuntimeError(
            "Existing transactions table is incompatible with the initial "
            f"migration; missing={missing}, unexpected={unexpected}."
        )
    return True


def upgrade() -> None:
    """Create the transactions table or adopt a compatible legacy table."""
    if _adopt_legacy_table_if_compatible():
        return

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("subcategory", sa.String(length=64), nullable=True),
        sa.Column("merchant", sa.String(length=128), nullable=True),
        sa.Column("payment_method", sa.String(length=64), nullable=True),
        sa.Column("occurred_at", sa.String(length=35), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column(
            "confidence",
            sa.Numeric(precision=4, scale=3),
            nullable=True,
        ),
        sa.Column("created_at", sa.String(length=35), nullable=False),
        sa.Column("updated_at", sa.String(length=35), nullable=False),
        sa.CheckConstraint(
            "amount > 0",
            name="ck_transactions_amount_positive",
        ),
        sa.CheckConstraint(
            "confidence IS NULL OR "
            "(confidence >= 0 AND confidence <= 1)",
            name="ck_transactions_confidence_range",
        ),
        sa.CheckConstraint(
            "type IN ('expense', 'income')",
            name="ck_transactions_type",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_transactions_category"),
        "transactions",
        ["category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transactions_occurred_at"),
        "transactions",
        ["occurred_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_transactions_type"),
        "transactions",
        ["type"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the initial transactions table."""
    op.drop_index(op.f("ix_transactions_type"), table_name="transactions")
    op.drop_index(
        op.f("ix_transactions_occurred_at"),
        table_name="transactions",
    )
    op.drop_index(
        op.f("ix_transactions_category"),
        table_name="transactions",
    )
    op.drop_table("transactions")

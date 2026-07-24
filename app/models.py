"""记账记录的数据库模型。"""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from app.database import Base


def utc_now() -> datetime:
    """返回带时区信息的当前 UTC 时间。"""
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator[datetime]):
    """在 SQLite 中以 ISO 8601 字符串保存 UTC 时间。"""

    impl = String(35)
    cache_ok = True

    def process_bind_param(
        self,
        value: datetime | None,
        dialect: Dialect,
    ) -> str | None:
        """写入前校验时区并转换为 UTC。"""
        del dialect
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Datetime values must include a timezone.")
        return value.astimezone(timezone.utc).isoformat()

    def process_result_value(
        self,
        value: str | datetime | None,
        dialect: Dialect,
    ) -> datetime | None:
        """读取时恢复带 UTC 时区的 datetime。"""
        del dialect
        if value is None:
            return None
        parsed = (
            value
            if isinstance(value, datetime)
            else datetime.fromisoformat(value)
        )
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)


class Transaction(Base):
    """单笔支出或收入记录。"""

    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "type IN ('expense', 'income')",
            name="ck_transactions_type",
        ),
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
            name="ck_transactions_confidence_range",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="CNY"
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    subcategory: Mapped[str | None] = mapped_column(String(64))
    merchant: Mapped[str | None] = mapped_column(String(128))
    payment_method: Mapped[str | None] = mapped_column(String(64))
    occurred_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), nullable=False, index=True
    )
    note: Mapped[str | None] = mapped_column(String(255))
    tags: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

"""使用数据库聚合计算账单统计。"""

from datetime import date, datetime, time, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Transaction
from app.schemas import (
    CategoryAmount,
    DailyAmount,
    DailySummaryResponse,
    MonthlySummaryResponse,
)


class InvalidSummaryTimezoneError(Exception):
    """统计服务的时区配置无效。"""


def _get_timezone(timezone_name: str) -> ZoneInfo:
    """读取统计使用的 IANA 时区。"""
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise InvalidSummaryTimezoneError(
            "The summary timezone is invalid."
        ) from exc


def _as_decimal(value: object) -> Decimal:
    """把数据库聚合值统一转换为 Decimal。"""
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _local_day_bounds(
    target_date: date,
    target_timezone: ZoneInfo,
) -> tuple[datetime, datetime]:
    """生成本地日期对应的 UTC 起止时间。"""
    start_local = datetime.combine(
        target_date,
        time.min,
        tzinfo=target_timezone,
    )
    end_local = datetime.combine(
        target_date.fromordinal(target_date.toordinal() + 1),
        time.min,
        tzinfo=target_timezone,
    )
    return (
        start_local.astimezone(timezone.utc),
        end_local.astimezone(timezone.utc),
    )


def _local_month_bounds(
    year: int,
    month: int,
    target_timezone: ZoneInfo,
) -> tuple[datetime, datetime]:
    """生成本地月份对应的 UTC 起止时间。"""
    start_local = datetime(year, month, 1, tzinfo=target_timezone)
    if month == 12:
        end_local = datetime(year + 1, 1, 1, tzinfo=target_timezone)
    else:
        end_local = datetime(year, month + 1, 1, tzinfo=target_timezone)
    return (
        start_local.astimezone(timezone.utc),
        end_local.astimezone(timezone.utc),
    )


def _totals(
    session: Session,
    start_time: datetime,
    end_time: datetime,
) -> tuple[Decimal, Decimal, int]:
    """在数据库中计算区间支出、收入与账单数。"""
    statement = select(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type == "expense", Transaction.amount),
                    else_=0,
                )
            ),
            0,
        ).label("expense_total"),
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type == "income", Transaction.amount),
                    else_=0,
                )
            ),
            0,
        ).label("income_total"),
        func.count(Transaction.id).label("transaction_count"),
    ).where(
        Transaction.occurred_at >= start_time,
        Transaction.occurred_at < end_time,
    )
    row = session.execute(statement).one()
    return (
        _as_decimal(row.expense_total),
        _as_decimal(row.income_total),
        int(row.transaction_count),
    )


def _expense_categories(
    session: Session,
    start_time: datetime,
    end_time: datetime,
) -> list[CategoryAmount]:
    """在数据库中按支出分类汇总金额。"""
    amount_sum = func.sum(Transaction.amount).label("amount")
    statement = (
        select(Transaction.category, amount_sum)
        .where(
            Transaction.occurred_at >= start_time,
            Transaction.occurred_at < end_time,
            Transaction.type == "expense",
        )
        .group_by(Transaction.category)
        .order_by(amount_sum.desc(), Transaction.category)
    )
    return [
        CategoryAmount(
            category=row.category,
            amount=_as_decimal(row.amount),
        )
        for row in session.execute(statement)
    ]


def _sqlite_offset_modifier(local_time: datetime) -> str:
    """生成 SQLite 日期函数使用的固定 UTC 偏移。"""
    offset = local_time.utcoffset()
    total_minutes = int(offset.total_seconds() // 60) if offset else 0
    sign = "+" if total_minutes >= 0 else "-"
    absolute_minutes = abs(total_minutes)
    hours, minutes = divmod(absolute_minutes, 60)
    return f"{sign}{hours:02d}:{minutes:02d}"


def _daily_expense_totals(
    session: Session,
    start_time: datetime,
    end_time: datetime,
    local_month_start: datetime,
) -> list[DailyAmount]:
    """在数据库中按本地日期汇总每日支出。"""
    local_date = func.date(
        Transaction.occurred_at,
        _sqlite_offset_modifier(local_month_start),
    ).label("date")
    amount_sum = func.sum(Transaction.amount).label("amount")
    statement = (
        select(local_date, amount_sum)
        .where(
            Transaction.occurred_at >= start_time,
            Transaction.occurred_at < end_time,
            Transaction.type == "expense",
        )
        .group_by(local_date)
        .order_by(local_date)
    )
    return [
        DailyAmount(
            date=date.fromisoformat(row.date),
            amount=_as_decimal(row.amount),
        )
        for row in session.execute(statement)
    ]


def get_daily_summary(
    session: Session,
    timezone_name: str,
    current_time: datetime | None = None,
) -> DailySummaryResponse:
    """计算默认时区中今日的收支与支出分类。"""
    target_timezone = _get_timezone(timezone_name)
    if current_time is None:
        local_now = datetime.now(target_timezone)
    elif current_time.tzinfo is None:
        local_now = current_time.replace(tzinfo=target_timezone)
    else:
        local_now = current_time.astimezone(target_timezone)

    target_date = local_now.date()
    start_time, end_time = _local_day_bounds(
        target_date,
        target_timezone,
    )
    expense_total, income_total, transaction_count = _totals(
        session,
        start_time,
        end_time,
    )
    return DailySummaryResponse(
        date=target_date,
        expense_total=expense_total,
        income_total=income_total,
        transaction_count=transaction_count,
        categories=_expense_categories(
            session,
            start_time,
            end_time,
        ),
    )


def get_monthly_summary(
    session: Session,
    timezone_name: str,
    year: int,
    month: int,
) -> MonthlySummaryResponse:
    """计算指定月份的收支、分类与每日支出。"""
    target_timezone = _get_timezone(timezone_name)
    start_time, end_time = _local_month_bounds(
        year,
        month,
        target_timezone,
    )
    expense_total, income_total, transaction_count = _totals(
        session,
        start_time,
        end_time,
    )
    local_month_start = datetime(
        year,
        month,
        1,
        tzinfo=target_timezone,
    )
    return MonthlySummaryResponse(
        year=year,
        month=month,
        expense_total=expense_total,
        income_total=income_total,
        net_amount=income_total - expense_total,
        transaction_count=transaction_count,
        categories=_expense_categories(
            session,
            start_time,
            end_time,
        ),
        daily_totals=_daily_expense_totals(
            session,
            start_time,
            end_time,
            local_month_start,
        ),
    )

"""今日与月度账单统计接口。"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.dependencies import verify_admin_token
from app.errors import APIError
from app.logging_config import get_application_logger
from app.schemas import DailySummaryResponse, MonthlySummaryResponse
from app.services.summary_service import (
    InvalidSummaryTimezoneError,
    get_daily_summary,
    get_monthly_summary,
)


logger = get_application_logger(__name__)


router = APIRouter(
    prefix="/api/summaries",
    tags=["summaries"],
    dependencies=[Depends(verify_admin_token)],
)


def _summary_error(exc: Exception) -> APIError:
    """把统计服务异常转换为统一 API 错误。"""
    if isinstance(exc, InvalidSummaryTimezoneError):
        return APIError(
            status_code=500,
            error_code="INVALID_TIMEZONE_CONFIG",
            message=str(exc),
        )
    logger.error(
        "Summary database query failed error_type=%s",
        type(exc).__name__,
    )
    return APIError(
        status_code=500,
        error_code="DATABASE_ERROR",
        message="The database summary query failed.",
    )


@router.get("/daily", response_model=DailySummaryResponse)
def daily_summary(
    session: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DailySummaryResponse:
    """返回默认时区中的今日收支和分类汇总。"""
    try:
        return get_daily_summary(
            session,
            settings.default_timezone,
        )
    except (InvalidSummaryTimezoneError, SQLAlchemyError) as exc:
        session.rollback()
        raise _summary_error(exc) from exc


@router.get("/monthly", response_model=MonthlySummaryResponse)
def monthly_summary(
    session: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    year: Annotated[int, Query(ge=1, le=9998)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> MonthlySummaryResponse:
    """返回指定月份的收支、分类和每日支出汇总。"""
    try:
        return get_monthly_summary(
            session,
            settings.default_timezone,
            year,
            month,
        )
    except (InvalidSummaryTimezoneError, SQLAlchemyError) as exc:
        session.rollback()
        raise _summary_error(exc) from exc

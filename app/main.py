"""FastAPI 应用入口。"""

from typing import Annotated

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError, register_exception_handlers
from app.logging_config import get_application_logger
from app.routers.summaries import router as summaries_router
from app.routers.transactions import router as transactions_router
from app.schemas import HealthResponse


logger = get_application_logger(__name__)


app = FastAPI(
    title="Natural Language Bookkeeping API",
    version="0.5.0",
)

register_exception_handlers(app)
app.include_router(transactions_router)
app.include_router(summaries_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health(
    session: Annotated[Session, Depends(get_db)],
) -> HealthResponse:
    """返回 API 进程和数据库是否正常运行。"""
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error(
            "Database health check failed error_type=%s",
            type(exc).__name__,
        )
        raise APIError(
            status_code=503,
            error_code="DATABASE_UNAVAILABLE",
            message="The database health check failed.",
        ) from exc
    return HealthResponse(status="ok")

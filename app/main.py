"""FastAPI 应用入口。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import initialize_database
from app.errors import register_exception_handlers
from app.routers.transactions import router as transactions_router
from app.schemas import HealthResponse


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """应用启动时初始化持久化资源。"""
    initialize_database()
    yield


app = FastAPI(
    title="Natural Language Bookkeeping API",
    version="0.3.0",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.include_router(transactions_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """返回 API 进程是否正常运行。"""
    return HealthResponse(status="ok")

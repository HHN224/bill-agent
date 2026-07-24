"""FastAPI 应用入口。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import initialize_database
from app.schemas import HealthResponse


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """应用启动时初始化持久化资源。"""
    initialize_database()
    yield


app = FastAPI(
    title="Natural Language Bookkeeping API",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """返回 API 进程是否正常运行。"""
    return HealthResponse(status="ok")

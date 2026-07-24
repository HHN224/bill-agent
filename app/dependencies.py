"""可复用的 FastAPI 依赖。"""

import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.services.llm_client import LLMClient
from app.services.transaction_parser import TransactionParser


bearer_scheme = HTTPBearer(auto_error=False)


def verify_api_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    """要求 Bearer Token 与 APP_API_TOKEN 一致。"""
    supplied_token = credentials.credentials if credentials else ""
    token_is_valid = bool(settings.app_api_token) and secrets.compare_digest(
        supplied_token,
        settings.app_api_token,
    )
    if not token_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_transaction_parser(
    settings: Annotated[Settings, Depends(get_settings)],
) -> TransactionParser:
    """按照当前配置创建账单解析器。"""
    return TransactionParser(
        LLMClient(settings),
        default_timezone=settings.default_timezone,
    )

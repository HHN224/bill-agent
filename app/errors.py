"""统一的 API 异常与错误响应。"""

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class APIError(Exception):
    """可安全返回给调用方的业务异常。"""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details


def _error_content(
    error_code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    """生成统一的错误响应内容。"""
    return {
        "success": False,
        "error_code": error_code,
        "message": message,
        "details": details,
    }


def register_exception_handlers(app: FastAPI) -> None:
    """为 FastAPI 应用注册统一异常处理器。"""

    @app.exception_handler(APIError)
    async def handle_api_error(
        _: Request,
        exc: APIError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_content(
                exc.error_code,
                exc.message,
                exc.details,
            ),
        )

    @app.exception_handler(HTTPException)
    async def handle_http_error(
        _: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        error_code = (
            "UNAUTHORIZED"
            if exc.status_code == 401
            else "HTTP_ERROR"
        )
        message = (
            exc.detail
            if isinstance(exc.detail, str)
            else "The request failed."
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_content(error_code, message),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        details = [
            {
                "location": list(error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_error_content(
                "VALIDATION_ERROR",
                "The request data is invalid.",
                details,
            ),
        )

"""API 对外返回的 Pydantic 数据结构。"""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """健康检查响应。"""

    status: Literal["ok"]

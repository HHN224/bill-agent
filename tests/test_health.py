from collections.abc import Iterator
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app


def test_health_check_is_public() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_check_returns_503_when_database_is_unavailable(
    capfd: pytest.CaptureFixture[str],
) -> None:
    error_detail = "database-secret-must-not-be-logged"
    session = Mock(spec=Session)
    session.execute.side_effect = SQLAlchemyError(error_detail)

    def unavailable_database() -> Iterator[Session]:
        yield session

    app.dependency_overrides[get_db] = unavailable_database
    try:
        with TestClient(app) as client:
            response = client.get("/health")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    captured = capfd.readouterr()
    assert (
        "Database health check failed error_type=SQLAlchemyError"
        in captured.out
    )
    assert error_detail not in captured.out

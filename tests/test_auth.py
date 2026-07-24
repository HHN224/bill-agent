from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.dependencies import verify_api_token


def create_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.dependency_overrides[get_settings] = lambda: Settings(
        app_api_token="test-token"
    )

    @test_app.get("/protected", dependencies=[Depends(verify_api_token)])
    def protected() -> dict[str, bool]:
        return {"success": True}

    return test_app


def test_valid_token_allows_access() -> None:
    with TestClient(create_test_app()) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200


def test_invalid_token_returns_401() -> None:
    with TestClient(create_test_app()) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer wrong-token"},
        )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_missing_token_returns_401() -> None:
    with TestClient(create_test_app()) as client:
        response = client.get("/protected")

    assert response.status_code == 401

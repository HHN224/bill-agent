import json

import httpx
import pytest

from app.config import Settings
from app.services.llm_client import (
    LLMClient,
    LLMConfigurationError,
    LLMResponseError,
    LLMServiceError,
    LLMTimeoutError,
)


def test_chat_completions_request_and_response() -> None:
    captured_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": '{"amount": 18.5}'}}
                ]
            },
        )

    settings = Settings(
        llm_api_key="secret-key",
        llm_base_url="https://llm.example.test/v1/",
        llm_model="test-model",
    )
    with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
        result = LLMClient(settings, http_client).complete("系统", "用户")

    assert result == '{"amount": 18.5}'
    assert captured_request is not None
    assert str(captured_request.url) == (
        "https://llm.example.test/v1/chat/completions"
    )
    assert captured_request.headers["authorization"] == "Bearer secret-key"
    payload = json.loads(captured_request.content)
    assert payload == {
        "model": "test-model",
        "messages": [
            {"role": "system", "content": "系统"},
            {"role": "user", "content": "用户"},
        ],
    }


def test_missing_configuration_stops_before_request() -> None:
    client = LLMClient(Settings())

    with pytest.raises(LLMConfigurationError, match="LLM_API_KEY"):
        client.complete("系统", "用户")


def test_timeout_is_converted_to_clear_error(
    capfd: pytest.CaptureFixture[str],
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timeout", request=request)

    api_key = "timeout-secret-must-not-be-logged"
    settings = Settings(llm_api_key=api_key, llm_model="model")
    with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
        client = LLMClient(settings, http_client)
        with pytest.raises(LLMTimeoutError):
            client.complete("系统", "用户")

    captured = capfd.readouterr()
    assert "LLM request timed out" in captured.out
    assert api_key not in captured.out


def test_invalid_response_structure_is_rejected(
    capfd: pytest.CaptureFixture[str],
) -> None:
    omitted_tail = "response-envelope-tail-must-not-be-logged"

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [],
                "diagnostic": ("x" * 600) + omitted_tail,
            },
        )

    api_key = "response-secret-must-not-be-logged"
    settings = Settings(llm_api_key=api_key, llm_model="model")
    with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
        client = LLMClient(settings, http_client)
        with pytest.raises(LLMResponseError):
            client.complete("系统", "用户")

    captured = capfd.readouterr()
    assert (
        "LLM response invalid status_code=200 error_type=IndexError"
        in captured.out
    )
    assert "response_snippet='{" in captured.out
    assert omitted_tail not in captured.out
    assert api_key not in captured.out


def test_http_error_is_converted_to_clear_error(
    capfd: pytest.CaptureFixture[str],
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"error": "unavailable"})

    api_key = "service-secret-must-not-be-logged"
    settings = Settings(llm_api_key=api_key, llm_model="model")
    with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
        client = LLMClient(settings, http_client)
        with pytest.raises(LLMServiceError):
            client.complete("系统", "用户")

    captured = capfd.readouterr()
    assert "LLM service request failed status_code=503" in captured.out
    assert api_key not in captured.out

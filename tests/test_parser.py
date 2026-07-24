from datetime import datetime
from decimal import Decimal
import json
from unittest.mock import Mock

import pytest

from app.services.transaction_parser import (
    InvalidModelOutputError,
    InvalidParserInputError,
    ParsedTransaction,
    TransactionParser,
    clean_json_text,
)


CURRENT_TIME = datetime.fromisoformat("2026-07-24T12:30:00+08:00")


def model_output(
    *,
    amount: float | None,
    transaction_type: str = "expense",
    category: str = "餐饮",
    occurred_at: str = "2026-07-24T12:30:00+08:00",
    note: str | None = None,
) -> str:
    return json.dumps(
        {
            "type": transaction_type,
            "amount": amount,
            "currency": "CNY",
            "category": category,
            "subcategory": None,
            "merchant": None,
            "payment_method": None,
            "occurred_at": occurred_at,
            "note": note,
            "tags": [],
            "confidence": 0.95,
        },
        ensure_ascii=False,
    )


@pytest.mark.parametrize(
    ("text", "output", "expected_amount", "expected_type", "expected_category"),
    [
        ("午饭15", model_output(amount=15), Decimal("15"), "expense", "餐饮"),
        (
            "打车花了23块",
            model_output(amount=23, category="交通"),
            Decimal("23"),
            "expense",
            "交通",
        ),
        (
            "昨天买奶茶12元",
            model_output(
                amount=12,
                occurred_at="2026-07-23T12:30:00+08:00",
            ),
            Decimal("12"),
            "expense",
            "餐饮",
        ),
        (
            "淘宝买模型260",
            model_output(amount=260, category="购物"),
            Decimal("260"),
            "expense",
            "购物",
        ),
        (
            "收到生活费2000元",
            model_output(
                amount=2000,
                transaction_type="income",
                category="收入",
            ),
            Decimal("2000"),
            "income",
            "收入",
        ),
        (
            "退款了35块",
            model_output(
                amount=35,
                transaction_type="income",
                category="收入",
            ),
            Decimal("35"),
            "income",
            "收入",
        ),
        (
            "食堂牛肉饭18块5",
            model_output(amount=18.5),
            Decimal("18.5"),
            "expense",
            "餐饮",
        ),
    ],
)
def test_common_bookkeeping_sentences(
    text: str,
    output: str,
    expected_amount: Decimal,
    expected_type: str,
    expected_category: str,
) -> None:
    llm_client = Mock()
    llm_client.complete.return_value = output

    result = TransactionParser(llm_client).parse(text, CURRENT_TIME)

    assert result.amount == expected_amount
    assert result.type == expected_type
    assert result.category == expected_category
    llm_client.complete.assert_called_once()


def test_markdown_json_block_is_cleaned() -> None:
    output = f"```json\n{model_output(amount=18.5)}\n```"
    llm_client = Mock()
    llm_client.complete.return_value = output

    result = TransactionParser(llm_client).parse("午饭18块5", CURRENT_TIME)

    assert isinstance(result, ParsedTransaction)
    assert result.amount == Decimal("18.5")
    assert clean_json_text(output).startswith("{")


def test_invalid_json_retries_once_then_succeeds() -> None:
    llm_client = Mock()
    llm_client.complete.side_effect = [
        "not-json",
        model_output(amount=20),
    ]

    result = TransactionParser(llm_client).parse("午饭20", CURRENT_TIME)

    assert result.amount == Decimal("20")
    assert llm_client.complete.call_count == 2
    retry_prompt = llm_client.complete.call_args_list[1].args[1]
    assert "上一次输出不是符合要求的 JSON" in retry_prompt


def test_configured_default_timezone_is_added_to_prompt() -> None:
    llm_client = Mock()
    llm_client.complete.return_value = model_output(amount=20)
    parser = TransactionParser(
        llm_client,
        default_timezone="Asia/Hong_Kong",
    )

    parser.parse("午饭20", CURRENT_TIME)

    user_prompt = llm_client.complete.call_args.args[1]
    assert "时区：Asia/Hong_Kong" in user_prompt
    llm_client.complete.assert_called_once()


def test_invalid_json_after_retry_returns_clear_error() -> None:
    llm_client = Mock()
    llm_client.complete.return_value = "not-json"

    with pytest.raises(InvalidModelOutputError):
        TransactionParser(llm_client).parse("午饭20", CURRENT_TIME)

    assert llm_client.complete.call_count == 2


def test_missing_amount_is_preserved_for_later_confirmation() -> None:
    llm_client = Mock()
    llm_client.complete.return_value = model_output(amount=None)

    result = TransactionParser(llm_client).parse("中午吃了饭", CURRENT_TIME)

    assert result.amount is None


def test_unknown_category_is_rejected() -> None:
    llm_client = Mock()
    llm_client.complete.return_value = model_output(
        amount=20,
        category="自创分类",
    )

    with pytest.raises(InvalidModelOutputError):
        TransactionParser(llm_client).parse("买东西20", CURRENT_TIME)

    assert llm_client.complete.call_count == 2


def test_non_positive_amount_is_rejected() -> None:
    llm_client = Mock()
    llm_client.complete.return_value = model_output(amount=0)

    with pytest.raises(InvalidModelOutputError):
        TransactionParser(llm_client).parse("午饭0元", CURRENT_TIME)

    assert llm_client.complete.call_count == 2


def test_occurred_at_without_timezone_is_rejected() -> None:
    llm_client = Mock()
    llm_client.complete.return_value = model_output(
        amount=20,
        occurred_at="2026-07-24T12:30:00",
    )

    with pytest.raises(InvalidModelOutputError):
        TransactionParser(llm_client).parse("午饭20", CURRENT_TIME)

    assert llm_client.complete.call_count == 2


def test_empty_text_is_rejected_before_model_call() -> None:
    llm_client = Mock()

    with pytest.raises(InvalidParserInputError):
        TransactionParser(llm_client).parse("  ", CURRENT_TIME)

    llm_client.complete.assert_not_called()


def test_invalid_timezone_is_rejected_before_model_call() -> None:
    llm_client = Mock()

    with pytest.raises(InvalidParserInputError):
        TransactionParser(llm_client).parse(
            "午饭20",
            CURRENT_TIME,
            "Invalid/Timezone",
        )

    llm_client.complete.assert_not_called()

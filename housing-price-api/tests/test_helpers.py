"""
Unit tests for app/utils/helpers.py

Requirements: 5.1
"""

from datetime import datetime, timezone

import pytest

from app.utils.helpers import build_error_response, generate_request_id, utc_now


class TestGenerateRequestId:
    def test_returns_string(self):
        result = generate_request_id()
        assert isinstance(result, str)

    def test_starts_with_req_prefix(self):
        result = generate_request_id()
        assert result.startswith("req_")

    def test_suffix_is_8_hex_chars(self):
        result = generate_request_id()
        suffix = result[len("req_"):]
        assert len(suffix) == 8
        # All characters must be valid hex digits
        assert all(c in "0123456789abcdef" for c in suffix)

    def test_unique_across_calls(self):
        ids = {generate_request_id() for _ in range(100)}
        # All 100 generated IDs should be distinct
        assert len(ids) == 100


class TestUtcNow:
    def test_returns_datetime(self):
        result = utc_now()
        assert isinstance(result, datetime)

    def test_is_timezone_aware(self):
        result = utc_now()
        assert result.tzinfo is not None

    def test_is_utc(self):
        result = utc_now()
        assert result.tzinfo == timezone.utc

    def test_is_recent(self):
        before = datetime.now(timezone.utc)
        result = utc_now()
        after = datetime.now(timezone.utc)
        assert before <= result <= after


class TestBuildErrorResponse:
    def test_returns_dict(self):
        result = build_error_response("SOME_CODE", "Some message")
        assert isinstance(result, dict)

    def test_top_level_error_key(self):
        result = build_error_response("SOME_CODE", "Some message")
        assert "error" in result

    def test_error_contains_code(self):
        result = build_error_response("VALIDATION_ERROR", "Bad input")
        assert result["error"]["code"] == "VALIDATION_ERROR"

    def test_error_contains_message(self):
        result = build_error_response("VALIDATION_ERROR", "Bad input")
        assert result["error"]["message"] == "Bad input"

    def test_error_contains_details_empty_by_default(self):
        result = build_error_response("SOME_CODE", "msg")
        assert result["error"]["details"] == []

    def test_error_contains_details_when_provided(self):
        details = [{"field": "area", "message": "must be > 0"}]
        result = build_error_response("VALIDATION_ERROR", "Bad input", details=details)
        assert result["error"]["details"] == details

    def test_error_contains_timestamp(self):
        result = build_error_response("SOME_CODE", "msg")
        assert "timestamp" in result["error"]
        # Should be a non-empty ISO 8601 string
        ts = result["error"]["timestamp"]
        assert isinstance(ts, str) and len(ts) > 0

    def test_error_contains_request_id(self):
        result = build_error_response("SOME_CODE", "msg")
        assert "request_id" in result["error"]
        assert result["error"]["request_id"].startswith("req_")

    def test_all_required_keys_present(self):
        result = build_error_response("SOME_CODE", "msg")
        required_keys = {"code", "message", "details", "timestamp", "request_id"}
        assert required_keys.issubset(result["error"].keys())

    def test_none_details_defaults_to_empty_list(self):
        result = build_error_response("SOME_CODE", "msg", details=None)
        assert result["error"]["details"] == []

"""
Utility helper functions for the Housing Price Prediction API.
"""

import uuid
from datetime import datetime, timezone


def generate_request_id() -> str:
    """Generate a short unique request identifier."""
    return f"req_{uuid.uuid4().hex[:8]}"


def utc_now() -> datetime:
    """Return the current UTC datetime (timezone-aware)."""
    return datetime.now(timezone.utc)


def build_error_response(code: str, message: str, details: list = None) -> dict:
    """
    Build a standard error envelope dict.

    Returns:
        {
            "error": {
                "code": ...,
                "message": ...,
                "details": [...],
                "timestamp": <ISO 8601 UTC string>,
                "request_id": <req_xxxxxxxx>,
            }
        }
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "timestamp": utc_now().isoformat(),
            "request_id": generate_request_id(),
        }
    }

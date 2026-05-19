"""
HTTP client for communicating with the housing-price-api ML service.

Handles single and batch predictions with timeout and error handling.

Requirements: 11.1, 11.3, 11.5
"""
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8000")
ML_SERVICE_TIMEOUT = float(os.getenv("ML_SERVICE_TIMEOUT_SECONDS", "5"))


async def get_ml_client() -> httpx.AsyncClient:
    """Create an async HTTP client configured for the ML service."""
    return httpx.AsyncClient(
        base_url=ML_SERVICE_URL,
        timeout=httpx.Timeout(ML_SERVICE_TIMEOUT),
    )


async def predict_single(features: dict[str, Any]) -> dict[str, Any]:
    """Call the ML service /predict endpoint for a single prediction.

    Args:
        features: Dictionary of house features matching HouseFeatures schema.

    Returns:
        Dictionary with predicted_price, currency, input_features,
        model_version, and timestamp from the ML service.

    Raises:
        httpx.ConnectError: If the ML service is unreachable.
        httpx.TimeoutException: If the ML service does not respond within timeout.
        MLServiceError: If the ML service returns a non-2xx response.
    """
    async with httpx.AsyncClient(
        base_url=ML_SERVICE_URL,
        timeout=httpx.Timeout(ML_SERVICE_TIMEOUT),
    ) as client:
        logger.info("Calling ML service /predict with features: %s", features)
        response = await client.post("/predict", json=features)

        if response.status_code == 200:
            return response.json()

        # ML service returned an error - parse and raise
        logger.error(
            "ML service returned error status %d: %s",
            response.status_code,
            response.text,
        )
        raise MLServiceError(
            status_code=response.status_code,
            response_body=_parse_error_response(response),
        )


async def predict_batch(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Call the ML service /predict/batch endpoint for batch predictions.

    Args:
        records: List of house feature dictionaries.

    Returns:
        Dictionary with predictions, total_records, successful_predictions,
        model_version, and timestamp from the ML service.

    Raises:
        httpx.ConnectError: If the ML service is unreachable.
        httpx.TimeoutException: If the ML service does not respond within timeout.
        MLServiceError: If the ML service returns a non-2xx response.
    """
    async with httpx.AsyncClient(
        base_url=ML_SERVICE_URL,
        timeout=httpx.Timeout(ML_SERVICE_TIMEOUT),
    ) as client:
        logger.info("Calling ML service /predict/batch with %d records", len(records))
        response = await client.post("/predict/batch", json={"records": records})

        if response.status_code == 200:
            return response.json()

        logger.error(
            "ML service batch returned error status %d: %s",
            response.status_code,
            response.text,
        )
        raise MLServiceError(
            status_code=response.status_code,
            response_body=_parse_error_response(response),
        )


class MLServiceError(Exception):
    """Raised when the ML service returns a non-2xx response."""

    def __init__(self, status_code: int, response_body: dict[str, Any]) -> None:
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(f"ML service error: HTTP {status_code}")


def _parse_error_response(response: httpx.Response) -> dict[str, Any]:
    """Attempt to parse the ML service error response as JSON."""
    try:
        return response.json()
    except Exception:
        return {
            "error": {
                "code": "ML_SERVICE_ERROR",
                "message": response.text or "Unknown ML service error",
            }
        }

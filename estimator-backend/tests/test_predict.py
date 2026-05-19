"""
Tests for the single prediction endpoint POST /api/v1/estimator/predict.

Validates:
- Successful prediction with valid input
- HTTP 503 when ML service is unreachable
- HTTP 504 when ML service times out
- ML service error propagation
- Pydantic validation errors (HTTP 422)

Requirements: 9.1, 9.4, 9.6, 11.1, 11.3, 11.5
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from main import app

PREDICT_URL = "/api/v1/estimator/predict"

VALID_FEATURES = {
    "square_footage": 2000.0,
    "bedrooms": 3,
    "bathrooms": 2.0,
    "year_built": 2005,
    "lot_size": 8000.0,
    "distance_to_city_center": 5.0,
    "school_rating": 7.5,
}

ML_SUCCESS_RESPONSE = {
    "predicted_price": 350000.0,
    "currency": "USD",
    "input_features": VALID_FEATURES,
    "model_version": "1.0.0",
    "timestamp": datetime.now(timezone.utc).isoformat(),
}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestSinglePrediction:
    """Tests for POST /api/v1/estimator/predict."""

    @patch("app.routers.predict.predict_single", new_callable=AsyncMock)
    async def test_successful_prediction(self, mock_predict, client):
        """Valid input returns EstimationResponse with all required fields."""
        mock_predict.return_value = ML_SUCCESS_RESPONSE

        response = await client.post(PREDICT_URL, json=VALID_FEATURES)

        assert response.status_code == 200
        data = response.json()
        assert "estimate_id" in data
        assert data["predicted_price"] == 350000.0
        assert data["currency"] == "USD"
        assert data["input_features"] == VALID_FEATURES
        assert data["model_version"] == "1.0.0"
        assert "timestamp" in data
        assert "feature_importance" in data
        assert isinstance(data["feature_importance"], list)
        assert len(data["feature_importance"]) > 0

    @patch("app.routers.predict.predict_single", new_callable=AsyncMock)
    async def test_ml_service_unavailable_returns_503(self, mock_predict, client):
        """Returns HTTP 503 with ML_SERVICE_UNAVAILABLE when ML service is unreachable."""
        mock_predict.side_effect = httpx.ConnectError("Connection refused")

        response = await client.post(PREDICT_URL, json=VALID_FEATURES)

        assert response.status_code == 503
        data = response.json()
        assert data["error"]["code"] == "ML_SERVICE_UNAVAILABLE"
        assert "timestamp" in data["error"]

    @patch("app.routers.predict.predict_single", new_callable=AsyncMock)
    async def test_ml_service_timeout_returns_504(self, mock_predict, client):
        """Returns HTTP 504 with ML_SERVICE_TIMEOUT when ML service times out."""
        mock_predict.side_effect = httpx.TimeoutException("Request timed out")

        response = await client.post(PREDICT_URL, json=VALID_FEATURES)

        assert response.status_code == 504
        data = response.json()
        assert data["error"]["code"] == "ML_SERVICE_TIMEOUT"
        assert "timestamp" in data["error"]

    @patch("app.routers.predict.predict_single", new_callable=AsyncMock)
    async def test_ml_service_error_propagation(self, mock_predict, client):
        """Propagates structured error from ML service with code, message, timestamp."""
        from app.services.ml_client import MLServiceError

        mock_predict.side_effect = MLServiceError(
            status_code=500,
            response_body={
                "error": {
                    "code": "PREDICTION_ERROR",
                    "message": "Model inference failed",
                }
            },
        )

        response = await client.post(PREDICT_URL, json=VALID_FEATURES)

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "PREDICTION_ERROR"
        assert data["error"]["message"] == "Model inference failed"
        assert "timestamp" in data["error"]

    async def test_validation_error_missing_field(self, client):
        """Returns HTTP 422 when required field is missing."""
        incomplete_features = {
            "square_footage": 2000.0,
            "bedrooms": 3,
            # missing bathrooms and other fields
        }

        response = await client.post(PREDICT_URL, json=incomplete_features)

        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]

    async def test_validation_error_invalid_value(self, client):
        """Returns HTTP 422 when field value is out of range."""
        invalid_features = {
            **VALID_FEATURES,
            "bedrooms": 0,  # must be >= 1
        }

        response = await client.post(PREDICT_URL, json=invalid_features)

        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"

    @patch("app.routers.predict.predict_single", new_callable=AsyncMock)
    async def test_response_has_uuid_estimate_id(self, mock_predict, client):
        """estimate_id is a valid UUID string."""
        import uuid

        mock_predict.return_value = ML_SUCCESS_RESPONSE

        response = await client.post(PREDICT_URL, json=VALID_FEATURES)

        assert response.status_code == 200
        data = response.json()
        # Should not raise ValueError
        uuid.UUID(data["estimate_id"])

    @patch("app.routers.predict.predict_single", new_callable=AsyncMock)
    async def test_feature_importance_in_response(self, mock_predict, client):
        """Response includes feature_importance list with feature names and scores."""
        mock_predict.return_value = {
            **ML_SUCCESS_RESPONSE,
            "feature_importance": [
                {"feature": "square_footage", "importance": 30.0},
                {"feature": "lot_size", "importance": 20.0},
                {"feature": "year_built", "importance": 15.0},
                {"feature": "school_rating", "importance": 13.0},
                {"feature": "bathrooms", "importance": 10.0},
                {"feature": "bedrooms", "importance": 7.0},
                {"feature": "distance_to_city_center", "importance": 5.0},
            ],
        }

        response = await client.post(PREDICT_URL, json=VALID_FEATURES)

        assert response.status_code == 200
        data = response.json()
        importance = data["feature_importance"]
        assert len(importance) == 7
        assert importance[0]["feature"] == "square_footage"
        assert importance[0]["importance"] == 30.0

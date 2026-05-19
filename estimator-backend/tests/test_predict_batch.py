"""
Tests for the batch prediction endpoint POST /api/v1/estimator/predict/batch.

Validates:
- Successful batch prediction with valid records
- Entire batch rejected (HTTP 422) if any record fails validation
- Zero-based index in error details for invalid records
- HTTP 503 when ML service is unreachable
- HTTP 504 when ML service times out
- ML service error propagation
- Batch size constraints (1-100 records)

Requirements: 9.2, 9.7, 11.1
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from main import app

BATCH_PREDICT_URL = "/api/v1/estimator/predict/batch"

VALID_RECORD = {
    "square_footage": 2000.0,
    "bedrooms": 3,
    "bathrooms": 2.0,
    "year_built": 2005,
    "lot_size": 8000.0,
    "distance_to_city_center": 5.0,
    "school_rating": 7.5,
}

VALID_RECORD_2 = {
    "square_footage": 1500.0,
    "bedrooms": 2,
    "bathrooms": 1.5,
    "year_built": 1990,
    "lot_size": 6000.0,
    "distance_to_city_center": 10.0,
    "school_rating": 6.0,
}

ML_BATCH_SUCCESS_RESPONSE = {
    "predictions": [
        {
            "predicted_price": 350000.0,
            "currency": "USD",
            "model_version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        {
            "predicted_price": 280000.0,
            "currency": "USD",
            "model_version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    ],
    "total_records": 2,
    "successful_predictions": 2,
    "model_version": "1.0.0",
}


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestBatchPrediction:
    """Tests for POST /api/v1/estimator/predict/batch."""

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_successful_batch_prediction(self, mock_predict_batch, client):
        """Valid batch returns BatchEstimationResponse with all required fields."""
        mock_predict_batch.return_value = ML_BATCH_SUCCESS_RESPONSE

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD, VALID_RECORD_2]}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 2
        assert data["successful_predictions"] == 2
        assert len(data["results"]) == 2

        # Verify each result has required fields
        for result in data["results"]:
            assert "estimate_id" in result
            assert "predicted_price" in result
            assert "currency" in result
            assert "input_features" in result
            assert "model_version" in result
            assert "timestamp" in result
            assert "feature_importance" in result

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_single_record_batch(self, mock_predict_batch, client):
        """Batch with a single record is accepted (min_length=1)."""
        mock_predict_batch.return_value = {
            "predictions": [
                {
                    "predicted_price": 350000.0,
                    "currency": "USD",
                    "model_version": "1.0.0",
                }
            ],
            "total_records": 1,
            "successful_predictions": 1,
            "model_version": "1.0.0",
        }

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD]}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_records"] == 1
        assert data["successful_predictions"] == 1

    async def test_empty_batch_rejected(self, client):
        """Empty batch (0 records) is rejected."""
        response = await client.post(BATCH_PREDICT_URL, json={"records": []})

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "EMPTY_BATCH"

    async def test_batch_exceeds_max_size_rejected(self, client):
        """Batch with more than 100 records is rejected."""
        records = [VALID_RECORD] * 101

        response = await client.post(BATCH_PREDICT_URL, json={"records": records})

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "BATCH_SIZE_EXCEEDED"

    async def test_invalid_record_rejects_entire_batch(self, client):
        """If any record fails validation, entire batch is rejected with HTTP 422."""
        invalid_record = {
            **VALID_RECORD,
            "bedrooms": 0,  # must be >= 1
        }

        response = await client.post(
            BATCH_PREDICT_URL,
            json={"records": [VALID_RECORD, invalid_record]},
        )

        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]

    async def test_invalid_record_error_includes_zero_based_index(self, client):
        """Error details include zero-based index for invalid records."""
        invalid_record = {
            **VALID_RECORD,
            "square_footage": -1,  # must be > 0
        }

        response = await client.post(
            BATCH_PREDICT_URL,
            json={"records": [VALID_RECORD, invalid_record]},
        )

        assert response.status_code == 422
        data = response.json()
        details = data["error"]["details"]
        # Should reference index 1 (zero-based) for the second record
        index_found = False
        for detail in details:
            field = detail["field"]
            if "1" in field:  # records.1.square_footage
                index_found = True
                break
        assert index_found, f"Expected zero-based index in error details, got: {details}"

    async def test_multiple_invalid_records_all_reported(self, client):
        """Multiple invalid records are all reported with their indices."""
        invalid_record_0 = {
            **VALID_RECORD,
            "bedrooms": 0,  # invalid at index 0
        }
        invalid_record_2 = {
            **VALID_RECORD,
            "school_rating": 15.0,  # invalid at index 2
        }

        response = await client.post(
            BATCH_PREDICT_URL,
            json={"records": [invalid_record_0, VALID_RECORD, invalid_record_2]},
        )

        assert response.status_code == 422
        data = response.json()
        details = data["error"]["details"]
        # Should have errors for index 0 and index 2
        fields = [d["field"] for d in details]
        has_index_0 = any("0" in f for f in fields)
        has_index_2 = any("2" in f for f in fields)
        assert has_index_0, f"Expected index 0 in error details, got: {fields}"
        assert has_index_2, f"Expected index 2 in error details, got: {fields}"

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_ml_service_unavailable_returns_503(self, mock_predict_batch, client):
        """Returns HTTP 503 when ML service is unreachable."""
        mock_predict_batch.side_effect = httpx.ConnectError("Connection refused")

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD]}
        )

        assert response.status_code == 503
        data = response.json()
        assert data["error"]["code"] == "ML_SERVICE_UNAVAILABLE"
        assert "timestamp" in data["error"]

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_ml_service_timeout_returns_504(self, mock_predict_batch, client):
        """Returns HTTP 504 when ML service times out."""
        mock_predict_batch.side_effect = httpx.TimeoutException("Request timed out")

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD]}
        )

        assert response.status_code == 504
        data = response.json()
        assert data["error"]["code"] == "ML_SERVICE_TIMEOUT"
        assert "timestamp" in data["error"]

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_ml_service_error_propagation(self, mock_predict_batch, client):
        """Propagates structured error from ML service."""
        from app.services.ml_client import MLServiceError

        mock_predict_batch.side_effect = MLServiceError(
            status_code=500,
            response_body={
                "error": {
                    "code": "BATCH_PREDICTION_ERROR",
                    "message": "Model inference failed for batch",
                }
            },
        )

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD]}
        )

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "BATCH_PREDICTION_ERROR"
        assert data["error"]["message"] == "Model inference failed for batch"
        assert "timestamp" in data["error"]

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_batch_response_preserves_input_features(self, mock_predict_batch, client):
        """Each result echoes back the input features for that record."""
        mock_predict_batch.return_value = ML_BATCH_SUCCESS_RESPONSE

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD, VALID_RECORD_2]}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["results"][0]["input_features"] == VALID_RECORD
        assert data["results"][1]["input_features"] == VALID_RECORD_2

    @patch("app.routers.predict.predict_batch", new_callable=AsyncMock)
    async def test_batch_response_has_unique_estimate_ids(self, mock_predict_batch, client):
        """Each result in the batch has a unique estimate_id."""
        import uuid

        mock_predict_batch.return_value = ML_BATCH_SUCCESS_RESPONSE

        response = await client.post(
            BATCH_PREDICT_URL, json={"records": [VALID_RECORD, VALID_RECORD_2]}
        )

        assert response.status_code == 200
        data = response.json()
        ids = [r["estimate_id"] for r in data["results"]]
        # All IDs should be valid UUIDs
        for id_str in ids:
            uuid.UUID(id_str)
        # All IDs should be unique
        assert len(set(ids)) == len(ids)

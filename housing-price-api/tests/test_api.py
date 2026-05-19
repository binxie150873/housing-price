"""
Integration tests for the Housing Price Prediction API.

Tests all four API endpoints covering success cases and error cases.

Requirements: 9.2, 9.3
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app, predictor


@pytest.fixture()
def client():
    """Create a TestClient with the lifespan triggered (model loaded)."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Valid input example
# ---------------------------------------------------------------------------

VALID_INPUT = {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2.0,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}


# ---------------------------------------------------------------------------
# POST /predict — success and validation errors
# ---------------------------------------------------------------------------


class TestPredictSingle:
    """Tests for POST /predict endpoint."""

    def test_valid_input_returns_200(self, client):
        """Valid HouseFeatures input returns HTTP 200 with correct schema."""
        response = client.post("/predict", json=VALID_INPUT)
        assert response.status_code == 200
        data = response.json()

        print("\n--- 响应数据 ---")
        print(f"预测价格: ${data.get('predicted_price'):,.2f}" if data.get('predicted_price') else f"预测价格: {data.get('predicted_price')}")
        print(f"货币单位: {data.get('currency')}")
        print(f"输入特征: {data.get('input_features')}")
        print(f"模型版本: {data.get('model_version')}")
        print(f"时间戳: {data.get('timestamp')}")
        print("="*50 + "\n")

        assert "predicted_price" in data
        assert isinstance(data["predicted_price"], (int, float))
        assert data["currency"] == "USD"
        assert "input_features" in data
        assert "model_version" in data
        assert "timestamp" in data

    def test_area_zero_returns_422(self, client):
        """square_footage=0 violates gt=0 constraint → HTTP 422."""
        payload = {**VALID_INPUT, "square_footage": 0}
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_invalid_field_returns_422(self, client):
        """Invalid year_built value → HTTP 422."""
        payload = {**VALID_INPUT, "year_built": 1700}
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_missing_required_field_returns_422(self, client):
        """Missing required field → HTTP 422."""
        payload = {k: v for k, v in VALID_INPUT.items() if k != "square_footage"}
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# POST /predict/batch — success and error cases
# ---------------------------------------------------------------------------


class TestPredictBatch:
    """Tests for POST /predict/batch endpoint."""

    def test_single_valid_record_returns_200(self, client):
        """Batch with 1 valid record → HTTP 200."""
        response = client.post("/predict/batch", json={"records": [VALID_INPUT]})
        assert response.status_code == 200
        data = response.json()
        assert len(data["predictions"]) == 1
        assert data["total_records"] == 1
        assert data["successful_predictions"] == 1

    def test_100_valid_records_returns_200(self, client):
        """Batch with 100 valid records → HTTP 200, len(predictions) == 100."""
        records = [VALID_INPUT] * 100
        response = client.post("/predict/batch", json={"records": records})
        assert response.status_code == 200
        data = response.json()
        assert len(data["predictions"]) == 100
        assert data["total_records"] == 100
        assert data["successful_predictions"] == 100

    def test_101_records_returns_400_batch_size_exceeded(self, client):
        """Batch with 101 records → HTTP 400, code BATCH_SIZE_EXCEEDED."""
        records = [VALID_INPUT] * 101
        response = client.post("/predict/batch", json={"records": records})
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "BATCH_SIZE_EXCEEDED"

    def test_empty_records_returns_400(self, client):
        """Empty records array → HTTP 400."""
        response = client.post("/predict/batch", json={"records": []})
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "EMPTY_BATCH"

    def test_one_invalid_record_returns_422(self, client):
        """Batch with one invalid record → HTTP 422."""
        invalid_record = {**VALID_INPUT, "square_footage": -5}
        response = client.post("/predict/batch", json={"records": [invalid_record]})
        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# GET /model-info
# ---------------------------------------------------------------------------


class TestModelInfo:
    """Tests for GET /model-info endpoint."""

    def test_model_info_returns_200_with_all_fields(self, client):
        """GET /model-info → HTTP 200, all required fields present, r2_score >= 0.80."""
        response = client.get("/model-info")
        assert response.status_code == 200
        data = response.json()
        # Required top-level fields
        assert "model_name" in data
        assert "model_version" in data
        assert "model_type" in data
        assert "training_date" in data
        assert "dataset_info" in data
        assert "performance_metrics" in data
        assert "feature_importance" in data
        assert "model_parameters" in data
        # Performance check
        assert data["performance_metrics"]["r2_score"] >= 0.80


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


class TestHealth:
    """Tests for GET /health endpoint."""

    def test_health_returns_200_healthy(self, client):
        """GET /health → HTTP 200, status == 'healthy', model_loaded == true."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["model_loaded"] is True


# ---------------------------------------------------------------------------
# GET /docs and /openapi.json
# ---------------------------------------------------------------------------


class TestDocs:
    """Tests for documentation endpoints."""

    def test_docs_returns_200(self, client):
        """GET /docs → HTTP 200."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_json_returns_200(self, client):
        """GET /openapi.json → HTTP 200, JSON with 'openapi' field."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data


# ---------------------------------------------------------------------------
# Model-not-loaded scenario
# ---------------------------------------------------------------------------


class TestModelNotLoaded:
    """Tests for model-not-loaded scenario (503 responses)."""

    def test_predict_returns_503_when_model_not_loaded(self, client):
        """POST /predict → 503 when model is not loaded."""
        original_state = predictor.is_loaded
        try:
            predictor.is_loaded = False
            response = client.post("/predict", json=VALID_INPUT)
            assert response.status_code == 503
            data = response.json()
            assert data["error"]["code"] == "MODEL_NOT_LOADED"
        finally:
            predictor.is_loaded = original_state

    def test_model_info_returns_503_when_model_not_loaded(self, client):
        """GET /model-info → 503 when model is not loaded."""
        original_state = predictor.is_loaded
        try:
            predictor.is_loaded = False
            response = client.get("/model-info")
            assert response.status_code == 503
            data = response.json()
            assert data["error"]["code"] == "MODEL_NOT_LOADED"
        finally:
            predictor.is_loaded = original_state

    def test_health_returns_503_when_model_not_loaded(self, client):
        """GET /health → 503 when model is not loaded."""
        original_state = predictor.is_loaded
        try:
            predictor.is_loaded = False
            response = client.get("/health")
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["model_loaded"] is False
        finally:
            predictor.is_loaded = original_state

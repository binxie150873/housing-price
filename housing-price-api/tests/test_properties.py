"""
Property-based tests for the Housing Price Prediction API.

Uses Hypothesis to verify universal correctness properties across all valid inputs.

Feature: housing-price-api
"""

import math

import numpy as np
import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st
from pydantic import ValidationError

from app.models.schemas import BatchRequest, HouseFeatures
from app.models.predictor import Predictor

# ---------------------------------------------------------------------------
# Shared strategies
# ---------------------------------------------------------------------------


def valid_house_features_strategy():
    """Hypothesis strategy that generates valid HouseFeatures instances."""
    return st.builds(
        HouseFeatures,
        square_footage=st.floats(min_value=1.0, max_value=100_000.0, allow_nan=False, allow_infinity=False),
        bedrooms=st.integers(min_value=1, max_value=10),
        bathrooms=st.floats(min_value=0.5, max_value=10.0, allow_nan=False, allow_infinity=False),
        year_built=st.integers(min_value=1800, max_value=2030),
        lot_size=st.floats(min_value=1.0, max_value=1_000_000.0, allow_nan=False, allow_infinity=False),
        distance_to_city_center=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
        school_rating=st.floats(min_value=0.0, max_value=10.0, allow_nan=False, allow_infinity=False),
    )


# Base valid feature dict used as a template for invalid-field tests
_VALID_FEATURES_DICT = {
    "square_footage": 1550.0,
    "bedrooms": 3,
    "bathrooms": 2.0,
    "year_built": 1997,
    "lot_size": 6800.0,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}


# ---------------------------------------------------------------------------
# Property 4: Invalid field values are always rejected
# Feature: housing-price-api, Property 4: Invalid field values are always rejected
# ---------------------------------------------------------------------------


@settings(max_examples=100)
@given(invalid_sqft=st.floats(max_value=0.0, allow_nan=False, allow_infinity=False))
def test_property_4_invalid_square_footage_rejected(invalid_sqft: float):
    """
    **Property 4: Invalid square_footage values are always rejected**
    **Validates: Input validation**

    For any HouseFeatures-like dict where square_footage is <= 0,
    Pydantic validation SHALL raise a ValidationError.
    """
    # Feature: housing-price-api, Property 4: Invalid field values are always rejected
    features_dict = {**_VALID_FEATURES_DICT, "square_footage": invalid_sqft}
    with pytest.raises(ValidationError):
        HouseFeatures(**features_dict)


@settings(max_examples=100)
@given(invalid_year=st.integers(max_value=1799))
def test_property_4_invalid_year_built_rejected(invalid_year: int):
    """
    **Property 4: Invalid year_built values are always rejected**
    **Validates: Input validation**

    For any HouseFeatures-like dict where year_built < 1800,
    Pydantic validation SHALL raise a ValidationError.
    """
    # Feature: housing-price-api, Property 4: Invalid field values are always rejected
    features_dict = {**_VALID_FEATURES_DICT, "year_built": invalid_year}
    with pytest.raises(ValidationError):
        HouseFeatures(**features_dict)


# ---------------------------------------------------------------------------
# Property 5: Batch size boundary enforcement
# Feature: housing-price-api, Property 5: Batch size boundary enforcement
# ---------------------------------------------------------------------------

@settings(max_examples=100)
@given(size=st.integers(min_value=101, max_value=500))
def test_property_5_oversized_batch_rejected(size: int):
    """
    **Property 5: Batch size boundary enforcement (oversized)**
    **Validates: Requirements 2.2, 2.3**

    For any list of HouseFeatures records with length > 100, the BatchRequest
    Pydantic model SHALL raise a ValidationError.
    """
    # Feature: housing-price-api, Property 5: Batch size boundary enforcement
    record = HouseFeatures(**_VALID_FEATURES_DICT)
    records = [record] * size
    with pytest.raises(ValidationError):
        BatchRequest(records=records)


@settings(max_examples=100)
@given(size=st.integers(min_value=1, max_value=100))
def test_property_5_valid_batch_size_accepted(size: int):
    """
    **Property 5: Batch size boundary enforcement (valid range)**
    **Validates: Requirements 2.2, 2.3**

    For any list of HouseFeatures records with length 1–100, the BatchRequest
    Pydantic model SHALL succeed without raising a ValidationError.
    """
    # Feature: housing-price-api, Property 5: Batch size boundary enforcement
    record = HouseFeatures(**_VALID_FEATURES_DICT)
    records = [record] * size
    batch = BatchRequest(records=records)
    assert len(batch.records) == size


def test_property_5_empty_batch_rejected():
    """
    **Property 5: Batch size boundary enforcement (empty)**
    **Validates: Requirements 2.3**

    An empty records list SHALL raise a ValidationError.
    """
    # Feature: housing-price-api, Property 5: Batch size boundary enforcement
    with pytest.raises(ValidationError):
        BatchRequest(records=[])


# ---------------------------------------------------------------------------
# Property 1: Valid input always produces a positive predicted price
# Feature: housing-price-api, Property 1: Valid input always produces a positive predicted price
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def loaded_predictor():
    """Load the real model once for property tests that need predictions."""
    predictor = Predictor()
    predictor.load_model()
    if not predictor.is_loaded:
        pytest.skip("Model not available on disk — run scripts/train_model.py first")
    return predictor


@settings(max_examples=100)
@given(features=valid_house_features_strategy())
def test_property_1_valid_input_produces_positive_price(features, loaded_predictor):
    """
    **Property 1: Valid input always produces a positive predicted price**
    **Validates: Requirements 1.1, 7.5**

    For any HouseFeatures instance that passes Pydantic validation, the Predictor
    SHALL return a predicted price that is a finite positive float.
    """
    # Feature: housing-price-api, Property 1: Valid input always produces a positive predicted price
    price = loaded_predictor.predict(features.model_dump())

    assert isinstance(price, float), f"Expected float, got {type(price)}"
    assert math.isfinite(price), f"Expected finite price, got {price}"
    assert price > 0, f"Expected positive price, got {price}"


# ---------------------------------------------------------------------------
# Property 8: Preprocessor output shape invariant
# Feature: housing-price-api, Property 8: Preprocessor output shape invariant
# ---------------------------------------------------------------------------


@settings(max_examples=100)
@given(features=valid_house_features_strategy())
def test_property_8_preprocessor_output_shape_invariant(features, loaded_predictor):
    """
    **Property 8: Preprocessor output shape invariant**
    **Validates: Requirements 7.2, 7.5**

    For any valid HouseFeatures dict, applying the pipeline's preprocessor step
    SHALL produce a 2D numpy array with exactly 1 row and 7 columns (all numerical features).
    """
    # Feature: housing-price-api, Property 8: Preprocessor output shape invariant
    import pandas as pd
    from app.models.predictor import FEATURE_ORDER

    df = pd.DataFrame([features.model_dump()], columns=FEATURE_ORDER)
    preprocessor = loaded_predictor._pipeline.named_steps["preprocessor"]
    transformed = preprocessor.transform(df)

    # Must be 2D with exactly 1 row
    assert transformed.ndim == 2, f"Expected 2D array, got {transformed.ndim}D"
    assert transformed.shape[0] == 1, f"Expected 1 row, got {transformed.shape[0]}"
    # 7 numerical features after StandardScaler
    assert transformed.shape[1] == 7, f"Expected 7 columns, got {transformed.shape[1]}"


# ---------------------------------------------------------------------------
# Property 2: Batch prediction output length matches input length
# Feature: housing-price-api, Property 2: Batch prediction output length matches input length
# ---------------------------------------------------------------------------

from app.services.prediction import PredictionService


@pytest.fixture(scope="module")
def prediction_service():
    """Create a PredictionService backed by the real trained model."""
    predictor = Predictor()
    predictor.load_model()
    if not predictor.is_loaded:
        pytest.skip("Model not loaded — cannot run PredictionService property tests")
    return PredictionService(predictor)


@settings(max_examples=100)
@given(records=st.lists(valid_house_features_strategy(), min_size=1, max_size=100))
def test_property_2_batch_output_length_matches_input(records, prediction_service):
    """
    **Property 2: Batch prediction output length matches input length**
    **Validates: Requirements 2.1, 2.5**

    For any list of 1–100 valid HouseFeatures records submitted to the
    PredictionService, the length of the returned predictions array SHALL
    equal the number of input records, and total_records SHALL equal
    successful_predictions.
    """
    # Feature: housing-price-api, Property 2: Batch prediction output length matches input length
    batch_request = BatchRequest(records=records)
    response = prediction_service.predict_batch(batch_request)

    assert len(response.predictions) == len(records)
    assert response.total_records == len(records)
    assert response.successful_predictions == len(records)
    assert response.total_records == response.successful_predictions


# ---------------------------------------------------------------------------
# Property 3: Single prediction and batch prediction are consistent
# Feature: housing-price-api, Property 3: Single prediction and batch prediction are consistent
# ---------------------------------------------------------------------------


@settings(max_examples=100)
@given(features=valid_house_features_strategy())
def test_property_3_single_and_batch_consistent(features, prediction_service):
    """
    **Property 3: Single prediction and batch prediction are consistent**
    **Validates: Requirements 1.1, 2.1**

    For any valid HouseFeatures record, predicting it individually via
    predict_single SHALL return the same predicted_price as predicting it
    as a single-element batch via predict_batch.
    """
    # Feature: housing-price-api, Property 3: Single prediction and batch prediction are consistent
    single_response = prediction_service.predict_single(features)
    batch_request = BatchRequest(records=[features])
    batch_response = prediction_service.predict_batch(batch_request)

    assert len(batch_response.predictions) == 1
    assert single_response.predicted_price == batch_response.predictions[0].predicted_price


# ---------------------------------------------------------------------------
# Property 6: Error responses always contain required fields
# Feature: housing-price-api, Property 6: Error responses always contain required fields
# ---------------------------------------------------------------------------

from fastapi.testclient import TestClient
from main import app, predictor


@pytest.fixture(scope="module")
def api_client():
    """TestClient for property-based integration tests (with lifespan)."""
    with TestClient(app) as c:
        yield c


# Strategy for invalid square_footage values (zero or negative)
invalid_sqft_strategy = st.floats(
    max_value=0.0, allow_nan=False, allow_infinity=False
)

# Strategy for oversized batch sizes
oversized_batch_strategy = st.integers(min_value=101, max_value=200)

STACK_TRACE_KEYWORDS = ("Traceback", "File ", "line ")

_VALID_INPUT = {
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2.0,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6,
}


def _assert_error_response_structure(data: dict) -> None:
    """Assert that an error response contains all required fields."""
    assert "error" in data, f"Response missing 'error' key: {data}"
    error = data["error"]
    assert "code" in error and error["code"], f"Missing or empty 'code': {error}"
    assert "message" in error and error["message"], f"Missing or empty 'message': {error}"
    assert "timestamp" in error and error["timestamp"], f"Missing or empty 'timestamp': {error}"
    assert "request_id" in error and error["request_id"], f"Missing or empty 'request_id': {error}"


def _assert_no_stack_trace(data: dict) -> None:
    """Assert that the response body does not contain stack trace keywords."""
    body_str = str(data)
    for keyword in STACK_TRACE_KEYWORDS:
        assert keyword not in body_str, (
            f"Response body contains stack trace keyword '{keyword}': {body_str[:200]}"
        )


@settings(max_examples=100)
@given(invalid_sqft=invalid_sqft_strategy)
def test_property_6_error_response_structure_invalid_sqft(invalid_sqft, api_client):
    """
    **Property 6: Error responses always contain required fields (invalid square_footage)**
    **Validates: Requirements 5.1**

    For any request with an invalid square_footage value, the error response SHALL contain
    error.code, error.message, error.timestamp, and error.request_id.
    """
    # Feature: housing-price-api, Property 6: Error responses always contain required fields
    payload = {**_VALID_INPUT, "square_footage": invalid_sqft}
    response = api_client.post("/predict", json=payload)
    assert response.status_code in (400, 422)
    data = response.json()
    _assert_error_response_structure(data)
    _assert_no_stack_trace(data)


@settings(max_examples=100)
@given(batch_size=oversized_batch_strategy)
def test_property_6_error_response_structure_oversized_batch(batch_size, api_client):
    """
    **Property 6: Error responses always contain required fields (oversized batch)**
    **Validates: Requirements 5.1**

    For any batch request exceeding 100 records, the error response SHALL contain
    error.code, error.message, error.timestamp, and error.request_id.
    """
    # Feature: housing-price-api, Property 6: Error responses always contain required fields
    records = [_VALID_INPUT] * batch_size
    response = api_client.post("/predict/batch", json={"records": records})
    assert response.status_code == 400
    data = response.json()
    _assert_error_response_structure(data)
    _assert_no_stack_trace(data)


# ---------------------------------------------------------------------------
# Property 7: Health endpoint reflects model load state
# Feature: housing-price-api, Property 7: Health endpoint reflects model load state
# ---------------------------------------------------------------------------


@settings(max_examples=100)
@given(model_loaded=st.booleans())
def test_property_7_health_reflects_model_load_state(model_loaded, api_client):
    """
    **Property 7: Health endpoint reflects model load state**
    **Validates: Requirements 4.1, 4.2**

    For any application state, the /health endpoint response model_loaded field
    SHALL be true if and only if the Predictor's is_loaded attribute is true,
    and the HTTP status code SHALL be 200 when model_loaded is true and 503 when false.
    """
    # Feature: housing-price-api, Property 7: Health endpoint reflects model load state
    original_state = predictor.is_loaded
    try:
        predictor.is_loaded = model_loaded
        response = api_client.get("/health")
        data = response.json()

        # model_loaded field must match predictor state
        assert data["model_loaded"] == model_loaded, (
            f"Expected model_loaded={model_loaded}, got {data['model_loaded']}"
        )

        # HTTP status must match
        if model_loaded:
            assert response.status_code == 200, (
                f"Expected 200 when model loaded, got {response.status_code}"
            )
        else:
            assert response.status_code == 503, (
                f"Expected 503 when model not loaded, got {response.status_code}"
            )
    finally:
        predictor.is_loaded = original_state

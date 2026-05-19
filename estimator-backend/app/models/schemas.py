"""
Pydantic models for the Estimator Backend API.

Defines request/response schemas for property estimation endpoints,
history filtering, and feature importance data.

Requirements: 9.1, 9.3, 9.4
"""
from datetime import date, datetime

from pydantic import BaseModel, Field


class EstimationRequest(BaseModel):
    """Input features for a single property estimation.

    Matches the housing-price-api HouseFeatures schema with validation
    constraints for each ML model input field.
    """

    square_footage: float = Field(gt=0, le=100000, description="Living area in square feet")
    bedrooms: int = Field(ge=1, le=10, description="Number of bedrooms")
    bathrooms: float = Field(ge=0.5, le=10, description="Number of bathrooms")
    year_built: int = Field(ge=1800, le=2030, description="Year the property was built")
    lot_size: float = Field(gt=0, le=1000000, description="Lot size in square feet")
    distance_to_city_center: float = Field(
        ge=0, le=500, description="Distance to city center in miles"
    )
    school_rating: float = Field(ge=0, le=10, description="Nearby school rating (0-10)")

    model_config = {"json_schema_extra": {"examples": [
        {
            "square_footage": 2000.0,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "year_built": 2005,
            "lot_size": 8000.0,
            "distance_to_city_center": 5.0,
            "school_rating": 7.5,
        }
    ]}}


class FeatureImportanceItem(BaseModel):
    """A single feature's importance contribution to the prediction."""

    feature: str = Field(description="Name of the input feature")
    importance: float = Field(
        ge=0, description="Dollar contribution of this feature to the predicted price"
    )


class EstimationResponse(BaseModel):
    """Response from a single property estimation.

    Contains the predicted price, echoed input features, model metadata,
    and feature importance breakdown.
    """

    model_config = {"protected_namespaces": ()}

    estimate_id: str = Field(description="Unique identifier for this estimation")
    predicted_price: float = Field(description="Predicted property price")
    currency: str = Field(default="USD", description="Currency code for the predicted price")
    input_features: EstimationRequest = Field(description="Echoed input features")
    model_version: str = Field(description="Version of the ML model used")
    timestamp: datetime = Field(description="Timestamp of the prediction")
    feature_importance: list[FeatureImportanceItem] = Field(
        description="Feature importance scores sorted by importance"
    )


class HistoryFilter(BaseModel):
    """Query parameters for filtering and paginating estimation history."""

    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Number of records per page")
    search: str | None = Field(default=None, min_length=2, description="Search term for filtering (minimum 2 characters)")
    date_from: date | None = Field(default=None, description="Filter start date (inclusive)")
    date_to: date | None = Field(default=None, description="Filter end date (inclusive)")
    price_min: float | None = Field(default=None, description="Minimum predicted price filter")
    price_max: float | None = Field(default=None, description="Maximum predicted price filter")


class BatchEstimationRequest(BaseModel):
    """Request for batch property estimation (1-100 records)."""

    records: list[EstimationRequest] = Field(
        min_length=1, max_length=100, description="List of property records to estimate"
    )


class BatchEstimationResponse(BaseModel):
    """Response from a batch property estimation."""

    results: list[EstimationResponse] = Field(description="Prediction results for each record")
    total_records: int = Field(description="Total number of records in the batch")
    successful_predictions: int = Field(description="Number of successful predictions")


class HealthResponse(BaseModel):
    """Health check response for the estimator backend."""

    model_config = {"protected_namespaces": ()}

    status: str = Field(description="Service status: healthy or unhealthy")
    model_loaded: bool = Field(description="Whether the ML model is accessible")
    model_version: str = Field(description="Version of the ML model")
    timestamp: datetime = Field(description="Timestamp of the health check")


class ErrorDetail(BaseModel):
    """A single field-level validation error detail."""

    field: str = Field(description="Name of the invalid field")
    message: str = Field(description="Description of the validation failure")


class ErrorResponse(BaseModel):
    """Structured error response following the unified error format."""

    code: str = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable error message")
    details: list[ErrorDetail] | None = Field(
        default=None, description="Field-level error details"
    )
    timestamp: datetime = Field(description="Timestamp of the error")
    request_id: str | None = Field(default=None, description="Request tracking identifier")


class PaginatedResponse(BaseModel):
    """Generic paginated response envelope."""

    items: list = Field(description="Page of result items")
    total: int = Field(description="Total number of matching records")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of records per page")
    total_pages: int = Field(description="Total number of pages")

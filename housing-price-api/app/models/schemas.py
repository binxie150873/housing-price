"""
Pydantic v2 schemas for the Housing Price Prediction API.

Covers all request/response models for:
  - Single prediction  (Requirements 1.1–1.9)
  - Batch prediction   (Requirements 2.1–2.4)
  - Model info         (Requirement 3.1)
  - Health check       (Requirement 4.1)
  - Error handling     (Requirement 5.1)
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Input schemas
# ---------------------------------------------------------------------------


class HouseFeatures(BaseModel):
    """Input features for a single housing price prediction request."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "square_footage": 1550,
                "bedrooms": 3,
                "bathrooms": 2.0,
                "year_built": 1997,
                "lot_size": 6800,
                "distance_to_city_center": 4.1,
                "school_rating": 7.6,
            }
        }
    )

    square_footage: float = Field(
        ...,
        gt=0,
        description="Total square footage of the property. Must be greater than 0.",
    )
    bedrooms: int = Field(
        ...,
        ge=1,
        le=10,
        description="Number of bedrooms (1–10).",
    )
    bathrooms: float = Field(
        ...,
        gt=0,
        le=10,
        description="Number of bathrooms (0.5–10, supports half baths).",
    )
    year_built: int = Field(
        ...,
        ge=1800,
        le=2030,
        description="Year the property was built (1800–2030).",
    )
    lot_size: float = Field(
        ...,
        gt=0,
        description="Lot size in square feet. Must be greater than 0.",
    )
    distance_to_city_center: float = Field(
        ...,
        ge=0,
        description="Distance to city center in miles. Must be >= 0.",
    )
    school_rating: float = Field(
        ...,
        ge=0,
        le=10,
        description="Nearby school rating (0–10).",
    )


class BatchRequest(BaseModel):
    """Request body for batch price prediction (1–100 records)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "records": [
                    {
                        "square_footage": 1550,
                        "bedrooms": 3,
                        "bathrooms": 2.0,
                        "year_built": 1997,
                        "lot_size": 6800,
                        "distance_to_city_center": 4.1,
                        "school_rating": 7.6,
                    },
                    {
                        "square_footage": 2200,
                        "bedrooms": 4,
                        "bathrooms": 2.5,
                        "year_built": 2008,
                        "lot_size": 9600,
                        "distance_to_city_center": 7.0,
                        "school_rating": 8.8,
                    },
                ]
            }
        }
    )

    records: list[HouseFeatures] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of housing feature records to predict (1–100 items).",
    )


# ---------------------------------------------------------------------------
# Prediction response schemas
# ---------------------------------------------------------------------------


class FeatureContribution(BaseModel):
    """Dollar contribution of a single feature to the predicted price."""

    feature: str = Field(..., description="Feature name.")
    importance: float = Field(..., description="Dollar amount this feature contributes to the predicted price.")


class PredictionResponse(BaseModel):
    """Response body for a single price prediction."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "predicted_price": 385000.50,
                "currency": "USD",
                "input_features": {
                    "square_footage": 1550,
                    "bedrooms": 3,
                    "bathrooms": 2.0,
                    "year_built": 1997,
                    "lot_size": 6800,
                    "distance_to_city_center": 4.1,
                    "school_rating": 7.6,
                },
                "model_version": "1.0.0",
                "timestamp": "2024-01-15T10:30:00Z",
                "feature_importance": [
                    {"feature": "square_footage", "importance": 96250.12},
                    {"feature": "bedrooms", "importance": 34650.05},
                    {"feature": "bathrooms", "importance": 46200.06},
                    {"feature": "year_built", "importance": 57750.08},
                    {"feature": "lot_size", "importance": 69300.09},
                    {"feature": "distance_to_city_center", "importance": 26950.03},
                    {"feature": "school_rating", "importance": 53900.07},
                ],
            }
        }
    )

    predicted_price: float = Field(..., description="Predicted housing price in USD.")
    currency: str = Field(default="USD", description="Currency of the predicted price.")
    input_features: HouseFeatures = Field(..., description="Echo of the submitted input features.")
    model_version: str = Field(..., description="Version identifier of the deployed model.")
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp of the prediction.")
    feature_importance: list[FeatureContribution] = Field(..., description="Dollar contribution of each feature to the predicted price.")


class SinglePrediction(BaseModel):
    """A single prediction result within a batch response."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "record_id": 0,
                "predicted_price": 385000.50,
                "feature_importance": [
                    {"feature": "square_footage", "importance": 96250.12},
                    {"feature": "bedrooms", "importance": 34650.05},
                    {"feature": "bathrooms", "importance": 46200.06},
                    {"feature": "year_built", "importance": 57750.08},
                    {"feature": "lot_size", "importance": 69300.09},
                    {"feature": "distance_to_city_center", "importance": 26950.03},
                    {"feature": "school_rating", "importance": 53900.07},
                ],
            }
        }
    )

    record_id: int = Field(..., description="Zero-based index of the record in the batch request.")
    predicted_price: float = Field(..., description="Predicted housing price in USD.")
    feature_importance: list[FeatureContribution] = Field(..., description="Dollar contribution of each feature to the predicted price.")


class BatchPredictionResponse(BaseModel):
    """Response body for a batch price prediction."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "predictions": [
                    {"record_id": 0, "predicted_price": 385000.50},
                    {"record_id": 1, "predicted_price": 452000.00},
                ],
                "total_records": 2,
                "successful_predictions": 2,
                "model_version": "1.0.0",
                "timestamp": "2024-01-15T10:30:00Z",
            }
        }
    )

    predictions: list[SinglePrediction] = Field(
        ..., description="Prediction results for each submitted record."
    )
    total_records: int = Field(..., description="Total number of records submitted in the batch.")
    successful_predictions: int = Field(
        ..., description="Number of records for which a prediction was successfully generated."
    )
    model_version: str = Field(..., description="Version identifier of the deployed model.")
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp of the batch prediction.")


# ---------------------------------------------------------------------------
# Model info schemas
# ---------------------------------------------------------------------------


class DatasetInfo(BaseModel):
    """Metadata about the training dataset."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_samples": 1000,
                "features": 7,
                "train_test_split": "80/20",
            }
        }
    )

    total_samples: int = Field(..., description="Total number of samples in the dataset.")
    features: int = Field(..., description="Number of input features used for training.")
    train_test_split: str = Field(
        ..., description='Train/test split ratio, e.g. "80/20".'
    )


class PerformanceMetrics(BaseModel):
    """Model performance metrics evaluated on the held-out test set."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "r2_score": 0.85,
                "rmse": 45000.0,
                "mae": 32000.0,
                "mse": 2025000000.0,
            }
        }
    )

    r2_score: float = Field(..., description="Coefficient of determination (R²). Target ≥ 0.80.")
    rmse: float = Field(..., description="Root Mean Squared Error.")
    mae: float = Field(..., description="Mean Absolute Error.")
    mse: float = Field(..., description="Mean Squared Error.")


class FeatureImportance(BaseModel):
    """Importance score for a single feature."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "feature": "square_footage",
                "importance": 0.35,
            }
        }
    )

    feature: str = Field(..., description="Feature name.")
    importance: float = Field(..., description="Relative importance score (higher = more important).")


class ModelParameters(BaseModel):
    """Parameters of the Hedonic log-linear pricing model."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "algorithm": "Log-Linear OLS (Hedonic Pricing Model)",
                "intercept": 12.463831,
                "coefficients": {
                    "square_footage": -0.169558,
                    "bedrooms": 0.008944,
                    "bathrooms": -0.010669,
                    "year_built": 0.162538,
                    "lot_size": 0.145197,
                    "distance_to_city_center": 0.095858,
                    "school_rating": 0.068522,
                },
            }
        }
    )

    algorithm: str = Field(..., description="Algorithm description, e.g. 'Log-Linear OLS (Hedonic Pricing Model)'.")
    intercept: float = Field(..., description="Model intercept (β₀) in the log-linear equation.")
    coefficients: dict[str, float] = Field(..., description="Feature coefficients (βᵢ) representing percentage price change per unit.")


class ModelInfo(BaseModel):
    """Full metadata and performance information about the deployed model."""

    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "model_name": "HousingPriceHedonicModel",
                "model_version": "2.0.0",
                "model_type": "HedonicLinearRegression",
                "training_date": "2024-01-10",
                "dataset_info": {
                    "total_samples": 1000,
                    "features": 7,
                    "train_test_split": "80/20",
                },
                "performance_metrics": {
                    "r2_score": 0.99,
                    "rmse": 7561.5,
                    "mae": 6524.01,
                    "mse": 57176300.72,
                },
                "feature_importance": [
                    {"feature": "square_footage", "importance": 0.256407},
                    {"feature": "year_built", "importance": 0.245791},
                ],
                "model_parameters": {
                    "algorithm": "Log-Linear OLS (Hedonic Pricing Model)",
                    "intercept": 12.463831,
                    "coefficients": {
                        "square_footage": -0.169558,
                        "bedrooms": 0.008944,
                    },
                },
            }
        },
    )

    model_name: str = Field(..., description="Human-readable name of the model.")
    model_version: str = Field(..., description="Version identifier of the model.")
    model_type: str = Field(..., description='Algorithm type, e.g. "HedonicLinearRegression".')
    training_date: str = Field(..., description="Date the model was trained (ISO 8601 date string).")
    dataset_info: DatasetInfo = Field(..., description="Information about the training dataset.")
    performance_metrics: PerformanceMetrics = Field(
        ..., description="Performance metrics on the held-out test set."
    )
    feature_importance: list[FeatureImportance] = Field(
        ..., description="Feature importance scores, sorted descending."
    )
    model_parameters: ModelParameters = Field(
        ..., description="Hyperparameters used during training."
    )


# ---------------------------------------------------------------------------
# Health check schema
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    """Response body for the health check endpoint."""

    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "status": "healthy",
                "model_loaded": True,
                "model_version": "1.0.0",
                "timestamp": "2024-01-15T10:30:00Z",
                "uptime_seconds": 3600.5,
                "error": None,
            }
        },
    )

    status: str = Field(
        ..., description='Service health status. Either "healthy" or "unhealthy".'
    )
    model_loaded: bool = Field(..., description="Whether the ML model is loaded and ready.")
    model_version: Optional[str] = Field(
        default=None, description="Version of the loaded model, if available."
    )
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp of the health check.")
    uptime_seconds: Optional[float] = Field(
        default=None, description="Seconds since the model was loaded."
    )
    error: Optional[str] = Field(
        default=None, description="Error description when the model is not loaded."
    )


# ---------------------------------------------------------------------------
# Error response schemas
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    """Field-level error detail within an error response."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "field": "square_footage",
                "message": "Value must be greater than 0.",
            }
        }
    )

    field: str = Field(..., description="Name of the field that failed validation.")
    message: str = Field(..., description="Human-readable description of the validation failure.")


class ErrorBody(BaseModel):
    """Structured error payload."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed.",
                "details": [
                    {
                        "field": "square_footage",
                        "message": "Value must be greater than 0.",
                    }
                ],
                "timestamp": "2024-01-15T10:30:00Z",
                "request_id": "abc-123-def-456",
            }
        }
    )

    code: str = Field(..., description="Machine-readable error code, e.g. VALIDATION_ERROR.")
    message: str = Field(..., description="Human-readable summary of the error.")
    details: list[ErrorDetail] = Field(
        default_factory=list,
        description="Optional list of field-level error details.",
    )
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp when the error occurred.")
    request_id: str = Field(..., description="Unique identifier for the failed request.")


class ErrorResponse(BaseModel):
    """Top-level error response envelope (Requirement 5.1)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed.",
                    "details": [
                        {
                            "field": "square_footage",
                            "message": "Value must be greater than 0.",
                        }
                    ],
                    "timestamp": "2024-01-15T10:30:00Z",
                    "request_id": "abc-123-def-456",
                }
            }
        }
    )

    error: ErrorBody = Field(..., description="Structured error information.")

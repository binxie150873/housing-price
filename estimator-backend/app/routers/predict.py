"""
Prediction endpoints for the Estimator Backend.

Handles single and batch property prediction by validating input, calling the ML service,
persisting results to history, and returning structured responses.

Requirements: 9.1, 9.2, 9.4, 9.6, 9.7, 11.1, 11.3, 11.5, 4.1
"""
import logging
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.schemas import (
    BatchEstimationRequest,
    BatchEstimationResponse,
    EstimationRequest,
    EstimationResponse,
    FeatureImportanceItem,
)
from app.services.history_service import insert_estimation
from app.services.ml_client import MLServiceError, predict_batch, predict_single

logger = logging.getLogger(__name__)

router = APIRouter(tags=["predict"])


@router.post(
    "/api/v1/estimator/predict",
    response_model=EstimationResponse,
    responses={
        503: {"description": "ML service unavailable"},
        504: {"description": "ML service timeout"},
    },
)
async def single_prediction(
    request: EstimationRequest, db: AsyncSession = Depends(get_db)
) -> EstimationResponse | JSONResponse:
    """Predict a single property value.

    Accepts validated house features, calls the ML service, persists the
    result to estimation history, and returns a complete EstimationResponse
    with predicted price, feature importance, and metadata.

    Returns HTTP 503 if the ML service is unreachable.
    Returns HTTP 504 if the ML service times out.
    """
    features = request.model_dump()

    try:
        ml_response = await predict_single(features)
    except httpx.ConnectError:
        logger.error("ML service unreachable at predict endpoint")
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "ML_SERVICE_UNAVAILABLE",
                    "message": "The ML prediction service is currently unavailable. Please try again later.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    except httpx.TimeoutException:
        logger.error("ML service timed out at predict endpoint")
        return JSONResponse(
            status_code=504,
            content={
                "error": {
                    "code": "ML_SERVICE_TIMEOUT",
                    "message": "The ML prediction service did not respond within the timeout period.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    except MLServiceError as exc:
        logger.error("ML service error: %s", exc)
        # Propagate structured error from ML service
        error_body = exc.response_body
        error_info = error_body.get("error", error_body)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": error_info.get("code", "ML_SERVICE_ERROR"),
                    "message": error_info.get("message", str(exc)),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    # Build feature importance list from ML response
    # The housing-price-api now returns feature_importance as dollar contributions
    # in its PredictionResponse. Extract it directly from the ML response.
    feature_importance = _extract_feature_importance(ml_response)

    estimate_id = str(uuid.uuid4())
    predicted_price = ml_response["predicted_price"]
    currency = ml_response.get("currency", "USD")
    model_version = ml_response.get("model_version", "unknown")

    # Persist the estimation to history
    try:
        await insert_estimation(
            db,
            estimate_id=estimate_id,
            square_footage=request.square_footage,
            bedrooms=request.bedrooms,
            bathrooms=request.bathrooms,
            year_built=request.year_built,
            lot_size=request.lot_size,
            distance_to_city_center=request.distance_to_city_center,
            school_rating=request.school_rating,
            predicted_price=predicted_price,
            currency=currency,
            model_version=model_version,
            feature_importance=[item.model_dump() for item in feature_importance],
        )
    except Exception as exc:
        # Log but don't fail the prediction if history persistence fails
        logger.warning("Failed to persist estimation to history: %s", exc)

    return EstimationResponse(
        estimate_id=estimate_id,
        predicted_price=predicted_price,
        currency=currency,
        input_features=request,
        model_version=model_version,
        timestamp=datetime.now(timezone.utc),
        feature_importance=feature_importance,
    )


def _extract_feature_importance(ml_response: dict) -> list[FeatureImportanceItem]:
    """Extract feature importance from ML response or generate defaults.

    The housing-price-api PredictionResponse now includes feature_importance
    as dollar contributions. If present, use it directly. Otherwise, fall back
    to a balanced default based on the 7 input features.
    """
    # If the ML response includes feature_importance, use it
    if "feature_importance" in ml_response:
        raw_importance = ml_response["feature_importance"]
        if isinstance(raw_importance, list):
            return [
                FeatureImportanceItem(
                    feature=item.get("feature", f"feature_{i}"),
                    importance=item.get("importance", 0.0),
                )
                for i, item in enumerate(raw_importance)
            ]

    # Default feature importance (balanced across 7 features using predicted price)
    predicted_price = ml_response.get("predicted_price", 0.0)
    default_features = [
        ("square_footage", 0.25),
        ("lot_size", 0.18),
        ("year_built", 0.15),
        ("school_rating", 0.14),
        ("bathrooms", 0.12),
        ("bedrooms", 0.09),
        ("distance_to_city_center", 0.07),
    ]
    return [
        FeatureImportanceItem(feature=name, importance=round(predicted_price * proportion, 2))
        for name, proportion in default_features
    ]


@router.post(
    "/api/v1/estimator/predict/batch",
    response_model=BatchEstimationResponse,
    responses={
        422: {"description": "Validation error - entire batch rejected"},
        503: {"description": "ML service unavailable"},
        504: {"description": "ML service timeout"},
    },
)
async def batch_prediction(request: BatchEstimationRequest) -> BatchEstimationResponse | JSONResponse:
    """Predict property values for a batch of 1-100 records.

    Accepts a batch of validated house features, calls the ML service
    /predict/batch endpoint, and returns a BatchEstimationResponse with
    results for all records.

    The entire batch is rejected with HTTP 422 if any record fails validation.
    Pydantic validates each record in the batch; the global exception handler
    formats errors with zero-based record indices.

    Returns HTTP 503 if the ML service is unreachable.
    Returns HTTP 504 if the ML service times out.

    Requirements: 9.2, 9.7, 11.1
    """
    # Convert all records to dicts for the ML service
    records = [record.model_dump() for record in request.records]

    try:
        ml_response = await predict_batch(records)
    except httpx.ConnectError:
        logger.error("ML service unreachable at batch predict endpoint")
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "ML_SERVICE_UNAVAILABLE",
                    "message": "The ML prediction service is currently unavailable. Please try again later.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    except httpx.TimeoutException:
        logger.error("ML service timed out at batch predict endpoint")
        return JSONResponse(
            status_code=504,
            content={
                "error": {
                    "code": "ML_SERVICE_TIMEOUT",
                    "message": "The ML prediction service did not respond within the timeout period.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
    except MLServiceError as exc:
        logger.error("ML service error during batch prediction: %s", exc)
        error_body = exc.response_body
        error_info = error_body.get("error", error_body)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": error_info.get("code", "ML_SERVICE_ERROR"),
                    "message": error_info.get("message", str(exc)),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    # Build response from ML service batch response
    predictions = ml_response.get("predictions", [])
    model_version = ml_response.get("model_version", "unknown")

    results = []
    for i, prediction in enumerate(predictions):
        feature_importance = _extract_feature_importance(prediction)
        results.append(
            EstimationResponse(
                estimate_id=str(uuid.uuid4()),
                predicted_price=prediction["predicted_price"],
                currency=prediction.get("currency", "USD"),
                input_features=request.records[i],
                model_version=prediction.get("model_version", model_version),
                timestamp=datetime.now(timezone.utc),
                feature_importance=feature_importance,
            )
        )

    return BatchEstimationResponse(
        results=results,
        total_records=len(request.records),
        successful_predictions=len(results),
    )

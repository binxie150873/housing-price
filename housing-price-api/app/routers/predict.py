"""
Prediction router for the Housing Price Prediction API.

Handles single and batch prediction endpoints with proper error handling.

Requirements: 1.1, 1.10, 2.1, 2.2, 2.3, 2.6
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.predictor import Predictor
from app.models.schemas import (
    BatchPredictionResponse,
    BatchRequest,
    HouseFeatures,
    PredictionResponse,
)
from app.services.prediction import PredictionService
from app.utils.helpers import build_error_response

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction"])

# Module-level references set by main.py after import
predictor: Predictor | None = None
service: PredictionService | None = None


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict single housing price",
    description="Accepts property features and returns a predicted price using the trained ML model.",
    responses={
        200: {"description": "Prediction successful"},
        422: {"description": "Validation error in input features"},
        503: {"description": "Model not loaded"},
        500: {"description": "Internal prediction error"},
    },
)
async def predict_single(features: HouseFeatures) -> PredictionResponse | JSONResponse:
    """Predict a single housing price from property features.

    Accepts a JSON body conforming to the HouseFeatures schema and returns
    a PredictionResponse with the predicted price, currency, echoed input,
    model version, and timestamp.
    """
    if predictor is None or not predictor.is_loaded:
        return JSONResponse(
            status_code=503,
            content=build_error_response(
                code="MODEL_NOT_LOADED",
                message="The prediction model is not currently loaded. Please try again later.",
            ),
        )

    try:
        result = service.predict_single(features)
        return result
    except RuntimeError as exc:
        logger.error("Prediction error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=build_error_response(
                code="PREDICTION_ERROR",
                message="An error occurred while generating the prediction.",
            ),
        )
    except Exception as exc:
        logger.error("Unexpected prediction error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=build_error_response(
                code="PREDICTION_ERROR",
                message="An error occurred while generating the prediction.",
            ),
        )


@router.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    summary="Predict batch housing prices",
    description="Accepts a batch of property features and returns predicted prices for each item using the trained ML model.",
    responses={
        200: {"description": "Batch prediction successful"},
        422: {"description": "Validation error in input features"},
        503: {"description": "Model not loaded"},
        500: {"description": "Internal prediction error"},
    },
)
async def predict_batch(request: BatchRequest) -> BatchPredictionResponse | JSONResponse:
    """Predict housing prices for a batch of property records.

    Accepts a JSON body conforming to the BatchRequest schema (1–100 records)
    and returns a BatchPredictionResponse with predictions for each record.
    """
    if predictor is None or not predictor.is_loaded:
        return JSONResponse(
            status_code=503,
            content=build_error_response(
                code="MODEL_NOT_LOADED",
                message="The prediction model is not currently loaded. Please try again later.",
            ),
        )

    try:
        result = service.predict_batch(request)
        return result
    except RuntimeError as exc:
        logger.error("Batch prediction error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=build_error_response(
                code="PREDICTION_ERROR",
                message="An error occurred while generating the batch prediction.",
            ),
        )
    except Exception as exc:
        logger.error("Unexpected batch prediction error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=build_error_response(
                code="PREDICTION_ERROR",
                message="An error occurred while generating the batch prediction.",
            ),
        )

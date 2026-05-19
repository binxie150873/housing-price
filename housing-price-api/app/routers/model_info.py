"""
Model information router for the Housing Price Prediction API.

Exposes GET /model-info to retrieve model metadata and performance metrics.

Requirements: 3.1, 3.3
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.predictor import Predictor
from app.models.schemas import ModelInfo
from app.utils.helpers import build_error_response

router = APIRouter(tags=["Model Info"])

# Module-level predictor reference; set by main.py after import.
predictor: Predictor | None = None


@router.get(
    "/model-info",
    response_model=ModelInfo,
    summary="Get model metadata",
    description="Returns metadata, performance metrics, and feature importance for the deployed model.",
    responses={
        200: {"description": "Model info retrieved successfully"},
        503: {"description": "Model not loaded"},
    },
)
async def get_model_info():
    """Return metadata and performance metrics for the deployed model.

    Returns HTTP 503 with MODEL_NOT_LOADED if the model is not available.
    """
    if predictor is None or not predictor.is_loaded:
        return JSONResponse(
            status_code=503,
            content=build_error_response(
                code="MODEL_NOT_LOADED",
                message="The ML model is not currently loaded. Please try again later.",
            ),
        )

    model_info = predictor.get_model_info()
    return model_info

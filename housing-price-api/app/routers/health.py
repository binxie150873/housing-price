"""
Health check router for the Housing Price Prediction API.

Provides GET /health endpoint that reports service health and model load state.

Requirements: 4.1, 4.2
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.predictor import Predictor
from app.models.schemas import HealthResponse
from app.utils.helpers import utc_now

router = APIRouter(tags=["Health"])

# Module-level predictor reference; set by main.py after import.
predictor: Predictor | None = None


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Reports service health status and model readiness.",
    responses={
        200: {"description": "Service is healthy"},
        503: {"description": "Service is unhealthy, model not loaded"},
    },
)
async def health_check():
    """Check service health and model readiness."""
    if predictor is not None and predictor.is_loaded:
        model_info = predictor.get_model_info()
        response = HealthResponse(
            status="healthy",
            model_loaded=True,
            model_version=model_info.get("model_version", "unknown"),
            timestamp=utc_now(),
            uptime_seconds=predictor.get_uptime_seconds(),
        )
        return response
    else:
        response = HealthResponse(
            status="unhealthy",
            model_loaded=False,
            timestamp=utc_now(),
            error="Model not loaded",
        )
        return JSONResponse(
            status_code=503,
            content=response.model_dump(mode="json"),
        )

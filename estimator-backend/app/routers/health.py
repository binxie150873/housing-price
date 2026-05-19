"""
Health check endpoint for the Estimator Backend.

Returns service status, ML model accessibility, and model version.
Checks DB connectivity and ML service reachability.

Requirements: 9.5
"""
import asyncio
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import async_session_factory
from app.models.schemas import HealthResponse
from app.services.ml_client import ML_SERVICE_URL

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])

# Timeout for individual health sub-checks (seconds)
_CHECK_TIMEOUT = 3.0


async def _check_db() -> bool:
    """Check database connectivity by executing a simple query."""
    try:
        async with async_session_factory() as session:
            await asyncio.wait_for(
                session.execute(text("SELECT 1")),
                timeout=_CHECK_TIMEOUT,
            )
        return True
    except Exception as exc:
        logger.warning("DB health check failed: %s", exc)
        return False


async def _check_ml_service() -> tuple[bool, str]:
    """Check ML service reachability and retrieve model version.

    Returns:
        Tuple of (is_reachable, model_version).
        If unreachable, model_version defaults to "unknown".
    """
    try:
        async with httpx.AsyncClient(
            base_url=ML_SERVICE_URL,
            timeout=httpx.Timeout(_CHECK_TIMEOUT),
        ) as client:
            response = await client.get("/health")
            if response.status_code == 200:
                data = response.json()
                model_version = data.get("model_version", "unknown")
                return True, model_version
            return False, "unknown"
    except Exception as exc:
        logger.warning("ML service health check failed: %s", exc)
        return False, "unknown"


@router.get("/api/v1/estimator/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check the health of the estimator backend service.

    Performs concurrent checks on:
    - Database connectivity (simple SELECT 1 query)
    - ML service reachability (GET /health on housing-price-api)

    Returns status "healthy" if both checks pass, "unhealthy" otherwise.
    Includes model_loaded boolean, model_version, and ISO 8601 timestamp.
    """
    db_ok, (ml_ok, model_version) = await asyncio.gather(
        _check_db(),
        _check_ml_service(),
    )

    status = "healthy" if (db_ok and ml_ok) else "unhealthy"

    return HealthResponse(
        status=status,
        model_loaded=ml_ok,
        model_version=model_version,
        timestamp=datetime.now(timezone.utc),
    )

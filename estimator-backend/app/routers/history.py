"""
History endpoints for the Estimator Backend.

Provides paginated retrieval of estimation history with search and filter
capabilities, and single record retrieval by ID.

Requirements: 4.1, 9.3
"""
import logging
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.schemas import HistoryFilter, PaginatedResponse
from app.services.history_service import get_estimation_by_id, query_estimations

logger = logging.getLogger(__name__)

router = APIRouter(tags=["history"])


@router.get(
    "/api/v1/estimator/history",
    response_model=PaginatedResponse,
    responses={
        500: {"description": "Internal server error"},
    },
)
async def get_history(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(
        default=20, ge=1, le=100, description="Number of records per page"
    ),
    search: str | None = Query(
        default=None,
        min_length=2,
        description="Search term for neighborhood (case-insensitive, minimum 2 characters)",
    ),
    date_from: date | None = Query(
        default=None, description="Filter start date (inclusive)"
    ),
    date_to: date | None = Query(
        default=None, description="Filter end date (inclusive)"
    ),
    price_min: float | None = Query(
        default=None, description="Minimum predicted price filter"
    ),
    price_max: float | None = Query(
        default=None, description="Maximum predicted price filter"
    ),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse:
    """Retrieve paginated estimation history with optional search and filters.

    Supports:
    - Pagination: page (default 1), page_size (default 20, max 100)
    - Search: case-insensitive partial match on neighborhood
    - Date range: date_from and date_to (inclusive)
    - Price range: price_min and price_max
    """
    filters = HistoryFilter(
        page=page,
        page_size=page_size,
        search=search,
        date_from=date_from,
        date_to=date_to,
        price_min=price_min,
        price_max=price_max,
    )
    return await query_estimations(db, filters)


@router.get(
    "/api/v1/estimator/history/{estimation_id}",
    response_model=None,
    responses={
        404: {"description": "Estimation not found"},
        500: {"description": "Internal server error"},
    },
)
async def get_history_by_id(
    estimation_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict | JSONResponse:
    """Retrieve a single estimation record by its ID.

    Returns the full estimation record including input features,
    predicted price, and feature importance data.
    Returns HTTP 404 if no record matches the provided ID.
    """
    record = await get_estimation_by_id(db, estimation_id)

    if record is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Estimation with id '{estimation_id}' not found.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    return {
        "estimate_id": str(record.id),
        "predicted_price": float(record.predicted_price),
        "currency": record.currency,
        "input_features": {
            "square_footage": float(record.square_footage),
            "bedrooms": int(record.bedrooms),
            "bathrooms": float(record.bathrooms),
            "year_built": int(record.year_built),
            "lot_size": float(record.lot_size),
            "distance_to_city_center": float(record.distance_to_city_center),
            "school_rating": float(record.school_rating),
        },
        "model_version": record.model_version,
        "timestamp": record.created_at.isoformat() if record.created_at else None,
        "feature_importance": record.feature_importance or [],
    }

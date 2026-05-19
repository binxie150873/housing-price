"""
History service for managing estimation records in PostgreSQL.

Handles persistence, retrieval, pagination, and record cap enforcement.

Requirements: 4.1, 9.3
"""
import logging
import math
import uuid
from datetime import datetime, time, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EstimationHistory
from app.models.schemas import HistoryFilter, PaginatedResponse

logger = logging.getLogger(__name__)

MAX_RECORDS = 10_000


async def insert_estimation(
    db: AsyncSession,
    *,
    estimate_id: str,
    square_footage: float,
    bedrooms: int,
    bathrooms: float,
    year_built: int,
    lot_size: float,
    distance_to_city_center: float,
    school_rating: float,
    predicted_price: float,
    currency: str,
    model_version: str,
    feature_importance: list[dict] | None = None,
) -> EstimationHistory:
    """Insert a new estimation record and enforce the 10,000 record cap.

    If the total record count reaches the cap, the oldest records are evicted
    to make room for the new entry.
    """
    # Evict oldest records if at capacity
    count_query = select(func.count()).select_from(EstimationHistory)
    result = await db.execute(count_query)
    total_count = result.scalar_one()

    if total_count >= MAX_RECORDS:
        # Calculate how many to delete (at least 1 to make room)
        records_to_evict = total_count - MAX_RECORDS + 1
        # Find the IDs of the oldest records
        oldest_ids_query = (
            select(EstimationHistory.id)
            .order_by(EstimationHistory.created_at.asc())
            .limit(records_to_evict)
        )
        oldest_result = await db.execute(oldest_ids_query)
        oldest_ids = [row[0] for row in oldest_result.fetchall()]

        if oldest_ids:
            delete_stmt = delete(EstimationHistory).where(
                EstimationHistory.id.in_(oldest_ids)
            )
            await db.execute(delete_stmt)
            logger.info("Evicted %d oldest estimation records", len(oldest_ids))

    # Insert the new record
    record = EstimationHistory(
        id=uuid.UUID(estimate_id),
        square_footage=square_footage,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        year_built=year_built,
        lot_size=lot_size,
        distance_to_city_center=distance_to_city_center,
        school_rating=school_rating,
        predicted_price=predicted_price,
        currency=currency,
        model_version=model_version,
        feature_importance=feature_importance,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    await db.flush()
    return record


async def get_estimation_by_id(
    db: AsyncSession, estimation_id: str
) -> EstimationHistory | None:
    """Retrieve a single estimation record by its UUID."""
    try:
        uid = uuid.UUID(estimation_id)
    except ValueError:
        return None

    query = select(EstimationHistory).where(EstimationHistory.id == uid)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def query_estimations(
    db: AsyncSession, filters: HistoryFilter
) -> PaginatedResponse:
    """Query estimation history with pagination, search, and filters.

    Supports:
    - Pagination with configurable page size (default 20, max 100)
    - Case-insensitive partial match search on predicted_price text
    - Date range filtering (date_from, date_to)
    - Price range filtering (price_min, price_max)

    Returns a PaginatedResponse with items, total, page, page_size, total_pages.
    """
    base_query = select(EstimationHistory)
    count_query = select(func.count()).select_from(EstimationHistory)

    # Apply search filter (case-insensitive partial match on neighborhood via feature_importance JSONB)
    if filters.search:
        search_term = f"%{filters.search.lower()}%"
        search_condition = func.lower(
            func.coalesce(
                EstimationHistory.feature_importance["neighborhood"].astext, ""
            )
        ).like(search_term)
        base_query = base_query.where(search_condition)
        count_query = count_query.where(search_condition)

    # Apply date range filter
    if filters.date_from:
        from_dt = datetime.combine(filters.date_from, time.min, tzinfo=timezone.utc)
        base_query = base_query.where(EstimationHistory.created_at >= from_dt)
        count_query = count_query.where(EstimationHistory.created_at >= from_dt)

    if filters.date_to:
        to_dt = datetime.combine(filters.date_to, time.max, tzinfo=timezone.utc)
        base_query = base_query.where(EstimationHistory.created_at <= to_dt)
        count_query = count_query.where(EstimationHistory.created_at <= to_dt)

    # Apply price range filter
    if filters.price_min is not None:
        base_query = base_query.where(
            EstimationHistory.predicted_price >= filters.price_min
        )
        count_query = count_query.where(
            EstimationHistory.predicted_price >= filters.price_min
        )

    if filters.price_max is not None:
        base_query = base_query.where(
            EstimationHistory.predicted_price <= filters.price_max
        )
        count_query = count_query.where(
            EstimationHistory.predicted_price <= filters.price_max
        )

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Calculate pagination
    total_pages = math.ceil(total / filters.page_size) if total > 0 else 0
    offset = (filters.page - 1) * filters.page_size

    # Fetch paginated results ordered by created_at descending
    items_query = (
        base_query.order_by(EstimationHistory.created_at.desc())
        .offset(offset)
        .limit(filters.page_size)
    )
    items_result = await db.execute(items_query)
    items = items_result.scalars().all()

    # Convert ORM objects to dicts for the response
    serialized_items = [_serialize_estimation(item) for item in items]

    return PaginatedResponse(
        items=serialized_items,
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        total_pages=total_pages,
    )


def _serialize_estimation(record: EstimationHistory) -> dict:
    """Convert an EstimationHistory ORM object to a serializable dict."""
    return {
        "id": str(record.id),
        "square_footage": float(record.square_footage),
        "bedrooms": int(record.bedrooms),
        "bathrooms": float(record.bathrooms),
        "year_built": int(record.year_built),
        "lot_size": float(record.lot_size),
        "distance_to_city_center": float(record.distance_to_city_center),
        "school_rating": float(record.school_rating),
        "predicted_price": float(record.predicted_price),
        "currency": record.currency,
        "model_version": record.model_version,
        "feature_importance": record.feature_importance,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }

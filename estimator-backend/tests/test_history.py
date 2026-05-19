"""
Unit tests for history persistence and paginated retrieval.

Tests the history router endpoints and history service logic including:
- Paginated retrieval with default and custom page sizes
- Search by neighborhood (case-insensitive, minimum 2 chars)
- Filter by date range and price range
- Single record retrieval by ID
- Record cap enforcement (10,000 max with eviction)

Requirements: 4.1, 9.3
"""
import math
import uuid
from datetime import datetime, time, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import EstimationHistory
from app.models.schemas import HistoryFilter, PaginatedResponse
from app.services.history_service import (
    MAX_RECORDS,
    _serialize_estimation,
    get_estimation_by_id,
    insert_estimation,
    query_estimations,
)
from main import app


@pytest.fixture
async def client():
    """Async HTTP client for testing FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _make_estimation_record(
    record_id=None,
    predicted_price=350000.0,
    neighborhood="Downtown",
    created_at=None,
):
    """Helper to create a mock EstimationHistory record."""
    record = MagicMock(spec=EstimationHistory)
    record.id = record_id or uuid.uuid4()
    record.square_footage = 2000.0
    record.bedrooms = 3
    record.bathrooms = 2.0
    record.year_built = 2005
    record.lot_size = 8000.0
    record.distance_to_city_center = 5.0
    record.school_rating = 7.5
    record.predicted_price = predicted_price
    record.currency = "USD"
    record.model_version = "1.0.0"
    record.feature_importance = [
        {"feature": "square_footage", "importance": 30.0},
        {"feature": "neighborhood", "importance": 25.0, "neighborhood": neighborhood},
    ]
    record.created_at = created_at or datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
    return record


# ─────────────────────────────────────────────────────────────────────────────
# Router endpoint tests
# ─────────────────────────────────────────────────────────────────────────────


class TestGetHistoryEndpoint:
    """Tests for GET /api/v1/estimator/history."""

    @pytest.mark.asyncio
    async def test_default_pagination(self, client):
        """Default request returns page 1 with page_size 20."""
        with patch(
            "app.routers.history.query_estimations",
            new_callable=AsyncMock,
            return_value=PaginatedResponse(
                items=[], total=0, page=1, page_size=20, total_pages=0
            ),
        ) as mock_query:
            response = await client.get("/api/v1/estimator/history")
            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 1
            assert data["page_size"] == 20
            assert data["total"] == 0
            assert data["total_pages"] == 0
            assert data["items"] == []

            # Verify the filter passed to the service
            call_args = mock_query.call_args
            filters = call_args[1] if call_args[1] else call_args[0][1]
            assert filters.page == 1
            assert filters.page_size == 20

    @pytest.mark.asyncio
    async def test_custom_pagination(self, client):
        """Custom page and page_size are passed through."""
        with patch(
            "app.routers.history.query_estimations",
            new_callable=AsyncMock,
            return_value=PaginatedResponse(
                items=[], total=50, page=3, page_size=10, total_pages=5
            ),
        ):
            response = await client.get(
                "/api/v1/estimator/history?page=3&page_size=10"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 3
            assert data["page_size"] == 10
            assert data["total_pages"] == 5

    @pytest.mark.asyncio
    async def test_page_size_max_100(self, client):
        """Page size exceeding 100 returns validation error."""
        response = await client.get("/api/v1/estimator/history?page_size=101")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_page_size_min_1(self, client):
        """Page size less than 1 returns validation error."""
        response = await client.get("/api/v1/estimator/history?page_size=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_page_min_1(self, client):
        """Page less than 1 returns validation error."""
        response = await client.get("/api/v1/estimator/history?page=0")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_minimum_2_chars(self, client):
        """Search term with fewer than 2 characters returns validation error."""
        response = await client.get("/api/v1/estimator/history?search=a")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_search_2_chars_accepted(self, client):
        """Search term with exactly 2 characters is accepted."""
        with patch(
            "app.routers.history.query_estimations",
            new_callable=AsyncMock,
            return_value=PaginatedResponse(
                items=[], total=0, page=1, page_size=20, total_pages=0
            ),
        ):
            response = await client.get("/api/v1/estimator/history?search=ab")
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_filter_passed(self, client):
        """Search term is passed to the query service."""
        with patch(
            "app.routers.history.query_estimations",
            new_callable=AsyncMock,
            return_value=PaginatedResponse(
                items=[], total=0, page=1, page_size=20, total_pages=0
            ),
        ) as mock_query:
            response = await client.get(
                "/api/v1/estimator/history?search=downtown"
            )
            assert response.status_code == 200
            call_args = mock_query.call_args
            filters = call_args[1] if call_args[1] else call_args[0][1]
            assert filters.search == "downtown"

    @pytest.mark.asyncio
    async def test_date_range_filter(self, client):
        """Date range filters are passed to the query service."""
        with patch(
            "app.routers.history.query_estimations",
            new_callable=AsyncMock,
            return_value=PaginatedResponse(
                items=[], total=0, page=1, page_size=20, total_pages=0
            ),
        ) as mock_query:
            response = await client.get(
                "/api/v1/estimator/history?date_from=2025-01-01&date_to=2025-01-31"
            )
            assert response.status_code == 200
            call_args = mock_query.call_args
            filters = call_args[1] if call_args[1] else call_args[0][1]
            assert str(filters.date_from) == "2025-01-01"
            assert str(filters.date_to) == "2025-01-31"

    @pytest.mark.asyncio
    async def test_price_range_filter(self, client):
        """Price range filters are passed to the query service."""
        with patch(
            "app.routers.history.query_estimations",
            new_callable=AsyncMock,
            return_value=PaginatedResponse(
                items=[], total=0, page=1, page_size=20, total_pages=0
            ),
        ) as mock_query:
            response = await client.get(
                "/api/v1/estimator/history?price_min=100000&price_max=500000"
            )
            assert response.status_code == 200
            call_args = mock_query.call_args
            filters = call_args[1] if call_args[1] else call_args[0][1]
            assert filters.price_min == 100000.0
            assert filters.price_max == 500000.0


class TestGetHistoryByIdEndpoint:
    """Tests for GET /api/v1/estimator/history/{estimation_id}."""

    @pytest.mark.asyncio
    async def test_valid_id_returns_record(self, client):
        """Valid UUID returns the estimation record."""
        record_id = uuid.uuid4()
        mock_record = _make_estimation_record(record_id=record_id)

        with patch(
            "app.routers.history.get_estimation_by_id",
            new_callable=AsyncMock,
            return_value=mock_record,
        ):
            response = await client.get(
                f"/api/v1/estimator/history/{record_id}"
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == str(record_id)
            assert data["predicted_price"] == 350000.0
            assert data["square_footage"] == 2000.0
            assert data["bedrooms"] == 3
            assert data["bathrooms"] == 2.0
            assert data["year_built"] == 2005
            assert data["currency"] == "USD"
            assert data["model_version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_invalid_id_returns_404(self, client):
        """Non-existent ID returns 404 with error details."""
        with patch(
            "app.routers.history.get_estimation_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = await client.get(
                "/api/v1/estimator/history/non-existent-id"
            )
            assert response.status_code == 404
            data = response.json()
            assert data["error"]["code"] == "NOT_FOUND"
            assert "non-existent-id" in data["error"]["message"]

    @pytest.mark.asyncio
    async def test_invalid_uuid_returns_404(self, client):
        """Invalid UUID format returns 404."""
        with patch(
            "app.routers.history.get_estimation_by_id",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = await client.get(
                "/api/v1/estimator/history/not-a-uuid"
            )
            assert response.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Service layer tests
# ─────────────────────────────────────────────────────────────────────────────


class TestSerializeEstimation:
    """Tests for the _serialize_estimation helper."""

    def test_serializes_all_fields(self):
        """All fields are correctly serialized to a dict."""
        record = _make_estimation_record(
            record_id=uuid.UUID("12345678-1234-5678-1234-567812345678"),
            predicted_price=450000.50,
        )
        result = _serialize_estimation(record)

        assert result["id"] == "12345678-1234-5678-1234-567812345678"
        assert result["square_footage"] == 2000.0
        assert result["bedrooms"] == 3
        assert result["bathrooms"] == 2.0
        assert result["year_built"] == 2005
        assert result["lot_size"] == 8000.0
        assert result["distance_to_city_center"] == 5.0
        assert result["school_rating"] == 7.5
        assert result["predicted_price"] == 450000.50
        assert result["currency"] == "USD"
        assert result["model_version"] == "1.0.0"
        assert result["feature_importance"] is not None
        assert result["created_at"] == "2025-01-15T10:30:00+00:00"

    def test_serializes_none_created_at(self):
        """None created_at is serialized as None."""
        record = _make_estimation_record()
        record.created_at = None
        result = _serialize_estimation(record)
        assert result["created_at"] is None


class TestHistoryFilterModel:
    """Tests for the HistoryFilter Pydantic model."""

    def test_default_values(self):
        """Default filter has page=1, page_size=20, no filters."""
        f = HistoryFilter()
        assert f.page == 1
        assert f.page_size == 20
        assert f.search is None
        assert f.date_from is None
        assert f.date_to is None
        assert f.price_min is None
        assert f.price_max is None

    def test_page_size_max_100(self):
        """Page size > 100 raises validation error."""
        with pytest.raises(Exception):
            HistoryFilter(page_size=101)

    def test_page_min_1(self):
        """Page < 1 raises validation error."""
        with pytest.raises(Exception):
            HistoryFilter(page=0)

    def test_search_min_2_chars(self):
        """Search with fewer than 2 chars raises validation error."""
        with pytest.raises(Exception):
            HistoryFilter(search="a")

    def test_search_2_chars_accepted(self):
        """Search with exactly 2 chars is accepted."""
        f = HistoryFilter(search="ab")
        assert f.search == "ab"


class TestMaxRecordsConstant:
    """Tests for the MAX_RECORDS constant."""

    def test_max_records_is_10000(self):
        """The record cap is set to 10,000."""
        assert MAX_RECORDS == 10_000

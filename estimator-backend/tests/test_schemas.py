"""
Unit tests for Pydantic models/schemas.

Verifies that EstimationRequest, EstimationResponse, HistoryFilter,
and FeatureImportanceItem models validate correctly.
"""
from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    EstimationRequest,
    EstimationResponse,
    FeatureImportanceItem,
    HistoryFilter,
)


class TestEstimationRequest:
    """Tests for EstimationRequest model validation."""

    def test_valid_request(self):
        """A valid request with all fields within constraints should pass."""
        req = EstimationRequest(
            square_footage=2000.0,
            bedrooms=3,
            bathrooms=2.0,
            year_built=2005,
            lot_size=8000.0,
            distance_to_city_center=5.0,
            school_rating=7.5,
        )
        assert req.square_footage == 2000.0
        assert req.bedrooms == 3
        assert req.bathrooms == 2.0
        assert req.year_built == 2005
        assert req.lot_size == 8000.0
        assert req.distance_to_city_center == 5.0
        assert req.school_rating == 7.5

    def test_square_footage_must_be_positive(self):
        """square_footage must be > 0."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_square_footage_max(self):
        """square_footage must be <= 100000."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=100001,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_bedrooms_min(self):
        """bedrooms must be >= 1."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=0,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_bedrooms_max(self):
        """bedrooms must be <= 10."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=11,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_bathrooms_min(self):
        """bathrooms must be >= 0.5."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=0.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_year_built_min(self):
        """year_built must be >= 1800."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=1799,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_year_built_max(self):
        """year_built must be <= 2030."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2031,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_lot_size_must_be_positive(self):
        """lot_size must be > 0."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2005,
                lot_size=0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            )

    def test_distance_to_city_center_min(self):
        """distance_to_city_center must be >= 0."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=-1.0,
                school_rating=7.5,
            )

    def test_school_rating_max(self):
        """school_rating must be <= 10."""
        with pytest.raises(ValidationError):
            EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=10.1,
            )

    def test_boundary_values_valid(self):
        """Boundary values at the edges of constraints should be valid."""
        req = EstimationRequest(
            square_footage=0.01,
            bedrooms=1,
            bathrooms=0.5,
            year_built=1800,
            lot_size=0.01,
            distance_to_city_center=0,
            school_rating=0,
        )
        assert req.square_footage == 0.01
        assert req.bedrooms == 1
        assert req.bathrooms == 0.5
        assert req.year_built == 1800

    def test_max_boundary_values_valid(self):
        """Maximum boundary values should be valid."""
        req = EstimationRequest(
            square_footage=100000,
            bedrooms=10,
            bathrooms=10,
            year_built=2030,
            lot_size=1000000,
            distance_to_city_center=500,
            school_rating=10,
        )
        assert req.square_footage == 100000
        assert req.bedrooms == 10


class TestFeatureImportanceItem:
    """Tests for FeatureImportanceItem model."""

    def test_valid_item(self):
        """A valid feature importance item should pass."""
        item = FeatureImportanceItem(feature="square_footage", importance=25.5)
        assert item.feature == "square_footage"
        assert item.importance == 25.5

    def test_importance_min(self):
        """importance must be >= 0."""
        with pytest.raises(ValidationError):
            FeatureImportanceItem(feature="test", importance=-1.0)

    def test_importance_max(self):
        """importance can be any non-negative value (dollar amounts, not percentages)."""
        # Dollar amounts can exceed 100 - this should be valid
        item = FeatureImportanceItem(feature="test", importance=96250.12)
        assert item.importance == 96250.12


class TestEstimationResponse:
    """Tests for EstimationResponse model."""

    def test_valid_response(self):
        """A valid response with all required fields should pass."""
        resp = EstimationResponse(
            estimate_id="est-123",
            predicted_price=350000.0,
            currency="USD",
            input_features=EstimationRequest(
                square_footage=2000.0,
                bedrooms=3,
                bathrooms=2.0,
                year_built=2005,
                lot_size=8000.0,
                distance_to_city_center=5.0,
                school_rating=7.5,
            ),
            model_version="1.0.0",
            timestamp=datetime.now(timezone.utc),
            feature_importance=[
                FeatureImportanceItem(feature="square_footage", importance=30.0),
                FeatureImportanceItem(feature="bedrooms", importance=20.0),
                FeatureImportanceItem(feature="year_built", importance=50.0),
            ],
        )
        assert resp.estimate_id == "est-123"
        assert resp.predicted_price == 350000.0
        assert resp.currency == "USD"
        assert len(resp.feature_importance) == 3

    def test_default_currency(self):
        """Currency should default to USD."""
        resp = EstimationResponse(
            estimate_id="est-456",
            predicted_price=250000.0,
            input_features=EstimationRequest(
                square_footage=1500.0,
                bedrooms=2,
                bathrooms=1.0,
                year_built=1990,
                lot_size=5000.0,
                distance_to_city_center=10.0,
                school_rating=6.0,
            ),
            model_version="1.0.0",
            timestamp=datetime.now(timezone.utc),
            feature_importance=[],
        )
        assert resp.currency == "USD"


class TestHistoryFilter:
    """Tests for HistoryFilter model."""

    def test_defaults(self):
        """Default values should be applied when no parameters provided."""
        f = HistoryFilter()
        assert f.page == 1
        assert f.page_size == 20
        assert f.search is None
        assert f.date_from is None
        assert f.date_to is None
        assert f.price_min is None
        assert f.price_max is None

    def test_page_min(self):
        """page must be >= 1."""
        with pytest.raises(ValidationError):
            HistoryFilter(page=0)

    def test_page_size_min(self):
        """page_size must be >= 1."""
        with pytest.raises(ValidationError):
            HistoryFilter(page_size=0)

    def test_page_size_max(self):
        """page_size must be <= 100."""
        with pytest.raises(ValidationError):
            HistoryFilter(page_size=101)

    def test_with_all_filters(self):
        """All filter parameters should be accepted when valid."""
        f = HistoryFilter(
            page=2,
            page_size=50,
            search="downtown",
            date_from=date(2024, 1, 1),
            date_to=date(2024, 12, 31),
            price_min=100000.0,
            price_max=500000.0,
        )
        assert f.page == 2
        assert f.page_size == 50
        assert f.search == "downtown"
        assert f.date_from == date(2024, 1, 1)
        assert f.date_to == date(2024, 12, 31)
        assert f.price_min == 100000.0
        assert f.price_max == 500000.0

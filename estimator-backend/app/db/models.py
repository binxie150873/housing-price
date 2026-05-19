"""
SQLAlchemy ORM models for the Estimator Backend database.

Defines the estimation_history table model.

Requirements: 4.1
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Numeric, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


class EstimationHistory(Base):
    """ORM model for the estimation_history table.

    Stores past property value estimations including input features,
    predicted price, model metadata, and feature importance scores.
    """

    __tablename__ = "estimation_history"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    square_footage = Column(Numeric, nullable=False)
    bedrooms = Column(Integer, nullable=False)
    bathrooms = Column(Numeric, nullable=False)
    year_built = Column(Integer, nullable=False)
    lot_size = Column(Numeric, nullable=False)
    distance_to_city_center = Column(Numeric, nullable=False)
    school_rating = Column(Numeric, nullable=False)
    predicted_price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    model_version = Column(String(50), nullable=False)
    feature_importance = Column(JSONB, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("NOW()"),
    )

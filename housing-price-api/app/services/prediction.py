"""
Business logic layer for housing price predictions.

Orchestrates single and batch predictions by delegating to the Predictor
model wrapper and constructing typed response objects.

Requirements: 1.1, 2.1, 2.5
"""

from app.models.predictor import Predictor
from app.models.schemas import (
    BatchPredictionResponse,
    BatchRequest,
    FeatureContribution,
    HouseFeatures,
    PredictionResponse,
    SinglePrediction,
)
from app.utils.helpers import utc_now


class PredictionService:
    """Service layer that bridges HTTP routers and the ML Predictor."""

    def __init__(self, predictor: Predictor) -> None:
        self._predictor = predictor

    def predict_single(self, features: HouseFeatures) -> PredictionResponse:
        """Predict a single housing price.

        Args:
            features: Validated HouseFeatures input.

        Returns:
            PredictionResponse with predicted price, metadata, and timestamp.

        Raises:
            Any exception raised by the Predictor is propagated to the caller.
        """
        price = self._predictor.predict(features.model_dump())
        contributions = self._predictor.compute_feature_contributions(features.model_dump(), price)
        return PredictionResponse(
            predicted_price=price,
            currency="USD",
            input_features=features,
            model_version=self._predictor.get_model_info().get("model_version", "unknown"),
            timestamp=utc_now(),
            feature_importance=[FeatureContribution(**c) for c in contributions],
        )

    def predict_batch(self, request: BatchRequest) -> BatchPredictionResponse:
        """Predict housing prices for a batch of records.

        Args:
            request: Validated BatchRequest containing 1–100 HouseFeatures records.

        Returns:
            BatchPredictionResponse with predictions list and metadata.

        Raises:
            Any exception raised by the Predictor is propagated to the caller.
        """
        records_dicts = [r.model_dump() for r in request.records]
        prices = self._predictor.predict_batch(records_dicts)
        predictions = []
        for i, (price, record_dict) in enumerate(zip(prices, records_dicts)):
            contributions = self._predictor.compute_feature_contributions(record_dict, price)
            predictions.append(
                SinglePrediction(
                    record_id=i,
                    predicted_price=price,
                    feature_importance=[FeatureContribution(**c) for c in contributions],
                )
            )
        return BatchPredictionResponse(
            predictions=predictions,
            total_records=len(request.records),
            successful_predictions=len(predictions),
            model_version=self._predictor.get_model_info().get("model_version", "unknown"),
            timestamp=utc_now(),
        )

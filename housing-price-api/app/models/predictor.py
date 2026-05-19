"""
ML model wrapper for the Housing Price Prediction API.

Loads the trained sklearn Pipeline (preprocessor + LinearRegression) from disk
and provides prediction methods for single and batch inference.
The model uses a Hedonic log-linear approach: ln(Price) = β₀ + β₁·X₁ + ... + βₙ·Xₙ

Requirements: 7.5, 7.6, 3.1
"""

import json
import logging
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

MODEL_PATH = Path("model/housing_model.pkl")
METADATA_PATH = Path("model/model_metadata.json")

# Feature column order must match training pipeline expectations
NUMERICAL_FEATURES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]
FEATURE_ORDER = NUMERICAL_FEATURES


class Predictor:
    """Singleton ML model wrapper that loads and serves predictions."""

    def __init__(self) -> None:
        self._pipeline = None
        self._metadata: dict = {}
        self.is_loaded: bool = False
        self._start_time: float | None = None

    def load_model(self) -> None:
        """Load the sklearn pipeline and metadata from disk.

        Sets is_loaded=True on success. On any failure, logs the error
        and leaves is_loaded=False so health checks report unhealthy.
        """
        try:
            self._pipeline = joblib.load(MODEL_PATH)

            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                self._metadata = json.load(f)

            self.is_loaded = True
            self._start_time = time.time()
            logger.info("Model loaded successfully from %s", MODEL_PATH)
        except Exception as exc:
            logger.error("Failed to load model: %s", exc, exc_info=True)
            self.is_loaded = False

    def predict(self, features: dict) -> float:
        """Predict a single housing price from a features dictionary.

        The pipeline predicts log(price), so we exponentiate to get actual price.

        Args:
            features: Dictionary with keys matching FEATURE_ORDER.

        Returns:
            Predicted price as a float.

        Raises:
            RuntimeError: If the model is not loaded.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Cannot make predictions.")

        df = pd.DataFrame([features], columns=FEATURE_ORDER)
        # Pipeline predicts log(price), so exponentiate
        log_price = self._pipeline.predict(df)
        return float(np.exp(log_price[0]))

    def predict_batch(self, records: list[dict]) -> list[float]:
        """Predict housing prices for a batch of feature dictionaries.

        The pipeline predicts log(price), so we exponentiate to get actual prices.

        Args:
            records: List of dictionaries, each with keys matching FEATURE_ORDER.

        Returns:
            List of predicted prices as floats.

        Raises:
            RuntimeError: If the model is not loaded.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Cannot make predictions.")

        df = pd.DataFrame(records, columns=FEATURE_ORDER)
        log_prices = self._pipeline.predict(df)
        return list(np.exp(log_prices).astype(float))

    def compute_feature_contributions(self, features: dict, predicted_price: float) -> list[dict]:
        """Compute dollar contribution of each feature using Hedonic model coefficients.

        For positive-coefficient features: contribution ∝ coef × (value / scale)
        For negative-coefficient features (year_built, distance_to_city_center):
          We invert the interpretation so that "better" values show higher contributions.
          - distance: closer (smaller value) → higher contribution
          - year_built: newer (larger value) → higher contribution (inverted to show age penalty)

        Args:
            features: Dictionary with keys matching FEATURE_ORDER.
            predicted_price: The predicted price to distribute across features.

        Returns:
            List of dicts with 'feature' and 'importance' (dollar amount) keys.
        """
        try:
            model = self._pipeline.named_steps.get("model")

            if model is None or not hasattr(model, 'coef_'):
                n = len(FEATURE_ORDER)
                return [{"feature": f, "importance": round(predicted_price / n, 2)} for f in FEATURE_ORDER]

            # Get the scale factors from the pipeline's scaler
            scaler = self._pipeline.named_steps.get("preprocessor")
            scales = scaler.scale_ if scaler is not None else np.ones(len(FEATURE_ORDER))

            # Compute contributions using raw_value / scale * |coefficient|
            # For negative-coefficient features, we invert the value so that
            # "better" (closer distance, newer year) shows higher contribution
            raw_values = np.array([features[f] for f in FEATURE_ORDER], dtype=float)
            scaled_values = raw_values / scales

            abs_coefs = np.abs(model.coef_)

            # For negative-coefficient features, invert the scaled value
            # so that smaller raw values (closer, newer) produce LARGER contributions
            contributions = np.zeros(len(FEATURE_ORDER))
            for i, feature_name in enumerate(FEATURE_ORDER):
                if model.coef_[i] < 0:
                    # Invert: use (max_possible - value) to reward "better" values
                    # For distance: max ~10, so 10 - 3.6 = 6.4 (close = high contribution)
                    # For year_built: use value directly since newer = larger year = "better"
                    if feature_name == "distance_to_city_center":
                        inverted = max(10.0 - raw_values[i], 0.1) / scales[i]
                    elif feature_name == "year_built":
                        # Newer houses (higher year) should contribute more
                        inverted = (raw_values[i] - 1900) / scales[i]
                    else:
                        inverted = scaled_values[i]
                    contributions[i] = abs_coefs[i] * inverted
                else:
                    contributions[i] = abs_coefs[i] * scaled_values[i]

            total = contributions.sum()

            if total == 0:
                n = len(FEATURE_ORDER)
                return [{"feature": f, "importance": round(predicted_price / n, 2)} for f in FEATURE_ORDER]

            result = []
            for i, feature_name in enumerate(FEATURE_ORDER):
                proportion = contributions[i] / total
                dollar_amount = round(predicted_price * proportion, 2)
                result.append({"feature": feature_name, "importance": dollar_amount})

            return result
        except Exception:
            # Fallback: equal distribution
            n = len(FEATURE_ORDER)
            return [{"feature": f, "importance": round(predicted_price / n, 2)} for f in FEATURE_ORDER]

    def get_model_info(self) -> dict:
        """Return the model metadata dictionary loaded from model_metadata.json."""
        return self._metadata

    def get_uptime_seconds(self) -> float:
        """Return seconds elapsed since the model was loaded."""
        if self._start_time is None:
            return 0.0
        return time.time() - self._start_time

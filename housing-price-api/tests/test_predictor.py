"""
Unit tests for app/models/predictor.py — error handling and basic behavior.

Sub-task 5.2: Test Predictor error handling
Requirements: 7.6
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from app.models.predictor import Predictor


class TestLoadModelMissingFile:
    """Test load_model with missing file sets is_loaded = False."""

    def test_missing_model_file_sets_is_loaded_false(self, tmp_path):
        """When the model pkl file does not exist, is_loaded remains False."""
        predictor = Predictor()
        fake_model_path = tmp_path / "nonexistent.pkl"
        fake_metadata_path = tmp_path / "nonexistent.json"

        with patch("app.models.predictor.MODEL_PATH", fake_model_path), \
             patch("app.models.predictor.METADATA_PATH", fake_metadata_path):
            predictor.load_model()

        assert predictor.is_loaded is False

    def test_missing_metadata_file_sets_is_loaded_false(self, tmp_path):
        """When the metadata JSON file does not exist (but pkl exists), is_loaded remains False."""
        import joblib
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        # Create a valid pkl file but no metadata
        fake_model_path = tmp_path / "model.pkl"
        fake_metadata_path = tmp_path / "metadata.json"
        pipeline = Pipeline([("scaler", StandardScaler())])
        joblib.dump(pipeline, fake_model_path)

        predictor = Predictor()
        with patch("app.models.predictor.MODEL_PATH", fake_model_path), \
             patch("app.models.predictor.METADATA_PATH", fake_metadata_path):
            predictor.load_model()

        assert predictor.is_loaded is False


class TestLoadModelCorruptFile:
    """Test load_model with corrupt file sets is_loaded = False."""

    def test_corrupt_pkl_file_sets_is_loaded_false(self, tmp_path):
        """When the pkl file is corrupt/invalid, is_loaded remains False."""
        fake_model_path = tmp_path / "corrupt.pkl"
        fake_metadata_path = tmp_path / "metadata.json"

        # Write garbage data to the pkl file
        fake_model_path.write_bytes(b"this is not a valid pickle file!!!")
        # Write valid metadata
        fake_metadata_path.write_text(json.dumps({"model_name": "test"}), encoding="utf-8")

        predictor = Predictor()
        with patch("app.models.predictor.MODEL_PATH", fake_model_path), \
             patch("app.models.predictor.METADATA_PATH", fake_metadata_path):
            predictor.load_model()

        assert predictor.is_loaded is False

    def test_corrupt_metadata_json_sets_is_loaded_false(self, tmp_path):
        """When the metadata JSON is malformed, is_loaded remains False."""
        import joblib
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        fake_model_path = tmp_path / "model.pkl"
        fake_metadata_path = tmp_path / "metadata.json"

        # Create a valid pkl
        pipeline = Pipeline([("scaler", StandardScaler())])
        joblib.dump(pipeline, fake_model_path)
        # Write invalid JSON
        fake_metadata_path.write_text("{ this is not valid json !!!", encoding="utf-8")

        predictor = Predictor()
        with patch("app.models.predictor.MODEL_PATH", fake_model_path), \
             patch("app.models.predictor.METADATA_PATH", fake_metadata_path):
            predictor.load_model()

        assert predictor.is_loaded is False


class TestPredictRaisesWhenNotLoaded:
    """Test predict raises when is_loaded = False."""

    def test_predict_raises_runtime_error_when_not_loaded(self):
        """Calling predict on an unloaded Predictor raises RuntimeError."""
        predictor = Predictor()
        assert predictor.is_loaded is False

        with pytest.raises(RuntimeError, match="Model is not loaded"):
            predictor.predict({
                "square_footage": 1550,
                "bedrooms": 3,
                "bathrooms": 2.0,
                "year_built": 1997,
                "lot_size": 6800,
                "distance_to_city_center": 4.1,
                "school_rating": 7.6,
            })

    def test_predict_batch_raises_runtime_error_when_not_loaded(self):
        """Calling predict_batch on an unloaded Predictor raises RuntimeError."""
        predictor = Predictor()
        assert predictor.is_loaded is False

        with pytest.raises(RuntimeError, match="Model is not loaded"):
            predictor.predict_batch([{
                "square_footage": 1550,
                "bedrooms": 3,
                "bathrooms": 2.0,
                "year_built": 1997,
                "lot_size": 6800,
                "distance_to_city_center": 4.1,
                "school_rating": 7.6,
            }])


class TestGetModelInfo:
    """Test get_model_info returns metadata."""

    def test_returns_empty_dict_when_not_loaded(self):
        predictor = Predictor()
        assert predictor.get_model_info() == {}

    def test_returns_metadata_after_load(self, tmp_path):
        """After successful load, get_model_info returns the metadata dict."""
        import joblib
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        fake_model_path = tmp_path / "model.pkl"
        fake_metadata_path = tmp_path / "metadata.json"

        pipeline = Pipeline([("scaler", StandardScaler())])
        joblib.dump(pipeline, fake_model_path)

        metadata = {"model_name": "TestModel", "model_version": "0.1.0"}
        fake_metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

        predictor = Predictor()
        with patch("app.models.predictor.MODEL_PATH", fake_model_path), \
             patch("app.models.predictor.METADATA_PATH", fake_metadata_path):
            predictor.load_model()

        assert predictor.is_loaded is True
        assert predictor.get_model_info() == metadata


class TestGetUptimeSeconds:
    """Test get_uptime_seconds."""

    def test_returns_zero_when_not_loaded(self):
        predictor = Predictor()
        assert predictor.get_uptime_seconds() == 0.0

    def test_returns_positive_after_load(self, tmp_path):
        """After loading, uptime should be a positive number."""
        import time
        import joblib
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        fake_model_path = tmp_path / "model.pkl"
        fake_metadata_path = tmp_path / "metadata.json"

        pipeline = Pipeline([("scaler", StandardScaler())])
        joblib.dump(pipeline, fake_model_path)
        fake_metadata_path.write_text(json.dumps({}), encoding="utf-8")

        predictor = Predictor()
        with patch("app.models.predictor.MODEL_PATH", fake_model_path), \
             patch("app.models.predictor.METADATA_PATH", fake_metadata_path):
            predictor.load_model()

        time.sleep(0.01)
        assert predictor.get_uptime_seconds() > 0.0

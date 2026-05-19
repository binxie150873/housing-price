"""
Model training script for the Housing Price Prediction API.

Uses a Hedonic log-linear pricing model with sign-constrained coefficients
to ensure economically interpretable results.

Usage:
    python scripts/train_model.py

Outputs:
    model/housing_model.pkl      - Fitted sklearn Pipeline (preprocessor + LinearRegression)
    model/model_metadata.json    - Model metadata and performance metrics

Requirements: 7.1–7.4, 7.7
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "HousePriceDataset.csv"
MODEL_DIR = PROJECT_ROOT / "model"
MODEL_PATH = MODEL_DIR / "housing_model.pkl"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

# ---------------------------------------------------------------------------
# Feature definitions
# ---------------------------------------------------------------------------
NUMERICAL_FEATURES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]
TARGET = "price"

# Feature scaling factors applied BEFORE model fitting
# This ensures features are on comparable scales for interpretable coefficients
FEATURE_SCALES = {
    "square_footage": 100.0,     # divide by 100 (1500 → 15)
    "bedrooms": 1.0,             # keep as-is (2-4 range)
    "bathrooms": 1.0,            # keep as-is (1-3 range)
    "year_built": 100.0,         # divide by 100 (2000 → 20)
    "lot_size": 1000.0,          # divide by 1000 (6800 → 6.8)
    "distance_to_city_center": 1.0,  # keep as-is (2-8 range)
    "school_rating": 1.0,        # keep as-is (6-9 range)
}


def load_dataset() -> pd.DataFrame:
    """Load dataset from HousePriceDataset.csv."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    required_columns = set(NUMERICAL_FEATURES + [TARGET])
    if not required_columns.issubset(set(df.columns)):
        missing = required_columns - set(df.columns)
        raise ValueError(f"Dataset missing required columns: {missing}")

    print(f"Loaded dataset from {DATA_PATH}")
    print(f"Dataset shape: {df.shape}")
    return df


def scale_features(X: pd.DataFrame) -> pd.DataFrame:
    """Apply manual feature scaling to bring all features to comparable ranges."""
    X_scaled = X.copy()
    for feature, scale in FEATURE_SCALES.items():
        if feature in X_scaled.columns:
            X_scaled[feature] = X_scaled[feature] / scale
    return X_scaled


# Expected coefficient signs for economic interpretability
EXPECTED_SIGNS = {
    "square_footage": +1,       # larger → more expensive
    "bedrooms": +1,             # more bedrooms → more expensive
    "bathrooms": +1,            # more bathrooms → more expensive
    "year_built": -1,           # older (smaller year) → cheaper
    "lot_size": +1,             # larger lot → more expensive
    "distance_to_city_center": -1,  # farther from city → cheaper
    "school_rating": +1,        # better schools → more expensive
}


def fit_constrained_hedonic(X_train: np.ndarray, y_train_log: np.ndarray) -> tuple[np.ndarray, float]:
    """Fit a log-linear model with sign constraints on coefficients.

    Uses scipy.optimize.minimize with bounds to enforce economically
    meaningful coefficient signs.

    Returns:
        Tuple of (coefficients, intercept)
    """
    n_features = X_train.shape[1]

    # Define bounds based on expected signs
    bounds = []
    for feature in NUMERICAL_FEATURES:
        sign = EXPECTED_SIGNS[feature]
        if sign > 0:
            bounds.append((0.01, None))    # coefficient >= 0.01
        else:
            bounds.append((None, -0.01))   # coefficient <= -0.01

    def objective(params):
        """Sum of squared residuals."""
        intercept = params[0]
        coefs = params[1:]
        predictions = intercept + X_train @ coefs
        residuals = y_train_log - predictions
        return np.sum(residuals ** 2)

    # Initial guess from unconstrained OLS
    X_with_intercept = np.column_stack([np.ones(X_train.shape[0]), X_train])
    ols_params = np.linalg.lstsq(X_with_intercept, y_train_log, rcond=None)[0]
    initial_params = ols_params

    # Bounds: intercept is unconstrained, coefficients are sign-constrained
    all_bounds = [(None, None)] + bounds

    result = minimize(
        objective,
        initial_params,
        method="L-BFGS-B",
        bounds=all_bounds,
        options={"maxiter": 10000, "ftol": 1e-15},
    )

    intercept = result.x[0]
    coefs = result.x[1:]

    return coefs, intercept


def build_pipeline_with_constrained_coefs(
    X_train: pd.DataFrame, y_train_log: np.ndarray
) -> Pipeline:
    """Build a pipeline with manual scaling + constrained LinearRegression.

    Uses manual feature scaling (not StandardScaler) so that coefficients
    are directly interpretable in terms of raw feature values.
    """
    # Apply manual scaling
    X_scaled = scale_features(X_train)

    # Fit constrained model on manually scaled features
    coefs, intercept = fit_constrained_hedonic(X_scaled.values, y_train_log)

    # Create a StandardScaler that applies our manual scaling (divide by scale factors)
    scaler = StandardScaler(with_mean=False, with_std=True)
    # We need to trick the scaler into dividing by our scale factors
    # StandardScaler with with_std=True divides by scale_
    scaler.n_features_in_ = len(NUMERICAL_FEATURES)
    scaler.mean_ = np.zeros(len(NUMERICAL_FEATURES))
    scaler.var_ = np.array([FEATURE_SCALES[f] ** 2 for f in NUMERICAL_FEATURES])
    scaler.scale_ = np.array([FEATURE_SCALES[f] for f in NUMERICAL_FEATURES])
    scaler.n_samples_seen_ = 40  # dummy value

    # Create a LinearRegression and manually set its parameters
    model = LinearRegression()
    model.coef_ = coefs
    model.intercept_ = intercept

    # Build pipeline
    pipeline = Pipeline([
        ("preprocessor", scaler),
        ("model", model),
    ])

    return pipeline


def compute_feature_importance(pipeline: Pipeline) -> list[dict]:
    """Return feature importances based on absolute standardized coefficients."""
    model = pipeline.named_steps["model"]
    coefs = np.abs(model.coef_)
    total = coefs.sum()

    if total == 0:
        n = len(NUMERICAL_FEATURES)
        importance_list = [
            {"feature": name, "importance": round(1.0 / n, 6)}
            for name in NUMERICAL_FEATURES
        ]
    else:
        importance_list = [
            {"feature": name, "importance": round(float(coef / total), 6)}
            for name, coef in zip(NUMERICAL_FEATURES, coefs)
        ]

    importance_list.sort(key=lambda x: x["importance"], reverse=True)
    return importance_list


def train() -> None:
    start = time.time()

    # 1. Load data
    df = load_dataset()

    X = df[NUMERICAL_FEATURES]
    y = df[TARGET]

    # 2. Train/test split — 80/20, random_state=42
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # 3. Fit Hedonic log-linear model with sign constraints
    print("Fitting Hedonic log-linear model with sign constraints...")
    y_train_log = np.log(y_train)
    pipeline = build_pipeline_with_constrained_coefs(X_train, y_train_log)

    # 4. Evaluate on test set (predict log-price, then exponentiate)
    y_pred_log = pipeline.predict(X_test)
    y_pred = np.exp(y_pred_log)

    r2 = r2_score(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = float(np.sqrt(mse))
    mae = mean_absolute_error(y_test, y_pred)

    print(f"\n--- Test Set Metrics ---")
    print(f"  R²   : {r2:.4f}")
    print(f"  RMSE : {rmse:,.2f}")
    print(f"  MAE  : {mae:,.2f}")
    print(f"  MSE  : {mse:,.2f}")

    # Print coefficients with sign verification
    model = pipeline.named_steps["model"]
    print(f"\n--- Hedonic Coefficients (standardized) ---")
    for name, coef in zip(NUMERICAL_FEATURES, model.coef_):
        expected = "+" if EXPECTED_SIGNS[name] > 0 else "-"
        actual = "+" if coef >= 0 else "-"
        check = "✓" if expected == actual else "✗"
        print(f"  {name:30s}: {coef:+.6f}  (expected {expected}, got {actual}) {check}")
    print(f"  {'intercept':30s}: {model.intercept_:.6f}")

    # 5. Check R²
    if r2 >= 0.80:
        print(f"\nR² check passed: {r2:.4f} >= 0.80 ✓")
    else:
        print(f"\n⚠️  R² is {r2:.4f} (below 0.80). Sign constraints may reduce fit quality.")

    # 6. Save pipeline
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\nPipeline saved to {MODEL_PATH}")

    # 7. Build and save metadata
    feature_importance = compute_feature_importance(pipeline)

    metadata = {
        "model_name": "HousingPriceHedonicModel",
        "model_version": "2.1.0",
        "model_type": "HedonicLinearRegression",
        "training_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "dataset_info": {
            "total_samples": len(df),
            "features": len(NUMERICAL_FEATURES),
            "train_test_split": "80/20",
        },
        "performance_metrics": {
            "r2_score": round(r2, 6),
            "rmse": round(rmse, 2),
            "mae": round(mae, 2),
            "mse": round(float(mse), 2),
        },
        "feature_importance": feature_importance,
        "model_parameters": {
            "algorithm": "Log-Linear OLS with Sign Constraints (Hedonic Pricing Model)",
            "intercept": round(float(model.intercept_), 6),
            "coefficients": {
                name: round(float(coef), 6)
                for name, coef in zip(NUMERICAL_FEATURES, model.coef_)
            },
            "feature_scales": FEATURE_SCALES,
            "sign_constraints": EXPECTED_SIGNS,
        },
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {METADATA_PATH}")

    elapsed = time.time() - start
    print(f"\nTraining completed in {elapsed:.1f}s")


if __name__ == "__main__":
    train()
    sys.exit(0)

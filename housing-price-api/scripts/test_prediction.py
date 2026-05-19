"""
Test the trained model using TestDataForPrediction.csv.

Usage:
    python scripts/test_prediction.py
"""

import sys
from pathlib import Path

import pandas as pd

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.models.predictor import Predictor, FEATURE_ORDER


def main():
    test_data_path = PROJECT_ROOT / "data" / "TestDataForPrediction.csv"

    if not test_data_path.exists():
        print(f"ERROR: Test data not found at {test_data_path}")
        sys.exit(1)

    # Load test data
    df = pd.read_csv(test_data_path)
    print(f"Loaded test data: {df.shape[0]} records, {df.shape[1]} features")
    print(f"Columns: {list(df.columns)}")
    print()

    # Load model
    predictor = Predictor()
    predictor.load_model()
    if not predictor.is_loaded:
        print("ERROR: Failed to load model. Run 'python scripts/train_model.py' first.")
        sys.exit(1)

    print(f"Model loaded successfully (version: {predictor.get_model_info().get('model_version', 'unknown')})")
    print(f"Model R²: {predictor.get_model_info()['performance_metrics']['r2_score']}")
    print()

    # Run predictions
    print("=" * 70)
    print(f"{'#':<4} {'SqFt':<8} {'Bed':<5} {'Bath':<6} {'Year':<6} {'Lot':<7} {'Dist':<6} {'School':<8} {'Predicted Price':<15}")
    print("=" * 70)

    records = df.to_dict(orient="records")
    predictions = predictor.predict_batch(records)

    for i, (record, price) in enumerate(zip(records, predictions), 1):
        print(
            f"{i:<4} "
            f"{record['square_footage']:<8} "
            f"{record['bedrooms']:<5} "
            f"{record['bathrooms']:<6} "
            f"{record['year_built']:<6} "
            f"{record['lot_size']:<7} "
            f"{record['distance_to_city_center']:<6} "
            f"{record['school_rating']:<8} "
            f"${price:>12,.2f}"
        )

    print("=" * 70)
    print(f"\nTotal predictions: {len(predictions)}")
    print(f"Price range: ${min(predictions):,.2f} — ${max(predictions):,.2f}")
    print(f"Average predicted price: ${sum(predictions)/len(predictions):,.2f}")


if __name__ == "__main__":
    main()

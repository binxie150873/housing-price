# Housing Price Prediction API

An ML-powered microservice that predicts housing prices using a trained Random Forest model. Built with FastAPI, Scikit-learn, and Pydantic v2.

## Tech Stack

- **Python 3.12+**
- **FastAPI** — High-performance async web framework with auto-generated OpenAPI docs
- **Scikit-learn** — RandomForestRegressor with ColumnTransformer preprocessing pipeline
- **Pydantic v2** — Request/response validation with strict type constraints
- **Docker** — Containerized deployment using `python:3.12-slim`
- **Pytest + Hypothesis** — Unit tests and property-based testing

## Project Structure

```
housing-price-api/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── models/
│   │   ├── __init__.py
│   │   ├── predictor.py        # ML model wrapper (singleton)
│   │   └── schemas.py          # Pydantic v2 request/response schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py           # GET /health
│   │   ├── model_info.py       # GET /model-info
│   │   └── predict.py          # POST /predict, POST /predict/batch
│   ├── services/
│   │   ├── __init__.py
│   │   └── prediction.py       # Business logic layer
│   └── utils/
│       ├── __init__.py
│       └── helpers.py           # Utility functions
├── data/
│   └── HousePriceDataset.csv             # Training dataset
├── model/
│   ├── housing_model.pkl       # Trained model pipeline (generated)
│   └── model_metadata.json     # Model metadata (generated)
├── scripts/
│   ├── generate_dataset.py     # Dataset generation utility
│   └── train_model.py          # Model training script
├── tests/
│   ├── __init__.py
│   ├── test_api.py             # Integration tests
│   ├── test_helpers.py         # Unit tests for utilities
│   ├── test_predictor.py       # Unit tests for predictor
│   └── test_properties.py      # Property-based tests (Hypothesis)
├── notebooks/                  # Jupyter notebooks (exploration)
├── Dockerfile
├── .dockerignore
├── requirements.txt
└── README.md
```

## Setup Instructions

### 1. Create a virtual environment

```bash
cd housing-price-api
python -m venv venv

# Linux/macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Train the model

```bash
python scripts/train_model.py
```

This generates:
- `model/housing_model.pkl` — Trained RandomForest pipeline (preprocessor + model)
- `model/model_metadata.json` — Model metadata including performance metrics

The training script:
- Loads `data/HousePriceDataset.csv`
- Applies StandardScaler to numerical features and OneHotEncoder to categorical features
- Trains a RandomForestRegressor (100 trees, max_depth=15)
- Validates R² ≥ 0.80 on a 20% held-out test set
- Saves the fitted pipeline and metadata

## Running the API

### Local development

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Docker

### Build the image

```bash
docker build -t housing-price-api .
```

### Run the container

```bash
docker run -p 8000:8000 housing-price-api
```

The API will be accessible at `http://localhost:8000`.

## API Endpoints

### POST /predict — Single Prediction

Predict the price for a single property.

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "area": 7420,
    "bedrooms": 4,
    "bathrooms": 2,
    "stories": 3,
    "mainroad": "yes",
    "guestroom": "no",
    "basement": "no",
    "hotwaterheating": "no",
    "airconditioning": "yes",
    "parking": 2,
    "prefarea": "yes",
    "furnishingstatus": "furnished"
  }'
```

**Response (200 OK):**

```json
{
  "predicted_price": 8750000.0,
  "currency": "USD",
  "input_features": {
    "area": 7420,
    "bedrooms": 4,
    "bathrooms": 2,
    "stories": 3,
    "mainroad": "yes",
    "guestroom": "no",
    "basement": "no",
    "hotwaterheating": "no",
    "airconditioning": "yes",
    "parking": 2,
    "prefarea": "yes",
    "furnishingstatus": "furnished"
  },
  "model_version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000000Z"
}
```

### POST /predict/batch — Batch Prediction

Predict prices for multiple properties (1–100 records).

```bash
curl -X POST http://localhost:8000/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "area": 7420,
        "bedrooms": 4,
        "bathrooms": 2,
        "stories": 3,
        "mainroad": "yes",
        "guestroom": "no",
        "basement": "no",
        "hotwaterheating": "no",
        "airconditioning": "yes",
        "parking": 2,
        "prefarea": "yes",
        "furnishingstatus": "furnished"
      },
      {
        "area": 5000,
        "bedrooms": 3,
        "bathrooms": 1,
        "stories": 2,
        "mainroad": "no",
        "guestroom": "no",
        "basement": "yes",
        "hotwaterheating": "no",
        "airconditioning": "no",
        "parking": 1,
        "prefarea": "no",
        "furnishingstatus": "unfurnished"
      }
    ]
  }'
```

**Response (200 OK):**

```json
{
  "predictions": [
    { "record_id": 0, "predicted_price": 8750000.0 },
    { "record_id": 1, "predicted_price": 4200000.0 }
  ],
  "total_records": 2,
  "successful_predictions": 2,
  "model_version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000000Z"
}
```

### GET /model-info — Model Information

Retrieve metadata about the deployed model including performance metrics and feature importance.

```bash
curl http://localhost:8000/model-info
```

**Response (200 OK):**

```json
{
  "model_name": "HousingPriceRegressor",
  "model_version": "1.0.0",
  "model_type": "RandomForestRegressor",
  "training_date": "2024-01-15",
  "dataset_info": {
    "total_samples": 545,
    "features": 12,
    "train_test_split": "80/20"
  },
  "performance_metrics": {
    "r2_score": 0.85,
    "rmse": 945000.50,
    "mae": 720000.25,
    "mse": 893025002500.0
  },
  "feature_importance": [
    { "feature": "area", "importance": 0.45 },
    { "feature": "bathrooms", "importance": 0.12 }
  ],
  "model_parameters": {
    "n_estimators": 100,
    "max_depth": 15,
    "random_state": 42
  }
}
```

### GET /health — Health Check

Check the service health and model loading status.

```bash
curl http://localhost:8000/health
```

**Response (200 OK — healthy):**

```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000000Z",
  "uptime_seconds": 3600.5
}
```

**Response (503 Service Unavailable — unhealthy):**

```json
{
  "status": "unhealthy",
  "model_loaded": false,
  "timestamp": "2024-01-15T10:30:00.000000Z",
  "error": "Model file not found"
}
```

## API Documentation

This API provides interactive documentation via **Swagger UI** and **ReDoc**, auto-generated from the OpenAPI 3.1 specification. You can browse endpoints, view request/response schemas, and send test requests directly from the browser.

### Documentation URLs

| Interface | URL | Description |
|-----------|-----|-------------|
| Swagger UI | http://localhost:8000/docs | Interactive API explorer with "Try it out" functionality |
| ReDoc | http://localhost:8000/redoc | Clean, readable API reference documentation |
| OpenAPI JSON | http://localhost:8000/openapi.json | Raw OpenAPI 3.1 schema for code generation and tooling |

### Disabling Documentation in Production

Documentation endpoints can be disabled via the `ENABLE_DOCS` environment variable. When set to `"false"`, all three documentation endpoints (`/docs`, `/redoc`, `/openapi.json`) will return 404 Not Found.

```bash
# Disable documentation (e.g., in production)
export ENABLE_DOCS=false

# Enable documentation (default behavior)
export ENABLE_DOCS=true
```

By default, documentation is **enabled** (`ENABLE_DOCS=true`). Set it to `"false"` in production environments to prevent exposing internal API details.

## Running Tests

### Run all tests

```bash
pytest tests/ -v
```

### Run with coverage report

```bash
pytest tests/ --cov=app --cov-report=html --cov-fail-under=80
```

### Run specific test files

```bash
# Integration tests
pytest tests/test_api.py -v

# Property-based tests
pytest tests/test_properties.py -v

# Unit tests
pytest tests/test_helpers.py tests/test_predictor.py -v
```

## Input Features

| Feature | Type | Constraints | Description |
|---------|------|-------------|-------------|
| area | float | > 0 | Property area in square feet |
| bedrooms | int | 0–10 | Number of bedrooms |
| bathrooms | int | 0–10 | Number of bathrooms |
| stories | int | 1–4 | Number of stories |
| mainroad | string | "yes" / "no" | Connected to main road |
| guestroom | string | "yes" / "no" | Has a guest room |
| basement | string | "yes" / "no" | Has a basement |
| hotwaterheating | string | "yes" / "no" | Has hot water heating |
| airconditioning | string | "yes" / "no" | Has air conditioning |
| parking | int | 0–5 | Number of parking spaces |
| prefarea | string | "yes" / "no" | In a preferred area |
| furnishingstatus | string | "furnished" / "semi-furnished" / "unfurnished" | Furnishing status |

## Error Handling

All error responses follow a consistent envelope format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "area", "message": "Input should be greater than 0" }
    ],
    "timestamp": "2024-01-15T10:30:00.000000Z",
    "request_id": "req_a1b2c3d4"
  }
}
```

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_ERROR | 422 | Pydantic field validation failure |
| BATCH_SIZE_EXCEEDED | 400 | Batch contains more than 100 records |
| MODEL_NOT_LOADED | 503 | ML model is not loaded |
| PREDICTION_ERROR | 500 | Runtime error during prediction |
| INTERNAL_ERROR | 500 | Unexpected server error |

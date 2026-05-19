# Design Document: Housing Price Prediction API

## Overview

The Housing Price Prediction API is a stateless Python microservice that wraps a Scikit-learn RandomForestRegressor model behind a FastAPI HTTP layer. It exposes four endpoints — single prediction, batch prediction, model info, and health check — with Pydantic v2 validation, structured error handling, and auto-generated Swagger/OpenAPI documentation. The application is packaged as a Docker container using `python:3.12-slim`.

The design follows a layered architecture with clear separation between the HTTP routing layer, business logic layer, and ML model layer. The model is loaded once at startup as a singleton and shared across all requests.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                           │
│  (Swagger UI, curl, Postman, Frontend Applications)          │
└──────────────────────────────────────────────────────────────┘
                             │ HTTP
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    FastAPI Application                        │
│  app/main.py                                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Routers: /predict, /predict/batch, /model-info, /health│ │
│  │  Middleware: CORS, Request Size Limit, Error Handlers   │ │
│  │  Pydantic v2 Validation (schemas.py)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                        │
│  app/services/prediction.py                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  PredictionService                                      │ │
│  │  - predict_single(features) → PredictionResponse       │ │
│  │  - predict_batch(records) → BatchPredictionResponse    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      Model Layer                              │
│  app/models/predictor.py                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Predictor (singleton)                                  │ │
│  │  - load_model() → loads .pkl files at startup          │ │
│  │  - predict(features_dict) → float                      │ │
│  │  - predict_batch(list[dict]) → list[float]             │ │
│  │  - get_model_info() → ModelInfo                        │ │
│  │  - is_loaded: bool                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  model/housing_model.pkl   (RandomForestRegressor)           │
│  model/preprocessor.pkl    (ColumnTransformer pipeline)      │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Singleton model loading**: The `Predictor` is instantiated once at application startup via FastAPI's `lifespan` context manager. This avoids repeated disk I/O and ensures all requests share the same in-memory model object.

2. **Layered separation**: Routers delegate to `PredictionService`, which delegates to `Predictor`. This keeps HTTP concerns (status codes, request parsing) separate from ML concerns (feature preprocessing, model inference).

3. **Pydantic v2 for validation**: All input and output schemas are defined as Pydantic `BaseModel` subclasses. FastAPI automatically generates 422 responses with field-level error details when validation fails.

4. **Joblib for model persistence**: Scikit-learn models are serialized with `joblib.dump` and loaded with `joblib.load`. The preprocessor (ColumnTransformer) is serialized separately so it can be applied independently.

5. **Stateless design**: No database or session state. Every request is self-contained, enabling horizontal scaling.

---

## Components and Interfaces

### 1. `app/main.py` — Application Entry Point

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.predictor import Predictor
from app.routers import predict, model_info, health

predictor = Predictor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    predictor.load_model()   # startup
    yield
    # shutdown (no cleanup needed)

app = FastAPI(
    title="Housing Price Prediction API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
app.include_router(predict.router)
app.include_router(model_info.router)
app.include_router(health.router)
```

### 2. `app/models/schemas.py` — Pydantic Schemas

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class HouseFeatures(BaseModel):
    area: float = Field(..., gt=0, description="Area in square feet")
    bedrooms: int = Field(..., ge=0, le=10)
    bathrooms: int = Field(..., ge=0, le=10)
    stories: int = Field(..., ge=1, le=4)
    mainroad: str = Field(..., pattern="^(yes|no)$")
    guestroom: str = Field(..., pattern="^(yes|no)$")
    basement: str = Field(..., pattern="^(yes|no)$")
    hotwaterheating: str = Field(..., pattern="^(yes|no)$")
    airconditioning: str = Field(..., pattern="^(yes|no)$")
    parking: int = Field(..., ge=0, le=5)
    prefarea: str = Field(..., pattern="^(yes|no)$")
    furnishingstatus: str = Field(..., pattern="^(furnished|semi-furnished|unfurnished)$")

class BatchRequest(BaseModel):
    records: list[HouseFeatures] = Field(..., min_length=1, max_length=100)

class PredictionResponse(BaseModel):
    predicted_price: float
    currency: str = "USD"
    input_features: HouseFeatures
    model_version: str
    timestamp: datetime

class SinglePrediction(BaseModel):
    record_id: int
    predicted_price: float

class BatchPredictionResponse(BaseModel):
    predictions: list[SinglePrediction]
    total_records: int
    successful_predictions: int
    model_version: str
    timestamp: datetime

class FeatureImportance(BaseModel):
    feature: str
    importance: float

class DatasetInfo(BaseModel):
    total_samples: int
    features: int
    train_test_split: str

class PerformanceMetrics(BaseModel):
    r2_score: float
    rmse: float
    mae: float
    mse: float

class ModelParameters(BaseModel):
    n_estimators: int
    max_depth: int
    random_state: int

class ModelInfo(BaseModel):
    model_name: str
    model_version: str
    model_type: str
    training_date: str
    dataset_info: DatasetInfo
    performance_metrics: PerformanceMetrics
    feature_importance: list[FeatureImportance]
    model_parameters: ModelParameters

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: Optional[str] = None
    timestamp: datetime
    uptime_seconds: Optional[float] = None
    error: Optional[str] = None

class ErrorDetail(BaseModel):
    field: str
    message: str

class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []
    timestamp: datetime
    request_id: str

class ErrorResponse(BaseModel):
    error: ErrorBody
```

### 3. `app/models/predictor.py` — ML Model Wrapper

```python
import joblib
import numpy as np
from pathlib import Path

MODEL_PATH = Path("model/housing_model.pkl")
PREPROCESSOR_PATH = Path("model/preprocessor.pkl")

class Predictor:
    def __init__(self):
        self._model = None
        self._preprocessor = None
        self._model_info: dict = {}
        self.is_loaded: bool = False

    def load_model(self) -> None:
        """Load model and preprocessor from disk. Sets is_loaded=True on success."""
        ...

    def predict(self, features: dict) -> float:
        """Apply preprocessor then model to a single feature dict. Returns price."""
        ...

    def predict_batch(self, records: list[dict]) -> list[float]:
        """Apply preprocessor then model to a list of feature dicts."""
        ...

    def get_model_info(self) -> dict:
        """Return stored model metadata and metrics."""
        ...
```

### 4. `app/services/prediction.py` — Business Logic

```python
from app.models.predictor import Predictor
from app.models.schemas import (
    HouseFeatures, PredictionResponse, BatchRequest, BatchPredictionResponse
)

class PredictionService:
    def __init__(self, predictor: Predictor):
        self._predictor = predictor

    def predict_single(self, features: HouseFeatures) -> PredictionResponse:
        price = self._predictor.predict(features.model_dump())
        return PredictionResponse(
            predicted_price=price,
            input_features=features,
            model_version=...,
            timestamp=...,
        )

    def predict_batch(self, request: BatchRequest) -> BatchPredictionResponse:
        prices = self._predictor.predict_batch(
            [r.model_dump() for r in request.records]
        )
        predictions = [
            SinglePrediction(record_id=i, predicted_price=p)
            for i, p in enumerate(prices)
        ]
        return BatchPredictionResponse(
            predictions=predictions,
            total_records=len(request.records),
            successful_predictions=len(predictions),
            model_version=...,
            timestamp=...,
        )
```

### 5. `app/utils/helpers.py` — Utility Functions

```python
import uuid
from datetime import datetime, timezone

def generate_request_id() -> str:
    return f"req_{uuid.uuid4().hex[:8]}"

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def build_error_response(code: str, message: str, details: list = None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "timestamp": utc_now().isoformat(),
            "request_id": generate_request_id(),
        }
    }
```

### 6. Routers

- `app/routers/predict.py` — handles `POST /predict` and `POST /predict/batch`
- `app/routers/model_info.py` — handles `GET /model-info`
- `app/routers/health.py` — handles `GET /health`

Each router receives the `Predictor` singleton via FastAPI dependency injection.

---

## Data Models

### Feature Preprocessing Pipeline

The `ColumnTransformer` preprocessor applies:

| Feature | Type | Transformation |
|---------|------|----------------|
| area | float | StandardScaler |
| bedrooms | int | StandardScaler |
| bathrooms | int | StandardScaler |
| stories | int | StandardScaler |
| parking | int | StandardScaler |
| mainroad | str (yes/no) | OneHotEncoder (drop='first') |
| guestroom | str (yes/no) | OneHotEncoder (drop='first') |
| basement | str (yes/no) | OneHotEncoder (drop='first') |
| hotwaterheating | str (yes/no) | OneHotEncoder (drop='first') |
| airconditioning | str (yes/no) | OneHotEncoder (drop='first') |
| prefarea | str (yes/no) | OneHotEncoder (drop='first') |
| furnishingstatus | str (3 values) | OneHotEncoder (drop='first') |

The `ColumnTransformer` is fitted on the training set and serialized to `model/preprocessor.pkl`. At inference time, `preprocessor.transform(X)` is called before `model.predict(X)`.

### Model Metadata Schema (stored in model file or sidecar JSON)

```json
{
  "model_name": "HousingPriceRegressor",
  "model_version": "1.0.0",
  "model_type": "RandomForestRegressor",
  "training_date": "2026-05-10",
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
  "feature_importance": [...],
  "model_parameters": {
    "n_estimators": 100,
    "max_depth": 15,
    "random_state": 42
  }
}
```

This metadata is saved alongside the model as `model/model_metadata.json` and loaded by `Predictor.load_model()`.

### Request/Response Flow (Data Shapes)

```
POST /predict
  Request:  HouseFeatures (12 fields)
  Response: PredictionResponse { predicted_price, currency, input_features, model_version, timestamp }

POST /predict/batch
  Request:  BatchRequest { records: HouseFeatures[1..100] }
  Response: BatchPredictionResponse { predictions: [{record_id, predicted_price}], total_records, successful_predictions, model_version, timestamp }

GET /model-info
  Response: ModelInfo { model_name, model_version, model_type, training_date, dataset_info, performance_metrics, feature_importance, model_parameters }

GET /health
  Response: HealthResponse { status, model_loaded, model_version?, timestamp, uptime_seconds?, error? }
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid input always produces a positive predicted price

*For any* HouseFeatures instance that passes Pydantic validation (area > 0, bedrooms 0–10, bathrooms 0–10, stories 1–4, parking 0–5, valid categorical values), the Predictor SHALL return a predicted price that is a finite positive float.

**Validates: Requirements 1.1, 7.5**

---

### Property 2: Batch prediction output length matches input length

*For any* list of 1–100 valid HouseFeatures records submitted to the PredictionService, the length of the returned `predictions` array SHALL equal the number of input records, and `total_records` SHALL equal `successful_predictions`.

**Validates: Requirements 2.1, 2.5**

---

### Property 3: Single prediction and batch prediction are consistent

*For any* valid HouseFeatures record, predicting it individually via `predict_single` SHALL return the same `predicted_price` as predicting it as a single-element batch via `predict_batch`.

**Validates: Requirements 1.1, 2.1**

---

### Property 4: Invalid yes/no field values are always rejected

*For any* HouseFeatures-like dict where any yes/no field (mainroad, guestroom, basement, hotwaterheating, airconditioning, prefarea) contains a value other than "yes" or "no", Pydantic validation SHALL raise a ValidationError.

**Validates: Requirements 1.8**

---

### Property 5: Batch size boundary enforcement

*For any* list of HouseFeatures records with length > 100, the BatchRequest Pydantic model SHALL raise a ValidationError, and *for any* list with length 1–100, it SHALL succeed.

**Validates: Requirements 2.2, 2.3**

---

### Property 6: Error responses always contain required fields

*For any* request that results in an error (4xx or 5xx), the response body SHALL contain an `error` object with non-empty `code`, `message`, `timestamp`, and `request_id` fields.

**Validates: Requirements 5.1**

---

### Property 7: Health endpoint reflects model load state

*For any* application state, the `/health` endpoint response `model_loaded` field SHALL be true if and only if the Predictor's `is_loaded` attribute is true, and the HTTP status code SHALL be 200 when `model_loaded` is true and 503 when false.

**Validates: Requirements 4.1, 4.2**

---

### Property 8: Preprocessor round-trip preserves feature count

*For any* valid HouseFeatures dict, applying the preprocessor transform SHALL produce a 2D numpy array with exactly 1 row and a fixed number of columns equal to the number of features after one-hot encoding (determined at training time).

**Validates: Requirements 7.2, 7.5**

---

## Error Handling

### Error Code Taxonomy

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Pydantic field validation failure | 422 | VALIDATION_ERROR |
| Batch size > 100 | 400 | BATCH_SIZE_EXCEEDED |
| Empty batch | 400 | EMPTY_BATCH |
| Payload > 1 MB | 413 | PAYLOAD_TOO_LARGE |
| Model not loaded | 503 | MODEL_NOT_LOADED |
| Prediction runtime error | 500 | PREDICTION_ERROR |
| Unexpected server error | 500 | INTERNAL_ERROR |

### Global Exception Handlers

Registered in `app/main.py` using FastAPI's `@app.exception_handler`:

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Map Pydantic errors to ErrorResponse with VALIDATION_ERROR code
    ...

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    # Return 500 with INTERNAL_ERROR, log full traceback server-side
    ...
```

### Model Loading Failure

If `Predictor.load_model()` raises any exception at startup:
- Log the full exception with traceback (server-side only)
- Set `predictor.is_loaded = False`
- The application continues to start (does not crash)
- All prediction endpoints return 503 with MODEL_NOT_LOADED
- The health endpoint returns 503 with `model_loaded: false`

### Sensitive Data Policy

- Stack traces are logged server-side only, never included in HTTP responses
- File paths, internal variable names, and model internals are excluded from error bodies
- Input feature values may be echoed back in success responses (they are not sensitive)

---

## Testing Strategy

### Overview

The testing strategy uses a dual approach: **unit tests** for isolated component logic and **property-based tests** for universal correctness properties. Both are complementary.

### Test Framework and Libraries

| Library | Purpose |
|---------|---------|
| `pytest` | Test runner and fixture management |
| `pytest-cov` | Coverage measurement (target ≥ 80%) |
| `hypothesis` | Property-based testing (PBT) library |
| `httpx` / `fastapi.testclient` | Integration testing of FastAPI endpoints |
| `pytest-mock` | Mocking for unit tests |

### Unit Tests (`tests/test_model.py`)

Focus areas:
- `HouseFeatures` validation: valid inputs, each invalid field type, boundary values
- `BatchRequest` validation: size 1, size 100, size 101, empty list
- `Predictor.load_model()`: success path, missing file, corrupt file
- `Predictor.predict()`: correct output type (float), exception propagation
- `PredictionService.predict_single()`: correct response shape
- `PredictionService.predict_batch()`: correct response shape, length invariant
- `helpers.py`: `generate_request_id`, `utc_now`, `build_error_response`

### Integration Tests (`tests/test_api.py`)

One test per endpoint per scenario:

| Endpoint | Scenarios |
|----------|-----------|
| POST /predict | Valid input → 200; invalid area → 422; invalid yes/no → 422; model not loaded → 503 |
| POST /predict/batch | Valid 1 record → 200; valid 100 records → 200; 101 records → 400; empty → 400; invalid record → 422 |
| GET /model-info | Model loaded → 200 with correct schema; model not loaded → 503 |
| GET /health | Model loaded → 200 healthy; model not loaded → 503 unhealthy |

### Property-Based Tests (`tests/test_properties.py`)

Using `hypothesis` with minimum 100 iterations per property:

| Property | Hypothesis Strategy |
|----------|---------------------|
| Property 1: Valid input → positive price | `st.builds(HouseFeatures, area=st.floats(min_value=0.01, max_value=1e7), ...)` |
| Property 2: Batch length invariant | `st.lists(valid_house_features_strategy(), min_size=1, max_size=100)` |
| Property 3: Single == batch[0] consistency | `st.builds(HouseFeatures, ...)` |
| Property 4: Invalid yes/no rejected | `st.text().filter(lambda s: s not in ("yes", "no"))` |
| Property 5: Batch size boundary | `st.integers(min_value=101, max_value=500)` for rejection; `st.integers(1, 100)` for acceptance |
| Property 6: Error response structure | Trigger errors with invalid inputs, verify response schema |
| Property 7: Health reflects load state | Toggle `predictor.is_loaded`, verify response |
| Property 8: Preprocessor output shape | `st.builds(HouseFeatures, ...)` → verify transform output shape |

Each property test is tagged with a comment:
```python
# Feature: housing-price-api, Property N: <property_text>
@settings(max_examples=100)
@given(...)
def test_property_N_...(features):
    ...
```

### Coverage Requirements

```bash
# Run all tests with coverage
pytest tests/ --cov=app --cov-report=html --cov-fail-under=80

# Run property tests only
pytest tests/test_properties.py -v

# Run integration tests only
pytest tests/test_api.py -v
```

### Model Training Tests (`notebooks/` or `tests/test_training.py`)

- Verify R² ≥ 0.80 on held-out test set
- Verify model file is created at expected path
- Verify preprocessor file is created at expected path
- Verify metadata JSON contains all required keys

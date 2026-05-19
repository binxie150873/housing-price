# Implementation Plan: Housing Price Prediction API

## Overview

Implement a FastAPI-based housing price prediction microservice using Python 3.12+, Scikit-learn RandomForestRegressor, and Pydantic v2. The implementation follows the layered architecture defined in the design document: Pydantic schemas → Predictor (model wrapper) → PredictionService (business logic) → FastAPI routers. The model training notebook/script is built first, then the API layer, then tests, then Docker packaging.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create the directory layout as defined in PRD section 3.3: `app/`, `app/models/`, `app/services/`, `app/utils/`, `app/routers/`, `model/`, `notebooks/`, `tests/`
  - Create all `__init__.py` files
  - Create `requirements.txt` with pinned versions: `fastapi==0.111.0`, `uvicorn[standard]==0.29.0`, `scikit-learn==1.4.2`, `pydantic==2.7.1`, `joblib==1.4.0`, `numpy==1.26.4`, `pandas==2.2.2`, `pytest==8.2.0`, `pytest-cov==5.0.0`, `hypothesis==6.100.0`, `httpx==0.27.0`, `pytest-mock==3.14.0`
  - _Requirements: 8.1, 9.1_

- [x] 2. Implement Pydantic schemas (`app/models/schemas.py`)
  - Implement `HouseFeatures` with all 12 fields and their Field constraints (area gt=0, bedrooms ge=0 le=10, bathrooms ge=0 le=10, stories ge=1 le=4, parking ge=0 le=5, yes/no pattern fields, furnishingstatus pattern)
  - Implement `BatchRequest` with `records: list[HouseFeatures]` and `min_length=1, max_length=100`
  - Implement `PredictionResponse`, `SinglePrediction`, `BatchPredictionResponse`, `ModelInfo` (with nested `DatasetInfo`, `PerformanceMetrics`, `FeatureImportance`, `ModelParameters`), `HealthResponse`, `ErrorDetail`, `ErrorBody`, `ErrorResponse`
  - Add `model_config = ConfigDict(json_schema_extra={"example": {...}})` to `HouseFeatures` and `BatchRequest` for Swagger examples
  - _Requirements: 1.1–1.9, 2.1–2.4, 3.1, 4.1, 5.1_

  - [x]* 2.1 Write property tests for HouseFeatures validation
    - **Property 4: Invalid yes/no field values are always rejected**
    - **Validates: Requirements 1.8**
    - Use `hypothesis` `st.text().filter(lambda s: s not in ("yes", "no"))` for yes/no fields
    - **Property 5: Batch size boundary enforcement**
    - **Validates: Requirements 2.2, 2.3**
    - Use `st.integers(min_value=101, max_value=500)` to generate oversized batches
    - `# Feature: housing-price-api, Property 4: Invalid yes/no field values are always rejected`
    - `# Feature: housing-price-api, Property 5: Batch size boundary enforcement`

- [x] 3. Implement utility functions (`app/utils/helpers.py`)
  - Implement `generate_request_id() -> str` returning `f"req_{uuid.uuid4().hex[:8]}"`
  - Implement `utc_now() -> datetime` returning `datetime.now(timezone.utc)`
  - Implement `build_error_response(code, message, details=None) -> dict` returning the standard error envelope
  - _Requirements: 5.1_

  - [x]* 3.1 Write unit tests for helpers
    - Test `generate_request_id` returns strings starting with "req_" and are unique across calls
    - Test `utc_now` returns a timezone-aware datetime
    - Test `build_error_response` returns dict with all required keys: `error.code`, `error.message`, `error.details`, `error.timestamp`, `error.request_id`
    - _Requirements: 5.1_

- [x] 4. Implement model training script (`notebooks/model_training.ipynb` or `scripts/train_model.py`)
  - Load the housing dataset (CSV) into a pandas DataFrame
  - Define numerical features: `["area", "bedrooms", "bathrooms", "stories", "parking"]` and categorical features: `["mainroad", "guestroom", "basement", "hotwaterheating", "airconditioning", "prefarea", "furnishingstatus"]`
  - Build a `ColumnTransformer` with `StandardScaler` for numerical and `OneHotEncoder(drop='first', sparse_output=False)` for categorical features
  - Build a `Pipeline([("preprocessor", column_transformer), ("model", RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_split=5, min_samples_leaf=2, random_state=42))])`
  - Split data 80/20 with `random_state=42`, fit the pipeline on training data
  - Evaluate on test set: compute R², RMSE, MAE, MSE; assert R² >= 0.80
  - Save the fitted pipeline (or separate preprocessor and model) to `model/housing_model.pkl` using `joblib.dump`
  - Save model metadata to `model/model_metadata.json` including all fields required by `ModelInfo` schema
  - ⚠️ **NOTE**: The training script is implemented but the model has NOT been trained yet. Before proceeding to Task 5, the user must run: `cd housing-price-api && python scripts/train_model.py` to generate `model/housing_model.pkl` and `model/model_metadata.json`.
  - _Requirements: 7.1–7.4, 7.7_

- [ ] 5. Implement the Predictor model wrapper (`app/models/predictor.py`)
  - Define `MODEL_PATH = Path("model/housing_model.pkl")` and `METADATA_PATH = Path("model/model_metadata.json")`
  - Implement `Predictor` class with `__init__` setting `self._pipeline = None`, `self._metadata = {}`, `self.is_loaded = False`, `self._start_time = None`
  - Implement `load_model(self) -> None`: use `joblib.load` to load the pipeline, load metadata JSON, set `self.is_loaded = True`, record `self._start_time = time.time()`. Catch all exceptions, log them, and leave `is_loaded = False`
  - Implement `predict(self, features: dict) -> float`: convert features dict to a single-row DataFrame with correct column order, call `self._pipeline.predict(df)`, return `float(result[0])`
  - Implement `predict_batch(self, records: list[dict]) -> list[float]`: convert list of dicts to DataFrame, call `self._pipeline.predict(df)`, return `list(result.astype(float))`
  - Implement `get_model_info(self) -> dict`: return `self._metadata`
  - Implement `get_uptime_seconds(self) -> float`: return `time.time() - self._start_time`
  - _Requirements: 7.5, 7.6, 3.1_

  - [ ]* 5.1 Write property tests for Predictor
    - **Property 1: Valid input always produces a positive predicted price**
    - **Validates: Requirements 1.1, 7.5**
    - Use `st.builds(HouseFeatures, area=st.floats(min_value=0.01, max_value=1e6), bedrooms=st.integers(0,10), ...)` to generate valid inputs
    - Verify `predictor.predict(features.model_dump())` returns a finite positive float
    - **Property 8: Preprocessor output shape invariant**
    - **Validates: Requirements 7.2, 7.5**
    - Verify that for any valid HouseFeatures, the pipeline's preprocessor step produces a 2D array with 1 row
    - `# Feature: housing-price-api, Property 1: Valid input always produces a positive predicted price`
    - `# Feature: housing-price-api, Property 8: Preprocessor output shape invariant`

  - [ ]* 5.2 Write unit tests for Predictor error handling
    - Test `load_model` with missing file sets `is_loaded = False`
    - Test `load_model` with corrupt file sets `is_loaded = False`
    - Test `predict` raises when `is_loaded = False`
    - _Requirements: 7.6_

- [ ] 6. Implement PredictionService (`app/services/prediction.py`)
  - Implement `PredictionService.__init__(self, predictor: Predictor)`
  - Implement `predict_single(self, features: HouseFeatures) -> PredictionResponse`: call `self._predictor.predict(features.model_dump())`, construct and return `PredictionResponse`
  - Implement `predict_batch(self, request: BatchRequest) -> BatchPredictionResponse`: call `self._predictor.predict_batch([r.model_dump() for r in request.records])`, construct `SinglePrediction` list, return `BatchPredictionResponse`
  - Both methods should propagate exceptions from the Predictor (caught at the router level)
  - _Requirements: 1.1, 2.1, 2.5_

  - [ ]* 6.1 Write property tests for PredictionService
    - **Property 2: Batch prediction output length matches input length**
    - **Validates: Requirements 2.1, 2.5**
    - Use `st.lists(valid_house_features_strategy(), min_size=1, max_size=100)` and verify `len(response.predictions) == len(input_records)` and `total_records == successful_predictions`
    - **Property 3: Single prediction and batch prediction are consistent**
    - **Validates: Requirements 1.1, 2.1**
    - For any valid HouseFeatures, verify `predict_single(f).predicted_price == predict_batch(BatchRequest(records=[f])).predictions[0].predicted_price`
    - `# Feature: housing-price-api, Property 2: Batch prediction output length matches input length`
    - `# Feature: housing-price-api, Property 3: Single prediction and batch prediction are consistent`

- [x] 7. Implement FastAPI routers
  - [ ] 7.1 Implement prediction router (`app/routers/predict.py`)
    - Create `APIRouter` with prefix="" (no prefix, endpoints at root)
    - Implement `POST /predict`: accept `HouseFeatures`, call `PredictionService.predict_single`, return `PredictionResponse`. Catch exceptions from Predictor and return 500 with PREDICTION_ERROR. If model not loaded, return 503 with MODEL_NOT_LOADED.
    - Implement `POST /predict/batch`: accept `BatchRequest`, call `PredictionService.predict_batch`, return `BatchPredictionResponse`. Same error handling as above.
    - _Requirements: 1.1, 1.10, 2.1, 2.2, 2.3, 2.6_

  - [ ] 7.2 Implement model-info router (`app/routers/model_info.py`)
    - Implement `GET /model-info`: check `predictor.is_loaded`, if False return 503 with MODEL_NOT_LOADED. Otherwise call `predictor.get_model_info()`, construct and return `ModelInfo`.
    - _Requirements: 3.1, 3.3_

  - [ ] 7.3 Implement health router (`app/routers/health.py`)
    - Implement `GET /health`: if `predictor.is_loaded`, return HTTP 200 with `HealthResponse(status="healthy", model_loaded=True, ...)`. Otherwise return HTTP 503 with `HealthResponse(status="unhealthy", model_loaded=False, error=...)`.
    - _Requirements: 4.1, 4.2_

- [ ] 8. Implement FastAPI application entry point (`app/main.py`)
  - Create `Predictor` singleton instance
  - Define `lifespan` async context manager that calls `predictor.load_model()` on startup
  - Create `FastAPI` app with `title`, `version`, `description`, and `lifespan`
  - Add `CORSMiddleware` with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`
  - Add request body size limit middleware (reject payloads > 1 MB with HTTP 413)
  - Register `RequestValidationError` exception handler that maps Pydantic errors to `ErrorResponse` with code "VALIDATION_ERROR"
  - Register generic `Exception` handler that returns HTTP 500 with code "INTERNAL_ERROR" (log full traceback server-side, never in response)
  - Include all three routers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

- [ ] 9. Checkpoint — verify core API functionality
  - Ensure all tests pass, ask the user if questions arise.
  - Run `pytest tests/ -v` and confirm no failures
  - Manually verify `uvicorn main:app --reload` starts without errors and `/docs` is accessible

- [ ] 10. Write integration tests (`tests/test_api.py`)
  - Use `fastapi.testclient.TestClient` with the app
  - Test `POST /predict` with valid input → HTTP 200, correct response schema
  - Test `POST /predict` with `area=0` → HTTP 422
  - Test `POST /predict` with invalid yes/no field → HTTP 422
  - Test `POST /predict` with missing required field → HTTP 422
  - Test `POST /predict/batch` with 1 valid record → HTTP 200
  - Test `POST /predict/batch` with 100 valid records → HTTP 200, `len(predictions) == 100`
  - Test `POST /predict/batch` with 101 records → HTTP 400, code "BATCH_SIZE_EXCEEDED"
  - Test `POST /predict/batch` with empty records → HTTP 400
  - Test `POST /predict/batch` with one invalid record → HTTP 422
  - Test `GET /model-info` → HTTP 200, all required fields present, `r2_score >= 0.80`
  - Test `GET /health` → HTTP 200, `status == "healthy"`, `model_loaded == true`
  - Test `GET /docs` → HTTP 200
  - Test `GET /openapi.json` → HTTP 200, JSON with `openapi` field
  - Test model-not-loaded scenario: mock `predictor.is_loaded = False`, verify `/predict` → 503, `/model-info` → 503, `/health` → 503
  - _Requirements: 9.2, 9.3_

  - [ ]* 10.1 Write property tests for error response structure
    - **Property 6: Error responses always contain required fields**
    - **Validates: Requirements 5.1**
    - Generate various invalid inputs (invalid area, invalid yes/no, oversized batch), verify every error response contains `error.code`, `error.message`, `error.timestamp`, `error.request_id`
    - Also verify no response body contains stack trace keywords ("Traceback", "File ", "line ")
    - **Property 7: Health endpoint reflects model load state**
    - **Validates: Requirements 4.1, 4.2**
    - Toggle `predictor.is_loaded` between True and False, verify HTTP status and `model_loaded` field always match
    - `# Feature: housing-price-api, Property 6: Error responses always contain required fields`
    - `# Feature: housing-price-api, Property 7: Health endpoint reflects model load state`

- [ ] 11. Verify test coverage
  - Run `pytest tests/ --cov=app --cov-report=html --cov-fail-under=80`
  - If coverage is below 80%, add targeted unit tests for uncovered branches in `predictor.py`, `prediction.py`, or `helpers.py`
  - _Requirements: 9.1, 9.4, 9.5_

- [ ] 12. Create Docker configuration
  - Create `Dockerfile` using `FROM python:3.12-slim`, `WORKDIR /app`, `COPY requirements.txt .`, `RUN pip install --no-cache-dir -r requirements.txt`, `COPY app/ ./app/`, `COPY model/ ./model/`, `EXPOSE 8000`, `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
  - Create `.dockerignore` excluding: `notebooks/`, `tests/`, `*.pyc`, `__pycache__/`, `.git/`, `.gitignore`, `*.md`, `htmlcov/`, `.pytest_cache/`
  - _Requirements: 8.1, 8.4_

- [ ] 13. Create README.md
  - Document project structure, setup instructions, training steps, Docker build/run commands, and example curl requests for all four endpoints
  - Include Swagger UI access instructions
  - _Requirements: 8.3_

- [ ] 14. Final checkpoint — full validation
  - Ensure all tests pass, ask the user if questions arise.
  - Run `pytest tests/ --cov=app --cov-fail-under=80 -v` and confirm all pass with ≥ 80% coverage
  - Build Docker image: `docker build -t housing-price-api .`
  - Verify image builds without errors
  - _Requirements: 8.2, 9.1, 9.4_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"]
    },
    {
      "wave": 2,
      "tasks": ["2", "3", "4"]
    },
    {
      "wave": 3,
      "tasks": ["5", "6"]
    },
    {
      "wave": 4,
      "tasks": ["7"]
    },
    {
      "wave": 5,
      "tasks": ["8"]
    },
    {
      "wave": 6,
      "tasks": ["9"]
    },
    {
      "wave": 7,
      "tasks": ["10"]
    },
    {
      "wave": 8,
      "tasks": ["11"]
    },
    {
      "wave": 9,
      "tasks": ["12"]
    },
    {
      "wave": 10,
      "tasks": ["13"]
    },
    {
      "wave": 11,
      "tasks": ["14"]
    }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but are strongly recommended for interview quality
- The model training (Task 4) must be completed before Tasks 5–8 since the API depends on the `.pkl` files
- Property tests use `hypothesis` with `@settings(max_examples=100)` — each property test runs at least 100 random iterations
- Each property test file includes a comment tag: `# Feature: housing-price-api, Property N: <property_text>`
- The `Predictor` singleton is shared via FastAPI dependency injection — pass it through router constructors or use `app.state`
- All error responses follow the standard envelope: `{"error": {"code": ..., "message": ..., "details": [...], "timestamp": ..., "request_id": ...}}`
- Sensitive data (stack traces, file paths) must never appear in HTTP responses — log them server-side only

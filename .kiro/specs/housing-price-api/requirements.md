# Requirements Document

## Introduction

The Housing Price Prediction API is a machine learning microservice that provides real-time and batch housing price predictions based on property features. Built with Python 3.12+, FastAPI, and Scikit-learn (RandomForestRegressor), the service exposes RESTful endpoints for prediction, model information, and health monitoring. It is containerized with Docker and ships with auto-generated Swagger/OpenAPI documentation for interactive testing. The primary use case is a live technical demonstration with interview-ready deployment.

## Glossary

- **API**: Application Programming Interface — the set of HTTP endpoints exposed by this service.
- **FastAPI**: Modern Python web framework used as the HTTP layer.
- **Pydantic**: Data validation library (v2) used to validate and parse request/response schemas.
- **Predictor**: The ML model wrapper component that loads the serialized model and executes predictions.
- **PredictionService**: The business-logic layer that orchestrates single and batch predictions.
- **HouseFeatures**: The Pydantic input schema representing a single housing record.
- **BatchRequest**: The Pydantic input schema wrapping an array of HouseFeatures records.
- **PredictionResponse**: The Pydantic output schema for a single prediction result.
- **BatchPredictionResponse**: The Pydantic output schema for a batch prediction result.
- **ModelInfo**: The Pydantic output schema for model metadata and performance metrics.
- **HealthResponse**: The Pydantic output schema for the health check endpoint.
- **RandomForestRegressor**: The Scikit-learn algorithm used to train the housing price model.
- **R² Score**: Coefficient of determination measuring model fit quality (target ≥ 0.80).
- **RMSE**: Root Mean Squared Error — model error metric in the same units as the target variable.
- **MAE**: Mean Absolute Error — average absolute difference between predicted and actual prices.
- **Docker**: Container platform used to package and run the application.
- **Swagger UI**: Interactive browser-based API documentation served at `/docs`.
- **OpenAPI**: Machine-readable API specification served at `/openapi.json`.

---

## Requirements

### Requirement 1: Single Price Prediction

**User Story:** As an API consumer, I want to submit a single set of housing features and receive a predicted price, so that I can obtain real-time valuations for individual properties.

#### Acceptance Criteria

1. WHEN a client sends a valid POST request to `/predict` with a JSON body conforming to the HouseFeatures schema, THE API SHALL return HTTP 200 with a PredictionResponse containing a `predicted_price` (float), `currency` ("USD"), `input_features` (echo of the submitted features), `model_version` (string), and `timestamp` (ISO 8601 UTC).
2. WHEN a client sends a POST request to `/predict` with one or more fields that fail Pydantic validation, THE API SHALL return HTTP 422 with a structured error body listing each failing field and its violation message.
3. WHEN a client sends a POST request to `/predict` with an `area` value that is not greater than 0, THE API SHALL return HTTP 422 with an error indicating the `area` field constraint violation.
4. WHEN a client sends a POST request to `/predict` with a `bedrooms` value outside the range 0–10, THE API SHALL return HTTP 422 with an error indicating the `bedrooms` field constraint violation.
5. WHEN a client sends a POST request to `/predict` with a `bathrooms` value outside the range 0–10, THE API SHALL return HTTP 422 with an error indicating the `bathrooms` field constraint violation.
6. WHEN a client sends a POST request to `/predict` with a `stories` value outside the range 1–4, THE API SHALL return HTTP 422 with an error indicating the `stories` field constraint violation.
7. WHEN a client sends a POST request to `/predict` with a `parking` value outside the range 0–5, THE API SHALL return HTTP 422 with an error indicating the `parking` field constraint violation.
8. WHEN a client sends a POST request to `/predict` with a yes/no field (mainroad, guestroom, basement, hotwaterheating, airconditioning, prefarea) containing a value other than "yes" or "no", THE API SHALL return HTTP 422 with an error indicating the field constraint violation.
9. WHEN a client sends a POST request to `/predict` with a `furnishingstatus` value other than "furnished", "semi-furnished", or "unfurnished", THE API SHALL return HTTP 422 with an error indicating the field constraint violation.
10. IF the Predictor raises an exception during prediction, THEN THE API SHALL return HTTP 500 with an error body containing error code "PREDICTION_ERROR" and a non-sensitive message.

---

### Requirement 2: Batch Price Prediction

**User Story:** As an API consumer, I want to submit multiple housing records in a single request and receive predictions for all of them, so that I can efficiently process large sets of properties without making repeated individual calls.

#### Acceptance Criteria

1. WHEN a client sends a valid POST request to `/predict/batch` with a BatchRequest containing 1–100 HouseFeatures records, THE API SHALL return HTTP 200 with a BatchPredictionResponse containing a `predictions` array (each element with `record_id` and `predicted_price`), `total_records`, `successful_predictions`, `model_version`, and `timestamp`.
2. WHEN a client sends a POST request to `/predict/batch` with a `records` array containing more than 100 items, THE API SHALL return HTTP 400 with an error body containing error code "BATCH_SIZE_EXCEEDED".
3. WHEN a client sends a POST request to `/predict/batch` with an empty `records` array, THE API SHALL return HTTP 400 with an error body indicating the batch must contain at least 1 record.
4. WHEN a client sends a POST request to `/predict/batch` where one or more records fail Pydantic field validation, THE API SHALL return HTTP 422 with a structured error body identifying each failing record index and field.
5. WHEN a valid batch request is processed, THE PredictionService SHALL process all records atomically — either all predictions succeed and are returned, or the entire request fails with HTTP 500.
6. IF the Predictor raises an exception during batch processing, THEN THE API SHALL return HTTP 500 with an error body containing error code "PREDICTION_ERROR".

---

### Requirement 3: Model Information

**User Story:** As an API consumer or interviewer, I want to retrieve metadata and performance metrics about the deployed model, so that I can understand the model's characteristics and validate its quality.

#### Acceptance Criteria

1. WHEN a client sends a GET request to `/model-info`, THE API SHALL return HTTP 200 with a ModelInfo response containing `model_name`, `model_version`, `model_type` ("RandomForestRegressor"), `training_date`, `dataset_info` (total_samples, features count, train_test_split), `performance_metrics` (r2_score, rmse, mae, mse), `feature_importance` (list of feature/importance pairs), and `model_parameters` (n_estimators, max_depth, random_state).
2. WHILE the model is loaded, THE API SHALL return `r2_score` ≥ 0.80 in the `performance_metrics` field of the `/model-info` response.
3. IF the model is not loaded when `/model-info` is requested, THEN THE API SHALL return HTTP 503 with an error body containing error code "MODEL_NOT_LOADED".

---

### Requirement 4: Health Check

**User Story:** As a DevOps engineer or load balancer, I want a lightweight health check endpoint, so that I can verify the service is running and the model is ready to serve predictions.

#### Acceptance Criteria

1. WHEN a client sends a GET request to `/health` and the model is loaded, THE API SHALL return HTTP 200 with a HealthResponse containing `status` ("healthy"), `model_loaded` (true), `model_version`, `timestamp` (ISO 8601 UTC), and `uptime_seconds`.
2. WHEN a client sends a GET request to `/health` and the model is not loaded, THE API SHALL return HTTP 503 with a HealthResponse containing `status` ("unhealthy"), `model_loaded` (false), and `error` describing the failure.
3. THE health endpoint SHALL respond within 100ms under normal operating conditions.

---

### Requirement 5: Input Validation and Error Handling

**User Story:** As an API consumer, I want clear, structured error messages when my requests are invalid, so that I can quickly diagnose and correct problems without guessing.

#### Acceptance Criteria

1. THE API SHALL return all error responses in a standard JSON structure containing `error.code`, `error.message`, `error.details` (array of field-level messages where applicable), `error.timestamp`, and `error.request_id`.
2. WHEN a request payload exceeds 1 MB, THE API SHALL return HTTP 413 with an error body containing error code "PAYLOAD_TOO_LARGE".
3. THE API SHALL sanitize all string inputs to prevent injection attacks before passing them to the Predictor.
4. THE API SHALL exclude sensitive internal details (stack traces, file paths, internal variable names) from all error response bodies.

---

### Requirement 6: API Documentation

**User Story:** As a developer or technical interviewer, I want interactive Swagger UI documentation, so that I can explore and test the API directly from a browser without additional tooling.

#### Acceptance Criteria

1. WHEN a client navigates to `/docs`, THE API SHALL serve the Swagger UI with all four prediction/info/health endpoints listed, including example request bodies and response schemas.
2. WHEN a client requests `/openapi.json`, THE API SHALL return the OpenAPI 3.0 specification document describing all endpoints, schemas, and error responses.
3. THE API SHALL include example request payloads in the OpenAPI schema for the `/predict` and `/predict/batch` endpoints.

---

### Requirement 7: Model Training and Persistence

**User Story:** As an ML engineer, I want the model to be trained on the housing dataset and persisted to disk, so that the API can load it at startup without retraining on every launch.

#### Acceptance Criteria

1. THE training pipeline SHALL train a RandomForestRegressor with n_estimators=100, max_depth=15, min_samples_split=5, min_samples_leaf=2, and random_state=42 on the housing dataset.
2. THE training pipeline SHALL apply one-hot encoding to categorical features (mainroad, guestroom, basement, hotwaterheating, airconditioning, prefarea, furnishingstatus) and StandardScaler to numerical features (area, bedrooms, bathrooms, stories, parking).
3. THE training pipeline SHALL use an 80/20 train-test split with random_state=42.
4. THE trained model and preprocessor SHALL be serialized and saved as `model/housing_model.pkl` and `model/preprocessor.pkl` respectively using joblib.
5. WHEN the API starts, THE Predictor SHALL load `housing_model.pkl` and `preprocessor.pkl` from disk as a singleton and make them available to the PredictionService.
6. IF the model files are missing or corrupt at startup, THEN THE Predictor SHALL log the error and set the model state to "not loaded", causing health checks to return HTTP 503.
7. THE trained model SHALL achieve R² ≥ 0.80 on the held-out test set.

---

### Requirement 8: Docker Containerization

**User Story:** As a DevOps engineer, I want the application packaged as a Docker container, so that it can be deployed consistently across environments without dependency conflicts.

#### Acceptance Criteria

1. THE repository SHALL contain a Dockerfile that uses `python:3.12-slim` as the base image, installs dependencies from `requirements.txt`, copies the `app/` and `model/` directories, exposes port 8000, and starts the server with `uvicorn main:app --host 0.0.0.0 --port 8000`.
2. WHEN the Docker image is built with `docker build -t housing-price-api .`, THE build SHALL complete without errors.
3. WHEN the container is started with `docker run -p 8000:8000 housing-price-api`, THE API SHALL be accessible at `http://localhost:8000` and the Swagger UI at `http://localhost:8000/docs`.
4. THE repository SHALL contain a `.dockerignore` file that excludes `notebooks/`, `tests/`, `*.pyc`, `__pycache__/`, and `.git/` from the Docker build context.

---

### Requirement 9: Testing

**User Story:** As a QA engineer, I want comprehensive automated tests, so that I can verify correctness of the API endpoints and model wrapper with confidence.

#### Acceptance Criteria

1. THE test suite SHALL achieve ≥ 80% line coverage across the `app/` package as measured by pytest-cov.
2. THE test suite SHALL include unit tests for: HouseFeatures Pydantic validation (valid and invalid inputs), BatchRequest validation (size limits), PredictionService single and batch prediction logic, and Predictor model loading and error handling.
3. THE test suite SHALL include integration tests for all four API endpoints (POST /predict, POST /predict/batch, GET /model-info, GET /health) covering success cases and error cases.
4. WHEN `pytest tests/ -v` is executed, THE test suite SHALL complete without failures.
5. WHEN `pytest tests/ --cov=app --cov-report=html` is executed, THE coverage report SHALL show ≥ 80% line coverage.

---

### Requirement 10: Performance

**User Story:** As a system operator, I want the API to meet defined response time targets, so that it can serve real-time prediction requests within acceptable latency bounds.

#### Acceptance Criteria

1. WHEN a single POST /predict request is processed under normal load, THE API SHALL respond within 200ms at the p95 percentile.
2. WHEN a POST /predict/batch request with 100 records is processed under normal load, THE API SHALL respond within 2000ms at the p95 percentile.
3. WHEN a GET /health request is processed, THE API SHALL respond within 50ms at the p95 percentile.
4. THE API SHALL support at least 50 concurrent connections without returning HTTP 5xx errors.

# Requirements Document

## Introduction

This document defines the requirements for the Housing Price Prediction Model API — a RESTful web service that exposes a machine learning regression model trained on housing dataset features. The API enables clients to submit house attribute data and receive predicted sale prices. It is containerized with Docker, provides interactive Swagger documentation, and includes health monitoring, batch prediction, and model introspection endpoints.

## Glossary

- **API**: The Housing Price Prediction REST API service built with FastAPI.
- **Predictor**: The trained RandomForestRegressor model component responsible for generating price predictions.
- **Preprocessor**: The scikit-learn pipeline component that encodes categorical features and scales numerical features before inference.
- **HouseFeatures**: The validated input schema representing a single house's attributes.
- **PredictionResponse**: The output schema returned by the API for a single prediction request.
- **BatchPredictionResponse**: The output schema returned by the API for a batch prediction request.
- **ModelInfo**: The schema describing model metadata, training parameters, and performance metrics.
- **HealthStatus**: The schema describing the current operational state of the API service.
- **ErrorResponse**: The standardized error schema returned when a request cannot be fulfilled.
- **Client**: Any HTTP consumer of the API (e.g., web application, data pipeline, test harness).
- **Request_ID**: A unique identifier assigned to each incoming HTTP request for traceability.

---

## Requirements

### Requirement 1: Single House Price Prediction

**User Story:** As a client application, I want to submit a single house's features and receive a predicted price, so that I can display or use the estimated value in downstream workflows.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/predict` with a valid `HouseFeatures` payload, THE API SHALL return a `PredictionResponse` containing `predicted_price`, `currency`, `input_features`, `model_version`, and `timestamp`.
2. WHEN a POST request is sent to `/predict`, THE Predictor SHALL apply the Preprocessor to the input features before generating a prediction.
3. WHEN a POST request is sent to `/predict` with a valid payload, THE API SHALL respond with HTTP status 200.
4. WHEN a POST request is sent to `/predict`, THE API SHALL respond with a p50 latency below 100ms and a p95 latency below 200ms.
5. IF the Predictor is not loaded when a POST request is received at `/predict`, THEN THE API SHALL return an `ErrorResponse` with code `MODEL_NOT_LOADED` and HTTP status 503.
6. IF a prediction computation fails at `/predict`, THEN THE API SHALL return an `ErrorResponse` with code `PREDICTION_ERROR` and HTTP status 500.

---

### Requirement 2: Batch House Price Prediction

**User Story:** As a data pipeline, I want to submit multiple house records in a single request and receive predictions for all of them, so that I can process large datasets efficiently without making individual API calls.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/predict/batch` with an array of 1 to 100 valid `HouseFeatures` objects, THE API SHALL return a `BatchPredictionResponse` containing `predictions`, `total_records`, `successful_predictions`, `model_version`, and `timestamp`.
2. WHEN a POST request is sent to `/predict/batch` with 100 valid records, THE API SHALL respond with a p50 latency below 1000ms.
3. IF a POST request is sent to `/predict/batch` with more than 100 records, THEN THE API SHALL return an `ErrorResponse` with code `BATCH_SIZE_EXCEEDED` and HTTP status 400.
4. IF a POST request is sent to `/predict/batch` with an empty array, THEN THE API SHALL return an `ErrorResponse` with code `VALIDATION_ERROR` and HTTP status 422.
5. IF the Predictor is not loaded when a POST request is received at `/predict/batch`, THEN THE API SHALL return an `ErrorResponse` with code `MODEL_NOT_LOADED` and HTTP status 503.

---

### Requirement 3: Model Information Endpoint

**User Story:** As an API consumer, I want to retrieve metadata about the deployed model, so that I can understand its version, training configuration, and performance characteristics.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/model-info`, THE API SHALL return a `ModelInfo` response containing `model_name`, `model_version`, `model_type`, `training_date`, `dataset_info`, `performance_metrics`, `feature_importance`, and `model_parameters`.
2. WHEN a GET request is sent to `/model-info`, THE API SHALL respond with HTTP status 200.
3. WHEN a GET request is sent to `/model-info`, THE `performance_metrics` field SHALL include an R² score of 0.80 or greater.
4. IF the Predictor is not loaded when a GET request is received at `/model-info`, THEN THE API SHALL return an `ErrorResponse` with code `MODEL_NOT_LOADED` and HTTP status 503.

---

### Requirement 4: Health Check Endpoint

**User Story:** As a platform operator, I want to query the health of the API service, so that I can monitor its availability and integrate it with container orchestration health probes.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/health`, THE API SHALL return a `HealthStatus` response containing `status`, `model_loaded`, `model_version`, `timestamp`, and `uptime_seconds`.
2. WHEN a GET request is sent to `/health`, THE API SHALL respond with HTTP status 200.
3. WHEN a GET request is sent to `/health`, THE API SHALL respond with a p50 latency below 10ms.
4. WHILE the Predictor is loaded, THE `HealthStatus` returned by `/health` SHALL set `model_loaded` to `true` and `status` to `"healthy"`.
5. WHILE the Predictor is not loaded, THE `HealthStatus` returned by `/health` SHALL set `model_loaded` to `false` and `status` to `"degraded"`.

---

### Requirement 5: Input Validation

**User Story:** As an API consumer, I want the API to validate all input fields against defined constraints, so that I receive clear error messages when I submit malformed or out-of-range data.

#### Acceptance Criteria

1. THE API SHALL validate that `area` is a float greater than 0.
2. THE API SHALL validate that `bedrooms` is an integer in the range 0 to 10 inclusive.
3. THE API SHALL validate that `bathrooms` is an integer in the range 0 to 10 inclusive.
4. THE API SHALL validate that `stories` is an integer in the range 1 to 4 inclusive.
5. THE API SHALL validate that `mainroad`, `guestroom`, `basement`, `hotwaterheating`, `airconditioning`, and `prefarea` each contain the value `"yes"` or `"no"`.
6. THE API SHALL validate that `parking` is an integer in the range 0 to 5 inclusive.
7. THE API SHALL validate that `furnishingstatus` contains one of the values `"furnished"`, `"semi-furnished"`, or `"unfurnished"`.
8. IF any input field fails validation, THEN THE API SHALL return an `ErrorResponse` with code `VALIDATION_ERROR` and HTTP status 422, including field-level details identifying which fields failed and why.
9. THE API SHALL reject any request payload exceeding 1MB in size.

---

### Requirement 6: Interactive API Documentation

**User Story:** As a developer integrating with the API, I want to access interactive documentation in a browser, so that I can explore endpoints, view schemas, and test requests without writing code.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/docs`, THE API SHALL serve the Swagger UI interface.
2. THE Swagger UI SHALL display all available endpoints with their request and response schemas.
3. THE Swagger UI SHALL allow a developer to submit test requests directly from the browser.

---

### Requirement 7: Standardized Error Handling

**User Story:** As a client application, I want all API errors to follow a consistent format, so that I can handle failures programmatically without parsing free-form error messages.

#### Acceptance Criteria

1. WHEN any request results in an error, THE API SHALL return an `ErrorResponse` containing `code`, `message`, `details`, `timestamp`, and `request_id`.
2. THE API SHALL assign a unique `request_id` to every incoming request and include it in all `ErrorResponse` payloads.
3. THE API SHALL return HTTP status 422 for `VALIDATION_ERROR`, 400 for `BATCH_SIZE_EXCEEDED`, 503 for `MODEL_NOT_LOADED`, and 500 for `PREDICTION_ERROR` and `INTERNAL_ERROR`.
4. IF an unhandled exception occurs, THEN THE API SHALL return an `ErrorResponse` with code `INTERNAL_ERROR` and HTTP status 500 without exposing internal stack traces to the client.

---

### Requirement 8: Model Persistence

**User Story:** As a deployment engineer, I want the trained model and preprocessor to be saved to disk and loaded at startup, so that the API does not need to retrain the model on every restart.

#### Acceptance Criteria

1. THE Predictor SHALL serialize the trained RandomForestRegressor to `model/housing_model.pkl` using a binary serialization format.
2. THE Preprocessor SHALL serialize the fitted preprocessing pipeline to `model/preprocessor.pkl` using a binary serialization format.
3. WHEN the API starts, THE API SHALL load both `housing_model.pkl` and `preprocessor.pkl` from the `model/` directory before accepting prediction requests.
4. IF either artifact file is missing or corrupt at startup, THEN THE API SHALL log an error and set `model_loaded` to `false` in the `HealthStatus`.

---

### Requirement 9: Request Logging

**User Story:** As a platform operator, I want all API requests and responses to be logged, so that I can audit usage, diagnose issues, and monitor performance.

#### Acceptance Criteria

1. THE API SHALL log each incoming request with its `request_id`, HTTP method, path, and timestamp.
2. THE API SHALL log each outgoing response with its `request_id`, HTTP status code, and response latency in milliseconds.
3. IF an error occurs during request processing, THEN THE API SHALL log the error details including `request_id`, error code, and a descriptive message.
4. THE API SHALL write logs in a structured format (JSON) to standard output.

---

### Requirement 10: CORS Support

**User Story:** As a web application developer, I want the API to support Cross-Origin Resource Sharing, so that browser-based clients hosted on different origins can call the API without being blocked by browser security policies.

#### Acceptance Criteria

1. THE API SHALL include CORS middleware that allows configurable allowed origins.
2. WHEN a preflight OPTIONS request is received, THE API SHALL respond with the appropriate CORS headers.
3. THE API SHALL include `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` headers in responses to cross-origin requests.

---

### Requirement 11: Security Controls

**User Story:** As a security engineer, I want the API to enforce input sanitization, payload size limits, and rate limiting, so that the service is protected against abuse and injection attacks.

#### Acceptance Criteria

1. THE API SHALL sanitize all string input fields to prevent injection of malicious content before passing them to the Preprocessor.
2. THE API SHALL reject any request with a payload size exceeding 1MB and return an `ErrorResponse` with code `VALIDATION_ERROR` and HTTP status 422.
3. THE API SHALL enforce a rate limit of 100 requests per minute per client IP address.
4. IF a client exceeds the rate limit, THEN THE API SHALL return HTTP status 429 with an appropriate error message.

---

### Requirement 12: Model Training and Quality

**User Story:** As a data scientist, I want the regression model to be trained with defined hyperparameters and meet minimum quality thresholds, so that predictions are reliable and reproducible.

#### Acceptance Criteria

1. THE Predictor SHALL be trained using a `RandomForestRegressor` with `n_estimators=100`, `max_depth=15`, `min_samples_split=5`, `min_samples_leaf=2`, and `random_state=42`.
2. THE Preprocessor SHALL apply one-hot encoding to all categorical features (`mainroad`, `guestroom`, `basement`, `hotwaterheating`, `airconditioning`, `prefarea`, `furnishingstatus`) and standard scaling to all numerical features (`area`, `bedrooms`, `bathrooms`, `stories`, `parking`).
3. THE Predictor SHALL be evaluated on a held-out test set comprising 20% of the training data.
4. THE Predictor SHALL achieve an R² score of 0.80 or greater on the test set.
5. THE Predictor SHALL achieve an RMSE below 1,000,000 on the test set.
6. THE Predictor SHALL achieve an MAE below 800,000 on the test set.

---

### Requirement 13: Containerization

**User Story:** As a deployment engineer, I want the API to be packaged as a Docker container, so that it can be deployed consistently across different environments without dependency conflicts.

#### Acceptance Criteria

1. THE API SHALL be packaged in a Docker image using `python:3.12-slim` as the base image.
2. THE Docker image SHALL install all dependencies listed in `requirements.txt` during the build step.
3. WHEN the Docker container starts, THE API SHALL be accessible on a configurable port (default 8000).
4. THE Docker image SHALL include the serialized model artifacts (`housing_model.pkl` and `preprocessor.pkl`) so that the container is self-contained.

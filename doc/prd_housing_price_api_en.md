# Product Requirements Document (PRD)

## Housing Price Prediction Model API

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-14  
**Status:** Draft  
**Author:** Technical Team  
**Reviewers:** Engineering Lead, Product Manager

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
   - 1.1 [Document Description](#11-document-description)
   - 1.2 [Roles & Responsibilities](#12-roles--responsibilities)
   - 1.3 [Terminology Definitions](#13-terminology-definitions)
2. [Functional Design](#2-functional-design)
   - 2.1 [System Overview](#21-system-overview)
   - 2.2 [System Features](#22-system-features)
   - 2.3 [System Flows](#23-system-flows)
   - 2.4 [API Requirements](#24-api-requirements)
   - 2.5 [Non-functional Requirements](#25-non-functional-requirements)
   - 2.6 [Performance Requirements](#26-performance-requirements)
3. [Reference Documents](#3-reference-documents)
4. [Appendices](#4-appendices)

---

## 1. Executive Summary

### 1.1 Document Description

This Product Requirements Document (PRD) defines the specifications for building, containerizing, and deploying a **Housing Price Prediction Model API**. The system is designed as a machine learning microservice that provides real-time housing price predictions based on property features.

The API will be built using modern Python technologies (FastAPI and Scikit-learn) and deployed as a containerized application. The primary use case is to demonstrate technical capabilities during technical interviews, with live Swagger/OpenAPI documentation available for interactive testing.

**Key Objectives:**
- Develop a regression model trained on housing dataset features
- Expose RESTful API endpoints for prediction, model information, and health monitoring
- Containerize the application using Docker for consistent deployment
- Provide interactive API documentation via Swagger UI
- Ensure the system is interview-ready with live demonstration capabilities

**Success Criteria:**
- API responds to prediction requests within 200ms for single predictions
- Batch prediction supports up to 100 records per request
- Model achieves R² score ≥ 0.80 on validation data
- 100% uptime for health check endpoint
- Successful deployment with accessible Swagger documentation

---

### 1.2 Roles & Responsibilities

| Role | Responsibilities | Stakeholder |
|------|------------------|-------------|
| **Product Owner** | Define requirements, prioritize features, accept deliverables | Hiring Manager |
| **ML Engineer / Data Scientist** | Model development, feature engineering, model training and evaluation | Candidate |
| **Backend Engineer** | API development, endpoint implementation, data validation | Candidate |
| **DevOps Engineer** | Docker containerization, deployment configuration, CI/CD setup | Candidate |
| **QA Engineer** | Test case design, API testing, performance validation | Candidate |
| **Technical Interviewer** | Review code quality, evaluate system design, conduct live demo | Interview Panel |

**Communication Plan:**
- Daily standups during development phase
- Code review sessions before final submission
- Live demo session with interview panel

---

### 1.3 Terminology Definitions

| Term | Definition |
|------|------------|
| **API** | Application Programming Interface - set of protocols for building software applications |
| **FastAPI** | Modern, fast web framework for building APIs with Python based on standard Python type hints |
| **Scikit-learn** | Open-source machine learning library for Python featuring various classification, regression, and clustering algorithms |
| **Docker** | Platform for developing, shipping, and running applications in containers |
| **Regression Model** | Statistical method to determine the strength and character of the relationship between a dependent variable and independent variables |
| **R² Score** | Coefficient of determination - statistical measure representing the proportion of variance for a dependent variable explained by independent variables |
| **Swagger/OpenAPI** | Specification for machine-readable interface files for describing, producing, consuming, and visualizing RESTful web services |
| **Containerization** | OS-level virtualization method used to deploy and run distributed applications |
| **Feature Engineering** | Process of using domain knowledge to extract features from raw data |
| **Batch Prediction** | Processing multiple input records in a single API request |
| **Health Check** | Endpoint that returns the operational status of the service |
| **MSE** | Mean Squared Error - average squared difference between predicted and actual values |
| **RMSE** | Root Mean Squared Error - square root of MSE, in same units as target variable |
| **MAE** | Mean Absolute Error - average absolute difference between predicted and actual values |

---

## 2. Functional Design

### 2.1 System Overview

The Housing Price Prediction API is a stateless microservice that exposes machine learning capabilities through RESTful endpoints. The system architecture follows a clean separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  (Swagger UI, curl, Postman, Frontend Applications)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  FastAPI Application (Python 3.12+)                             │
│  - Request Validation (Pydantic)                                │
│  - Routing & Middleware                                         │
│  - Auto-generated OpenAPI Documentation                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                          │
│  - Prediction Service (Single & Batch)                          │
│  - Model Information Service                                    │
│  - Health Monitoring Service                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MODEL LAYER                                  │
│  - Trained Scikit-learn Model ( persisted as .pkl/.joblib)     │
│  - Feature Preprocessing Pipeline                               │
│  - Model Metadata & Metrics                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Runtime:** Python 3.12+
- **Web Framework:** FastAPI 0.100+
- **ML Library:** Scikit-learn 1.3+
- **Data Validation:** Pydantic 2.0+
- **Container:** Docker with Python 3.12-slim base image
- **Documentation:** Auto-generated OpenAPI 3.0/Swagger UI

---

### 2.2 System Features

#### 2.2.1 Feature List

| ID | Feature Name | Priority | Description |
|----|--------------|----------|-------------|
| F-001 | Single Prediction | P0 | Accept housing features and return single price prediction |
| F-002 | Batch Prediction | P0 | Accept multiple housing records and return batch predictions |
| F-003 | Model Information | P0 | Return model coefficients, metrics, and metadata |
| F-004 | Health Check | P0 | Simple endpoint to verify service availability |
| F-005 | Input Validation | P1 | Validate all input parameters with meaningful error messages |
| F-006 | Auto Documentation | P1 | Interactive Swagger UI for API exploration |
| F-007 | Error Handling | P1 | Standardized error responses with HTTP status codes |
| F-008 | Model Persistence | P2 | Load pre-trained model from disk at startup |
| F-009 | Request Logging | P2 | Log incoming requests and responses for debugging |
| F-010 | CORS Support | P2 | Enable cross-origin requests for frontend integration |

#### 2.2.2 Feature Descriptions

**F-001: Single Prediction**
- Accept JSON payload with housing features
- Return predicted price as floating-point number
- Support synchronous processing

**F-002: Batch Prediction**
- Accept array of housing feature objects
- Return array of predicted prices
- Maximum batch size: 100 records
- Process all records or fail atomically

**F-003: Model Information**
- Return model type and version
- Include performance metrics (R², RMSE, MAE)
- List feature names and importance scores
- Provide training dataset information

**F-004: Health Check**
- Simple GET endpoint returning status
- Verify model is loaded and ready
- Return HTTP 200 when healthy, 503 when unavailable

---

### 2.3 System Flows

#### 2.3.1 Single Prediction Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Client │────▶│   FastAPI    │────▶│   Pydantic   │────▶│  Prediction │────▶│  Model   │
│         │     │   Endpoint   │     │  Validation  │     │   Service   │     │  (.pkl)  │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
                                                                                    │
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐           │
│  Client │◀────│  JSON       │◀────│   Format     │◀────│   Predict   │◀──────────┘
│         │     │  Response   │     │   Result     │     │   Price     │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

**Flow Steps:**
1. Client sends POST request to `/predict` with housing features
2. FastAPI receives request and triggers Pydantic validation
3. Validation ensures all required fields present and within valid ranges
4. Prediction service loads features and applies preprocessing
5. Model generates price prediction
6. Result formatted as JSON and returned to client

#### 2.3.2 Batch Prediction Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Client │────▶│   FastAPI    │────▶│   Validate   │────▶│  Check Batch    │
│         │     │   /predict   │     │   Payload    │     │  Size ≤ 100     │
└─────────┘     │   (batch)    │     └──────────────┘     └─────────────────┘
                └─────────────┘                                    │
                                                                   ▼
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Client │◀────│  JSON Array │◀────│   Collect    │◀────│  Process Each   │
│         │     │  Response   │     │   Results    │     │  Record         │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────────┘
```

**Flow Steps:**
1. Client sends POST request to `/predict/batch` with array of records
2. System validates batch size does not exceed 100 records
3. Each record validated individually
4. All records processed through model
5. Results collected into array
6. Array returned as JSON response

#### 2.3.3 Health Check Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Client │────▶│   GET       │────▶│   Check      │────▶│   Model     │
│         │     │   /health    │     │   Service    │     │   Loaded?   │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Client │◀────│  200 OK     │◀────│   Status     │◀────│   Yes/No    │
│         │     │  or 503     │     │   Response   │     │             │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

---

### 2.4 API Requirements

#### 2.4.1 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/predict` | Single housing price prediction | No |
| POST | `/predict/batch` | Batch housing price predictions | No |
| GET | `/model-info` | Model metadata and metrics | No |
| GET | `/health` | Service health check | No |
| GET | `/docs` | Swagger UI documentation | No |
| GET | `/openapi.json` | OpenAPI specification | No |

#### 2.4.2 Detailed API Specifications

---

**Endpoint: POST /predict**

*Description:* Submit housing features and receive a single price prediction.

**Request:**
```json
{
  "area": 1500,
  "bedrooms": 3,
  "bathrooms": 2,
  "stories": 2,
  "mainroad": "yes",
  "guestroom": "no",
  "basement": "yes",
  "hotwaterheating": "no",
  "airconditioning": "yes",
  "parking": 1,
  "prefarea": "yes",
  "furnishingstatus": "furnished"
}
```

**Request Schema (Pydantic):**
```python
class HouseFeatures(BaseModel):
    area: float = Field(..., gt=0, description="Area in square feet")
    bedrooms: int = Field(..., ge=0, le=10, description="Number of bedrooms")
    bathrooms: int = Field(..., ge=0, le=10, description="Number of bathrooms")
    stories: int = Field(..., ge=1, le=4, description="Number of stories")
    mainroad: str = Field(..., pattern="^(yes|no)$", description="Connected to main road")
    guestroom: str = Field(..., pattern="^(yes|no)$", description="Has guest room")
    basement: str = Field(..., pattern="^(yes|no)$", description="Has basement")
    hotwaterheating: str = Field(..., pattern="^(yes|no)$", description="Has hot water heating")
    airconditioning: str = Field(..., pattern="^(yes|no)$", description="Has air conditioning")
    parking: int = Field(..., ge=0, le=5, description="Number of parking spots")
    prefarea: str = Field(..., pattern="^(yes|no)$", description="In preferred area")
    furnishingstatus: str = Field(..., pattern="^(furnished|semi-furnished|unfurnished)$")
```

**Response (200 OK):**
```json
{
  "predicted_price": 5250000.00,
  "currency": "USD",
  "input_features": {
    "area": 1500,
    "bedrooms": 3,
    ...
  },
  "model_version": "1.0.0",
  "timestamp": "2026-05-14T14:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input parameters
- `422 Unprocessable Entity`: Validation error with field details
- `500 Internal Server Error`: Model prediction failure

---

**Endpoint: POST /predict/batch**

*Description:* Submit multiple housing records for batch prediction.

**Request:**
```json
{
  "records": [
    {
      "area": 1500,
      "bedrooms": 3,
      "bathrooms": 2,
      ...
    },
    {
      "area": 2000,
      "bedrooms": 4,
      "bathrooms": 3,
      ...
    }
  ]
}
```

**Constraints:**
- Maximum 100 records per request
- Minimum 1 record per request

**Response (200 OK):**
```json
{
  "predictions": [
    {
      "record_id": 0,
      "predicted_price": 5250000.00
    },
    {
      "record_id": 1,
      "predicted_price": 7500000.00
    }
  ],
  "total_records": 2,
  "successful_predictions": 2,
  "model_version": "1.0.0",
  "timestamp": "2026-05-14T14:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Batch size exceeds limit or empty batch
- `422 Unprocessable Entity`: One or more records failed validation
- `500 Internal Server Error`: Batch processing failure

---

**Endpoint: GET /model-info**

*Description:* Retrieve model metadata, coefficients, and performance metrics.

**Response (200 OK):**
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
    "mse": 893000000000.00
  },
  "feature_importance": [
    {"feature": "area", "importance": 0.45},
    {"feature": "bathrooms", "importance": 0.15},
    {"feature": "airconditioning", "importance": 0.12},
    ...
  ],
  "model_parameters": {
    "n_estimators": 100,
    "max_depth": 15,
    "random_state": 42
  }
}
```

---

**Endpoint: GET /health**

*Description:* Check service health and model availability.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "1.0.0",
  "timestamp": "2026-05-14T14:30:00Z",
  "uptime_seconds": 3600
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "model_loaded": false,
  "error": "Model failed to load",
  "timestamp": "2026-05-14T14:30:00Z"
}
```

---

#### 2.4.3 Error Handling Standards

All errors follow this standard format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "area",
        "message": "Value must be greater than 0"
      }
    ],
    "timestamp": "2026-05-14T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 422 | Input validation failed |
| BATCH_SIZE_EXCEEDED | 400 | Batch size exceeds maximum limit |
| MODEL_NOT_LOADED | 503 | Model failed to load or unavailable |
| PREDICTION_ERROR | 500 | Error during prediction execution |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

### 2.5 Non-functional Requirements

#### 2.5.1 Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-001 | Input sanitization to prevent injection attacks | P1 |
| SEC-002 | Request payload size limit (max 1MB) | P1 |
| SEC-003 | CORS configuration for allowed origins | P2 |
| SEC-004 | No sensitive data in logs or error messages | P1 |
| SEC-005 | Rate limiting (100 requests/minute per IP) | P2 |

#### 2.5.2 Reliability Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REL-001 | Graceful handling of model loading failures | P0 |
| REL-002 | Automatic retry on transient errors | P2 |
| REL-003 | Health check endpoint for load balancer integration | P0 |
| REL-004 | Zero-downtime deployment capability | P2 |

#### 2.5.3 Maintainability Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| MAINT-001 | Comprehensive inline code documentation | P1 |
| MAINT-002 | Unit test coverage ≥ 80% | P1 |
| MAINT-003 | Integration tests for all API endpoints | P1 |
| MAINT-004 | Structured logging with correlation IDs | P2 |
| MAINT-005 | Versioned API (v1 prefix) | P2 |

#### 2.5.4 Usability Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| USE-001 | Interactive Swagger UI at `/docs` | P0 |
| USE-002 | Clear error messages with actionable guidance | P1 |
| USE-003 | Example requests in API documentation | P1 |
| USE-004 | Consistent JSON response format | P1 |

---

### 2.6 Performance Requirements

#### 2.6.1 Response Time Requirements

| Endpoint | Target (p50) | Target (p95) | Target (p99) |
|----------|--------------|--------------|--------------|
| POST /predict | < 100ms | < 200ms | < 500ms |
| POST /predict/batch (10 records) | < 200ms | < 500ms | < 1000ms |
| POST /predict/batch (100 records) | < 1000ms | < 2000ms | < 5000ms |
| GET /model-info | < 50ms | < 100ms | < 200ms |
| GET /health | < 10ms | < 50ms | < 100ms |

#### 2.6.2 Throughput Requirements

| Metric | Target |
|--------|--------|
| Requests per second (single prediction) | ≥ 100 RPS |
| Concurrent connections | ≥ 50 |
| Batch processing capacity | 100 records/request |

#### 2.6.3 Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2 cores |
| Memory | 512 MB | 1 GB |
| Disk | 100 MB | 500 MB |
| Network | 10 Mbps | 100 Mbps |

#### 2.6.4 Scalability Considerations

- Stateless design allows horizontal scaling
- Model loaded once at startup (singleton pattern)
- No external database dependencies
- Container-ready for orchestration platforms (Kubernetes, ECS)

---

## 3. Reference Documents

### 3.1 Technical References

| Document | Description | URL |
|----------|-------------|-----|
| FastAPI Documentation | Official FastAPI framework documentation | https://fastapi.tiangolo.com/ |
| Scikit-learn User Guide | Machine learning library documentation | https://scikit-learn.org/stable/user_guide.html |
| Pydantic Documentation | Data validation library documentation | https://docs.pydantic.dev/ |
| Docker Documentation | Container platform documentation | https://docs.docker.com/ |
| OpenAPI Specification | API specification standard | https://swagger.io/specification/ |

### 3.2 Dataset References

| Dataset | Description | Source |
|---------|-------------|--------|
| Housing Price Dataset | Training data for price prediction model | Provided attachment |
| Kaggle Housing Prices | Alternative public dataset | https://www.kaggle.com/datasets |

### 3.3 Code Repository Structure

```
housing-price-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py       # Pydantic models
│   │   └── predictor.py     # ML model wrapper
│   ├── services/
│   │   ├── __init__.py
│   │   └── prediction.py    # Business logic
│   └── utils/
│       ├── __init__.py
│       └── helpers.py       # Utility functions
├── model/
│   ├── housing_model.pkl    # Serialized trained model
│   └── preprocessor.pkl     # Feature preprocessor
├── notebooks/
│   └── model_training.ipynb # Training notebook
├── tests/
│   ├── __init__.py
│   ├── test_api.py          # API endpoint tests
│   └── test_model.py        # Model tests
├── Dockerfile
├── requirements.txt
├── README.md
└── .dockerignore
```

---

## 4. Appendices

### Appendix A: Data Dictionary

**Input Features:**

| Feature Name | Type | Range/Values | Description |
|--------------|------|--------------|-------------|
| area | float | > 0 | Total area of the house in square feet |
| bedrooms | int | 0-10 | Number of bedrooms |
| bathrooms | int | 0-10 | Number of bathrooms |
| stories | int | 1-4 | Number of stories/floors |
| mainroad | string | yes/no | Whether house is connected to main road |
| guestroom | string | yes/no | Whether house has a guest room |
| basement | string | yes/no | Whether house has a basement |
| hotwaterheating | string | yes/no | Whether house has hot water heating |
| airconditioning | string | yes/no | Whether house has air conditioning |
| parking | int | 0-5 | Number of parking spots available |
| prefarea | string | yes/no | Whether house is in preferred area |
| furnishingstatus | string | furnished/semi-furnished/unfurnished | Furnishing status |

**Output:**

| Field | Type | Description |
|-------|------|-------------|
| predicted_price | float | Predicted house price in USD |

### Appendix B: Model Training Specifications

**Algorithm:** RandomForestRegressor (default) or LinearRegression (baseline)

**Training Configuration:**
```python
{
    "algorithm": "RandomForestRegressor",
    "parameters": {
        "n_estimators": 100,
        "max_depth": 15,
        "min_samples_split": 5,
        "min_samples_leaf": 2,
        "random_state": 42
    },
    "test_size": 0.2,
    "validation_strategy": "train_test_split",
    "preprocessing": {
        "categorical_encoding": "one-hot",
        "numerical_scaling": "standard_scaler"
    }
}
```

**Expected Performance:**
- R² Score: ≥ 0.80
- RMSE: < 1,000,000
- MAE: < 800,000

### Appendix C: Docker Configuration

**Dockerfile:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY model/ ./model/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build & Run Commands:**
```bash
# Build image
docker build -t housing-price-api .

# Run container
docker run -p 8000:8000 housing-price-api

# Access Swagger UI
open http://localhost:8000/docs
```

### Appendix D: Testing Strategy

**Unit Tests:**
- Input validation logic
- Model prediction wrapper
- Utility functions

**Integration Tests:**
- All API endpoints
- Error handling scenarios
- Batch processing edge cases

**Performance Tests:**
- Load testing with 100 concurrent users
- Batch size boundary testing
- Memory usage profiling

**Test Commands:**
```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Load testing
locust -f locustfile.py --host=http://localhost:8000
```

### Appendix E: Deployment Checklist

**Pre-deployment:**
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Model performance validated
- [ ] Docker image builds successfully
- [ ] Swagger UI accessible locally

**Deployment:**
- [ ] Container deployed to target environment
- [ ] Health check endpoint responding
- [ ] Model info endpoint returning correct data
- [ ] Prediction endpoints functional
- [ ] Swagger UI accessible publicly

**Post-deployment:**
- [ ] Smoke tests executed
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Interview demo script prepared

---

**End of Document**

---

*Document Control:*
- Version History: v1.0 - Initial draft
- Next Review Date: 2026-05-21
- Approval: Pending

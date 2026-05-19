"""
FastAPI application entry point for the Housing Price Prediction API.

Creates the FastAPI app with lifespan management, middleware, exception handlers,
and router registration.

Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3
"""
import sys
import os
import logging
import traceback
from contextlib import asynccontextmanager

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn  # 添加这个导入
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models.predictor import Predictor
from app.routers import health, model_info, predict
from app.services.prediction import PredictionService
from app.utils.helpers import build_error_response

logger = logging.getLogger(__name__)

# Environment-based documentation toggle (default: enabled)
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "true").lower() == "true"

# Singleton Predictor instance
predictor = Predictor()

# Maximum request body size: 1 MB
MAX_BODY_SIZE = 1_048_576


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ML model on startup and inject into routers."""
    predictor.load_model()
    # Set router references after model load
    predict.predictor = predictor
    predict.service = PredictionService(predictor)
    model_info.predictor = predictor
    health.predictor = predictor
    yield


app = FastAPI(
    title="Housing Price Prediction API",
    version="1.0.0",
    description="ML-powered housing price prediction microservice. Provides single and batch prediction endpoints using a trained RandomForest model.",
    contact={
        "name": "Housing Price API Team",
        "email": "api-team@example.com",
    },
    license_info={
        "name": "MIT",
    },
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_body_size_limit(request: Request, call_next):
    """Reject requests with Content-Length exceeding 1 MB (HTTP 413)."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content=build_error_response(
                code="PAYLOAD_TOO_LARGE",
                message="Request payload exceeds the maximum allowed size of 1 MB.",
            ),
        )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Map Pydantic validation errors to structured ErrorResponse.

    Special cases:
    - Batch size > 100 → 400 BATCH_SIZE_EXCEEDED
    - Empty batch → 400 EMPTY_BATCH
    - Otherwise → 422 VALIDATION_ERROR
    """
    errors = exc.errors()

    for error in errors:
        ctx = error.get("ctx", {})
        error_type = error.get("type", "")

        # Detect batch size exceeded (max_length constraint on records list)
        if error_type == "too_long":
            loc = error.get("loc", ())
            if "records" in loc or (len(loc) >= 2 and loc[-1] == "records"):
                return JSONResponse(
                    status_code=400,
                    content=build_error_response(
                        code="BATCH_SIZE_EXCEEDED",
                        message="Batch size exceeds the maximum of 100 records.",
                    ),
                )

        # Detect empty batch (min_length constraint on records list)
        if error_type == "too_short":
            loc = error.get("loc", ())
            if "records" in loc or (len(loc) >= 2 and loc[-1] == "records"):
                return JSONResponse(
                    status_code=400,
                    content=build_error_response(
                        code="EMPTY_BATCH",
                        message="Batch must contain at least 1 record.",
                    ),
                )

    # General validation error: map each Pydantic error to a detail entry
    details = []
    for error in errors:
        loc = error.get("loc", ())
        # Build field path from location, skipping 'body' prefix
        field_parts = [str(part) for part in loc if part != "body"]
        field = ".".join(field_parts) if field_parts else "unknown"
        details.append({"field": field, "message": error.get("msg", "Validation error")})

    return JSONResponse(
        status_code=422,
        content=build_error_response(
            code="VALIDATION_ERROR",
            message="Request validation failed.",
            details=details,
        ),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Return HTTP 500 with INTERNAL_ERROR. Log full traceback server-side."""
    logger.error(
        "Unhandled exception for %s %s:\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content=build_error_response(
            code="INTERNAL_ERROR",
            message="An unexpected internal error occurred.",
        ),
    )


# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------

app.include_router(predict.router)
app.include_router(model_info.router)
app.include_router(health.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

"""
FastAPI application entry point for the Estimator Backend.

Creates the FastAPI app with lifespan management, middleware, exception handlers,
and router registration. Communicates with the housing-price-api ML service
for property value predictions.

Requirements: 9.1, 9.4, 9.5, 14.2
"""
import logging
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize resources on startup, cleanup on shutdown."""
    logger.info("Estimator Backend starting up...")
    yield
    logger.info("Estimator Backend shutting down...")


app = FastAPI(
    title="Property Value Estimator Backend",
    version="1.0.0",
    description="Backend service for property value estimation, "
    "integrating with the housing-price-api ML model.",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------------------------


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Map Pydantic validation errors to structured error response.

    Returns HTTP 422 with error code, message, and field-level details.
    For batch requests, includes zero-based index of invalid records.
    """
    errors = exc.errors()

    # Check for batch size violations
    for error in errors:
        error_type = error.get("type", "")
        loc = error.get("loc", ())

        if error_type == "too_long" and "records" in loc:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "BATCH_SIZE_EXCEEDED",
                        "message": "Batch size exceeds the maximum of 100 records.",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

        if error_type == "too_short" and "records" in loc:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "EMPTY_BATCH",
                        "message": "Batch must contain at least 1 record.",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

    # General validation error with field-level details
    details = []
    for error in errors:
        loc = error.get("loc", ())
        field_parts = [str(part) for part in loc if part != "body"]
        field = ".".join(field_parts) if field_parts else "unknown"
        details.append({"field": field, "message": error.get("msg", "Validation error")})

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Return HTTP 500 with INTERNAL_ERROR for unhandled exceptions."""
    logger.error(
        "Unhandled exception for %s %s:\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected internal error occurred.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        },
    )


# ---------------------------------------------------------------------------
# Router Registration
# ---------------------------------------------------------------------------

from app.routers import health, history, predict  # noqa: E402

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(history.router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)

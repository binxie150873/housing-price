"""Tests for the health check endpoint.

Validates requirement 9.5: Health check endpoint returns status, model_loaded,
model_version, and timestamp with DB and ML service connectivity checks.
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_health_endpoint_all_healthy():
    """Health endpoint returns 'healthy' when DB and ML service are both reachable."""
    with patch(
        "app.routers.health._check_db", new_callable=AsyncMock, return_value=True
    ), patch(
        "app.routers.health._check_ml_service",
        new_callable=AsyncMock,
        return_value=(True, "1.0.0"),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/estimator/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["model_loaded"] is True
            assert data["model_version"] == "1.0.0"
            assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_endpoint_db_down():
    """Health endpoint returns 'unhealthy' when DB is unreachable."""
    with patch(
        "app.routers.health._check_db", new_callable=AsyncMock, return_value=False
    ), patch(
        "app.routers.health._check_ml_service",
        new_callable=AsyncMock,
        return_value=(True, "1.0.0"),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/estimator/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["model_loaded"] is True
            assert data["model_version"] == "1.0.0"


@pytest.mark.asyncio
async def test_health_endpoint_ml_service_down():
    """Health endpoint returns 'unhealthy' when ML service is unreachable."""
    with patch(
        "app.routers.health._check_db", new_callable=AsyncMock, return_value=True
    ), patch(
        "app.routers.health._check_ml_service",
        new_callable=AsyncMock,
        return_value=(False, "unknown"),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/estimator/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["model_loaded"] is False
            assert data["model_version"] == "unknown"


@pytest.mark.asyncio
async def test_health_endpoint_both_down():
    """Health endpoint returns 'unhealthy' when both DB and ML service are down."""
    with patch(
        "app.routers.health._check_db", new_callable=AsyncMock, return_value=False
    ), patch(
        "app.routers.health._check_ml_service",
        new_callable=AsyncMock,
        return_value=(False, "unknown"),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/estimator/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["model_loaded"] is False
            assert data["model_version"] == "unknown"
            assert "timestamp" in data

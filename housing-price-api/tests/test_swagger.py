"""
Tests for Swagger/OpenAPI documentation integration.

Validates that the API documentation endpoints (/docs, /redoc, /openapi.json)
are properly configured, accessible, and contain correct metadata.
Also verifies environment-based documentation toggle (ENABLE_DOCS).
"""

import importlib
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client():
    """Create a TestClient with the lifespan triggered (model loaded)."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Swagger/OpenAPI documentation tests
# ---------------------------------------------------------------------------


def test_docs_endpoint_accessible(client):
    """Verify that the Swagger UI endpoint (/docs) is accessible and returns HTTP 200."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_endpoint_accessible(client):
    """Verify that the ReDoc endpoint (/redoc) is accessible and returns HTTP 200."""
    response = client.get("/redoc")
    assert response.status_code == 200


def test_openapi_json_accessible(client):
    """Verify that the OpenAPI JSON endpoint (/openapi.json) returns valid schema structure."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "Housing Price Prediction API"


def test_all_endpoints_documented(client):
    """Verify that all API endpoints are included in the OpenAPI schema's paths."""
    response = client.get("/openapi.json")
    schema = response.json()
    paths = schema["paths"]
    assert "/predict" in paths
    assert "/predict/batch" in paths
    assert "/model-info" in paths
    assert "/health" in paths


def test_endpoints_have_correct_tags(client):
    """Verify that endpoints are grouped with correct tags."""
    response = client.get("/openapi.json")
    schema = response.json()
    paths = schema["paths"]

    # Prediction endpoints
    assert "Prediction" in paths["/predict"]["post"]["tags"]
    assert "Prediction" in paths["/predict/batch"]["post"]["tags"]

    # Model Info endpoint
    assert "Model Info" in paths["/model-info"]["get"]["tags"]

    # Health endpoint
    assert "Health" in paths["/health"]["get"]["tags"]


def test_docs_disabled_in_production(monkeypatch):
    """Verify that when ENABLE_DOCS=false, documentation endpoints return 404."""
    monkeypatch.setenv("ENABLE_DOCS", "false")

    # Reload the main module so it re-reads the environment variable
    import main
    importlib.reload(main)

    # Create a new TestClient with the reloaded app (docs disabled)
    with TestClient(main.app) as disabled_client:
        assert disabled_client.get("/docs").status_code == 404
        assert disabled_client.get("/redoc").status_code == 404
        assert disabled_client.get("/openapi.json").status_code == 404

    # Restore: reload main with ENABLE_DOCS back to default (true)
    monkeypatch.setenv("ENABLE_DOCS", "true")
    importlib.reload(main)

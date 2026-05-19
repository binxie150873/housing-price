# Design Document

## Overview

本设计文档描述了在 housing-price-api 项目中集成 Swagger/OpenAPI 文档的技术实现方案。FastAPI 已内置 OpenAPI 支持，主要工作集中在完善元数据配置、为端点添加文档标注、以及实现环境感知的文档访问控制。

## Architecture

### 技术方案

FastAPI 原生支持 OpenAPI 3.1 规范，自动生成 Swagger UI（/docs）、ReDoc（/redoc）和 OpenAPI JSON schema（/openapi.json）。本方案利用 FastAPI 的内置能力，无需引入额外依赖。

### 核心变更

1. **main.py** — 增强 FastAPI 应用实例的元数据配置，添加环境感知的文档开关
2. **routers/*.py** — 为每个路由器添加 tags 和响应码文档
3. **models/schemas.py** — 确认并补充 Pydantic 模型的 JSON schema 示例和描述（大部分已完成）

### 组件关系

```
main.py (FastAPI app 配置)
├── OpenAPI 元数据 (title, version, description, contact, license)
├── 文档 URL 配置 (docs_url, redoc_url, openapi_url)
├── 环境变量控制 (ENABLE_DOCS)
│
├── routers/predict.py (tag: "Prediction", responses 文档)
├── routers/model_info.py (tag: "Model Info", responses 文档)
└── routers/health.py (tag: "Health", responses 文档)
```

## Implementation Details

### 1. FastAPI 应用元数据增强 (main.py)

```python
import os

ENABLE_DOCS = os.getenv("ENABLE_DOCS", "true").lower() == "true"

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
```

### 2. 路由器 Tags 和响应码文档

**predict.py:**
```python
router = APIRouter(tags=["Prediction"])

@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict single housing price",
    description="Accepts property features and returns a predicted price using the trained ML model.",
    responses={
        200: {"description": "Prediction successful"},
        422: {"description": "Validation error in input features"},
        503: {"description": "Model not loaded"},
        500: {"description": "Internal prediction error"},
    },
)
```

**model_info.py:**
```python
router = APIRouter(tags=["Model Info"])

@router.get(
    "/model-info",
    response_model=ModelInfo,
    summary="Get model metadata",
    description="Returns metadata, performance metrics, and feature importance for the deployed model.",
    responses={
        200: {"description": "Model info retrieved successfully"},
        503: {"description": "Model not loaded"},
    },
)
```

**health.py:**
```python
router = APIRouter(tags=["Health"])

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Reports service health status and model readiness.",
    responses={
        200: {"description": "Service is healthy"},
        503: {"description": "Service is unhealthy, model not loaded"},
    },
)
```

### 3. 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| ENABLE_DOCS | "true" | 设为 "false" 可在生产环境禁用文档端点 |

### 4. 现有 Schema 模型评估

当前 `models/schemas.py` 已经具备：
- ✅ 所有字段的 `description` 参数
- ✅ `json_schema_extra` 中的 example 值
- ✅ Field 约束（gt, ge, le, min_length, max_length）

无需额外修改 schema 文件。

## Testing Strategy

### 测试方法

1. **单元测试** — 验证文档端点可访问性
2. **集成测试** — 验证 OpenAPI schema 结构完整性
3. **环境测试** — 验证 ENABLE_DOCS=false 时文档不可访问

### 测试用例

```python
# test_swagger.py
def test_docs_endpoint_accessible(client):
    response = client.get("/docs")
    assert response.status_code == 200

def test_redoc_endpoint_accessible(client):
    response = client.get("/redoc")
    assert response.status_code == 200

def test_openapi_json_accessible(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "Housing Price Prediction API"

def test_all_endpoints_documented(client):
    response = client.get("/openapi.json")
    schema = response.json()
    paths = schema["paths"]
    assert "/predict" in paths
    assert "/predict/batch" in paths
    assert "/model-info" in paths
    assert "/health" in paths

def test_docs_disabled_in_production(monkeypatch):
    monkeypatch.setenv("ENABLE_DOCS", "false")
    # Re-create app and verify docs return 404
```

## Dependencies

无需新增依赖。FastAPI 0.111.0 已内置完整的 OpenAPI/Swagger 支持。

## Risks and Mitigations

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 生产环境暴露 API 文档 | 安全信息泄露 | 通过 ENABLE_DOCS 环境变量控制，默认开启便于开发 |
| 文档与实际行为不一致 | 开发者困惑 | 利用 FastAPI 自动生成机制，文档始终与代码同步 |

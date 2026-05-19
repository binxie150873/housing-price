# Tasks

## Task 1: 增强 FastAPI 应用元数据配置

- [x] 1.1 在 `main.py` 中添加 `ENABLE_DOCS` 环境变量读取逻辑
- [x] 1.2 更新 FastAPI 实例的 `contact` 和 `license_info` 参数
- [x] 1.3 添加 `docs_url`、`redoc_url`、`openapi_url` 的条件配置（基于 ENABLE_DOCS）
- [x] 1.4 确保 `description` 字段包含完整的服务描述

## Task 2: 为路由器添加 Tags 和文档标注

- [x] 2.1 为 `routers/predict.py` 的 APIRouter 添加 `tags=["Prediction"]`
- [x] 2.2 为 `/predict` 端点添加 `summary`、`description` 和 `responses` 参数
- [x] 2.3 为 `/predict/batch` 端点添加 `summary`、`description` 和 `responses` 参数
- [x] 2.4 为 `routers/model_info.py` 的 APIRouter 添加 `tags=["Model Info"]`
- [x] 2.5 为 `/model-info` 端点添加 `summary`、`description` 和 `responses` 参数
- [x] 2.6 为 `routers/health.py` 的 APIRouter 添加 `tags=["Health"]`
- [x] 2.7 为 `/health` 端点添加 `summary`、`description` 和 `responses` 参数

## Task 3: 验证 Schema 模型文档完整性

- [x] 3.1 检查 `models/schemas.py` 中所有模型是否包含 `json_schema_extra` 示例
- [x] 3.2 确认所有 Field 定义包含 `description` 参数
- [x] 3.3 确认所有约束（gt, ge, le, min_length, max_length）正确反映在 OpenAPI schema 中

## Task 4: 编写测试用例

- [x] 4.1 创建 `tests/test_swagger.py` 测试文件
- [x] 4.2 编写 Swagger UI 端点 (/docs) 可访问性测试
- [x] 4.3 编写 ReDoc 端点 (/redoc) 可访问性测试
- [x] 4.4 编写 OpenAPI JSON (/openapi.json) 端点测试，验证 schema 结构
- [x] 4.5 编写测试验证所有端点都包含在 OpenAPI schema 的 paths 中
- [x] 4.6 编写测试验证端点包含正确的 tags 分组
- [x] 4.7 编写测试验证 ENABLE_DOCS=false 时文档端点返回 404

## Task 5: 更新项目文档

- [x] 5.1 在 `.env.example` 中添加 `ENABLE_DOCS=true` 配置项
- [x] 5.2 在 README.md 中添加 Swagger 文档访问说明

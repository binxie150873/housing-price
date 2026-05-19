# Product Requirements Document (PRD)
# Multi-Application Next.js Portal — Property Value Estimator & Property Market Analysis
# 多应用 Next.js 门户 — 房产估值器 & 房产市场分析

**Version / 版本**: 1.0  
**Date / 日期**: 2026-05-17  
**Author / 作者**: Product & Engineering Team  
**Status / 状态**: Draft for Review  

---

## Table of Contents / 目录

1. [Executive Summary / 执行摘要](#1-executive-summary--执行摘要)
2. [System Architecture / 系统架构](#2-system-architecture--系统架构)
3. [Functional Requirements / 功能需求](#3-functional-requirements--功能需求)
4. [Technical Specifications / 技术规范](#4-technical-specifications--技术规范)
5. [API Design / API设计](#5-api-design--api设计)
6. [UI/UX Design / UI/UX设计](#6-uiux-design--uiux设计)
7. [Data Flow & State Management / 数据流与状态管理](#7-data-flow--state-management--数据流与状态管理)
8. [Non-functional Requirements / 非功能需求](#8-non-functional-requirements--非功能需求)
9. [Development Plan / 开发计划](#9-development-plan--开发计划)
10. [Appendices / 附录](#10-appendices--附录)

---

## 1. Executive Summary / 执行摘要

### 1.1 Overview / 概述

This document defines the product requirements for a unified **Multi-Application Next.js Portal** that hosts two independent applications with different backend technologies. Both applications are capable of interacting with the ML regression model produced in housing-price-api to deliver property value estimation and market analysis capabilities.

本文档定义了统一**多应用 Next.js 门户**的产品需求，该门户托管两个具有不同后端技术的独立应用。两个应用均能与housing-price-api中生成的ML回归模型交互，提供房产估值和市场分析能力。

### 1.2 Goals & Objectives / 目标与目的

| # | Goal (EN) | 目标 (CN) | Priority |
|---|-----------|-----------|----------|
| 1 | Build a unified portal with shared navigation and consistent design system | 构建具有共享导航和一致设计系统的统一门户 | P0 |
| 2 | Deliver App 1: Property Value Estimator with Python (FastAPI) backend | 交付应用1：基于Python (FastAPI)后端的房产估值器 | P0 |
| 3 | Deliver App 2: Property Market Analysis with Java (Spring Boot) backend | 交付应用2：基于Java (Spring Boot)后端的房产市场分析 | P0 |
| 4 | Enable both apps to consume the ML model from housing-price-api | 使两个应用都能使用housing-price-api的ML模型 | P0 |
| 5 | Ensure responsive, accessible, and performant UI/UX across all devices | 确保跨所有设备的响应式、可访问且高性能的UI/UX | P1 |
| 6 | Implement proper error handling, loading states, and caching | 实现适当的错误处理、加载状态和缓存 | P1 |

### 1.3 Target Users / 目标用户

- **Real Estate Agents / 房产经纪人**: Quick property valuation and market trend analysis
- **Property Investors / 房产投资者**: Comparative analysis and what-if scenarios
- **Data Analysts / 数据分析师**: Exportable market data and aggregate statistics
- **General Users / 普通用户**: Intuitive property estimation with visual feedback

### 1.4 Success Criteria / 成功标准

- Both applications accessible from a unified portal with seamless navigation
- Property value predictions returned within 2 seconds (p95)
- Market analysis dashboard loads within 3 seconds (p95)
- WCAG 2.1 AA compliance for all UI components
- 99.9% uptime for all backend services

---

## 2. System Architecture / 系统架构

### 2.1 High-Level Architecture / 高层架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER / 客户端层                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 15 App Router (Portal)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │   App 1:     │  │   App 2:     │  │   Shared Components      │  │   │
│  │  │  Property    │  │   Market     │  │   - Layout               │  │   │
│  │  │  Value       │  │  Analysis    │  │   - Navigation           │  │   │
│  │  │  Estimator   │  │  Dashboard   │  │   - Design System        │  │   │
│  │  │  (Client +   │  │  (Client +   │  │   - Error Boundaries     │  │   │
│  │  │   Server     │  │   Server     │  │   - Loading States       │  │   │
│  │  │   Components)│  │   Components)│  │   - Custom Hooks         │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘  │   │
│  └─────────┼─────────────────┼────────────────────────────────────────┘   │
└────────────┼─────────────────┼──────────────────────────────────────────────┘
             │                 │
             │ HTTP/REST       │ HTTP/REST
             │                 │
┌────────────┼─────────────────┼──────────────────────────────────────────────┐
│            ▼                 ▼                                              │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │  APP 1 BACKEND  │  │              APP 2 BACKEND                        │  │
│  │  Python 3.12+   │  │              Java 21                              │  │
│  │  FastAPI        │  │              Spring Boot 3.4.4                    │  │
│  │                 │  │                                                   │  │
│  │  - Form Handler │  │  - REST API Controllers                           │  │
│  │  - Validation   │  │  - Aggregate Statistics Service                   │  │
│  │  - ML Client    │  │  - Caching Layer (Redis/Caffeine)                 │  │
│  │  - History Store│  │  - ML Client                                      │  │
│  └────────┬────────┘  └─────────────────┬───────────────────────────────┘  │
│           │                             │                                   │
│           │ gRPC / HTTP                 │ gRPC / HTTP                       │
│           └─────────────┬───────────────┘                                   │
│                         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │         ML MODEL CONTAINER (housing-price-api)                       │  │
│  │              - Regression Model API                                  │   │
│  │              - Model Inference Service                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              DATA LAYER / 数据层                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │  PostgreSQL  │  │    Redis     │  │   File Storage (CSV/     │  │   │
│  │  │  (History +  │  │  (Cache +    │  │   PDF Export)            │  │   │
│  │  │  Market Data)│  │   Session)   │  │                          │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Relationship Diagram / 组件关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PORTAL SHELL / 门户壳层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ RootLayout  │  │  AppNav     │  │ ErrorBoundary│  │  LoadingSkeleton    │ │
│  │  (Server)   │  │  (Client)   │  │   (Client)   │  │    (Server)         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         └─────────────────┴─────────────────┴────────────────────┘            │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│         ┌─────────────────────┐      ┌─────────────────────┐               │
│         │   /estimator/*      │      │   /market/*         │               │
│         │   App 1 Routes      │      │   App 2 Routes      │               │
│         └──────────┬──────────┘      └──────────┬──────────┘               │
│                    │                            │                           │
│    ┌───────────────┼──────────────┐  ┌─────────┼──────────────┐            │
│    ▼               ▼              ▼  ▼         ▼              ▼            │
│ ┌──────┐    ┌──────────┐   ┌────────┐ ┌──────────┐   ┌──────────┐ ┌──────┐│
│ │Form  │    │ History  │   │Compare │ │Dashboard │   │ What-If  │ │Export││
│ │Page  │    │  Page    │   │  Page  │ │  Page    │   │  Page    │ │ Page ││
│ └──────┘    └──────────┘   └────────┘ └──────────┘   └──────────┘ └──────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Deployment Architecture / 部署架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER / 用户                                     │
│                              HTTPS                                          │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                         REVERSE PROXY / 反向代理                             │
│                         Nginx / Vercel Edge                                 │
│                    - SSL Termination / SSL终止                               │
│                    - Static Asset Caching / 静态资源缓存                      │
│                    - Rate Limiting / 速率限制                                │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Next.js App    │  │  Python FastAPI  │  │  Java Spring Boot│
│   (SSR/SSG)      │  │   (Docker)       │  │   (Docker)       │
│                  │  │                  │  │                  │
│  - App Router    │  │  - Uvicorn       │  │  - Embedded      │
│  - Edge Runtime  │  │  - Gunicorn      │  │    Tomcat        │
│  - ISR           │  │  - 4 Workers     │  │  - 4 Instances   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   ML Model Service  │    │   Data Stores       │
        │   (Docker/GPU)      │    │   - PostgreSQL      │
        │                     │    │   - Redis Cluster   │
        │  - REST/gRPC API    │    │   - MinIO/S3        │
        │  - Model Versioning │    │                     │
        └─────────────────────┘    └─────────────────────┘
```

### 2.4 Technology Stack / 技术栈

| Layer / 层级 | Technology / 技术 | Version / 版本 | Purpose / 用途 |
|-------------|-------------------|---------------|---------------|
| Frontend Framework | Next.js | 15.x | App Router, SSR, RSC |
| Frontend Language | TypeScript | 5.7+ | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| UI Components | shadcn/ui + Radix UI | latest | Accessible primitives |
| Charts | Recharts / Tremor | latest | Data visualization |
| State Management | Zustand + React Query | latest | Client + Server state |
| Forms | React Hook Form + Zod | latest | Form handling & validation |
| App 1 Backend | Python | 3.12+ | Runtime |
| App 1 Framework | FastAPI | 0.115+ | Web framework |
| App 1 HTTP | Uvicorn + Gunicorn | latest | ASGI server |
| App 2 Backend | Java | 21 (LTS) | Runtime |
| App 2 Framework | Spring Boot | 3.4.4 | Web framework |
| App 2 Cache | Caffeine / Redis | latest | In-memory / distributed cache |
| ML Integration | HTTP/gRPC | - | Model communication |
| Database | PostgreSQL | 16+ | Persistent storage |
| Cache | Redis | 7.x | Session & query cache |
| Object Storage | MinIO / AWS S3 | latest | File exports |
| Container | Docker | 25+ | Containerization |
| Orchestration | Docker Compose / K8s | latest | Deployment |

---

## 3. Functional Requirements / 功能需求

### 3.1 Unified Navigation & Layout / 统一导航与布局

#### 3.1.1 Shared Layout / 共享布局

| ID | Requirement (EN) | Requirement (CN) | Priority |
|----|-----------------|------------------|----------|
| NAV-001 | Implement a persistent top navigation bar with application switcher | 实现持久化顶部导航栏，包含应用切换器 | P0 |
| NAV-002 | Display active application indicator and breadcrumb trail | 显示当前应用指示器和面包屑导航 | P0 |
| NAV-003 | Collapsible sidebar for application-specific navigation | 可折叠的侧边栏用于应用特定导航 | P1 |
| NAV-004 | Responsive mobile menu (hamburger) with full navigation | 响应式移动端菜单（汉堡菜单）含完整导航 | P0 |
| NAV-005 | Footer with system status, version info, and quick links | 页脚含系统状态、版本信息和快捷链接 | P1 |

#### 3.1.2 Routing / 路由

| ID | Route | Description (EN) | Description (CN) |
|----|-------|-----------------|------------------|
| R-001 | `/` | Portal landing page with app cards | 门户落地页，展示应用卡片 |
| R-002 | `/estimator` | App 1: Property Value Estimator home | 应用1：房产估值器首页 |
| R-003 | `/estimator/new` | New property estimation form | 新建房产估值表单 |
| R-004 | `/estimator/history` | Estimation history list | 估值历史列表 |
| R-005 | `/estimator/compare` | Side-by-side property comparison | 房产并排对比 |
| R-006 | `/estimator/result/[id]` | Individual estimation result | 单个估值结果 |
| R-007 | `/market` | App 2: Market Analysis dashboard | 应用2：市场分析仪表板 |
| R-008 | `/market/dashboard` | Interactive market visualizations | 交互式市场可视化 |
| R-009 | `/market/what-if` | What-if analysis tool | 假设分析工具 |
| R-010 | `/market/data` | Data tables with export | 数据表格与导出 |

#### 3.1.3 Error & Loading States / 错误与加载状态

| ID | Requirement (EN) | Requirement (CN) | Priority |
|----|-----------------|------------------|----------|
| ERR-001 | Global error boundary catching unhandled exceptions | 全局错误边界捕获未处理异常 | P0 |
| ERR-002 | Route-level error boundaries with recovery options | 路由级错误边界含恢复选项 | P0 |
| ERR-003 | Skeleton loaders for all async data components | 所有异步数据组件的骨架屏加载 | P0 |
| ERR-004 | Toast notifications for async operation feedback | 异步操作反馈的Toast通知 | P1 |
| ERR-005 | Graceful degradation when ML service is unavailable | ML服务不可用时优雅降级 | P1 |

### 3.2 App 1: Property Value Estimator / 应用1：房产估值器

#### 3.2.1 Frontend Features / 前端功能

| ID | Feature (EN) | Feature (CN) | Priority |
|----|-------------|-------------|----------|
| EST-F-001 | Property input form with all model fields | 包含所有模型字段的房产输入表单 | P0 |
| EST-F-002 | Real-time client-side validation with Zod schema | 基于Zod模式的实时客户端验证 | P0 |
| EST-F-003 | Prediction results in tabular format | 表格格式的预测结果 | P0 |
| EST-F-004 | Prediction results in visual chart (bar/line) | 可视化图表（柱状/折线）预测结果 | P0 |
| EST-F-005 | History feature: list previous estimates with search/filter | 历史功能：列出先前估值，支持搜索/筛选 | P0 |
| EST-F-006 | Comparison view: analyse 2-4 properties side-by-side | 对比视图：并排分析2-4个房产 | P0 |
| EST-F-007 | Save/load estimate drafts to localStorage | 保存/加载估值草稿到localStorage | P1 |
| EST-F-008 | Share estimate via URL with encoded parameters | 通过URL分享估值（含编码参数） | P1 |

**Model Input Fields / 模型输入字段**:

| Field / 字段 | Type / 类型 | Validation / 验证 | Description / 描述 |
|-------------|------------|------------------|-------------------|
| `lot_area` | number | > 0, integer | Lot area in sq ft / 地块面积（平方英尺） |
| `overall_qual` | number | 1-10, integer | Overall material & finish quality / 整体材料与装修质量 |
| `overall_cond` | number | 1-10, integer | Overall condition rating / 整体状况评级 |
| `year_built` | number | 1800-current year | Original construction year / 建造年份 |
| `year_remod` | number | 1800-current year | Remodel year / 翻新年份 |
| `total_bsmt_sf` | number | >= 0, integer | Total basement area / 地下室总面积 |
| `first_flr_sf` | number | > 0, integer | First floor area / 一楼面积 |
| `second_flr_sf` | number | >= 0, integer | Second floor area / 二楼面积 |
| `gr_liv_area` | number | > 0, integer | Above grade living area / 地上居住面积 |
| `full_bath` | number | >= 0, integer | Full bathrooms above grade / 地上全浴室数 |
| `half_bath` | number | >= 0, integer | Half bathrooms above grade / 地上半浴室数 |
| `bedroom` | number | >= 0, integer | Bedrooms above grade / 地上卧室数 |
| `kitchen` | number | >= 0, integer | Kitchens above grade / 地上厨房数 |
| `tot_rms_abv_grd` | number | >= 0, integer | Total rooms above grade / 地上总房间数 |
| `garage_cars` | number | >= 0, integer | Garage capacity in cars / 车库容量（车位数） |
| `garage_area` | number | >= 0, integer | Garage area in sq ft / 车库面积 |
| `neighborhood` | string | enum | Neighborhood name / 社区名称 |
| `house_style` | string | enum | House style / 房屋风格 |
| `sale_type` | string | enum | Sale type / 销售类型 |

#### 3.2.2 Backend Features (Python/FastAPI) / 后端功能

| ID | Feature (EN) | Feature (CN) | Priority |
|----|-------------|-------------|----------|
| EST-B-001 | REST endpoint for property value prediction | 房产价值预测的REST端点 | P0 |
| EST-B-002 | Pydantic models for request/response validation | 请求/响应验证的Pydantic模型 | P0 |
| EST-B-003 | Integration with ML model container via HTTP/gRPC | 通过HTTP/gRPC与ML模型容器集成 | P0 |
| EST-B-004 | Store estimation history in PostgreSQL | 将估值历史存储到PostgreSQL | P0 |
| EST-B-005 | Retrieve and filter estimation history | 检索和筛选估值历史 | P0 |
| EST-B-006 | Batch prediction endpoint for comparison feature | 批量预测端点用于对比功能 | P0 |
| EST-B-007 | Health check and readiness endpoints | 健康检查和就绪端点 | P1 |
| EST-B-008 | Request logging and metrics (Prometheus) | 请求日志和指标（Prometheus） | P1 |

### 3.3 App 2: Property Market Analysis / 应用2：房产市场分析

#### 3.3.1 Frontend Features / 前端功能

| ID | Feature (EN) | Feature (CN) | Priority |
|----|-------------|-------------|----------|
| MKT-F-001 | Interactive dashboard with multiple chart types | 含多种图表类型的交互式仪表板 | P0 |
| MKT-F-002 | Filters: neighborhood, price range, year built, property type | 筛选器：社区、价格范围、建造年份、房产类型 | P0 |
| MKT-F-003 | What-if analysis: adjust parameters and see predicted impact | 假设分析：调整参数查看预测影响 | P0 |
| MKT-F-004 | Export data as CSV | 导出数据为CSV | P0 |
| MKT-F-005 | Export dashboard as PDF | 导出仪表板为PDF | P1 |
| MKT-F-006 | Responsive data tables with sorting and filtering | 响应式数据表格，支持排序和筛选 | P0 |
| MKT-F-007 | Time-series trend analysis view | 时间序列趋势分析视图 | P1 |
| MKT-F-008 | Heatmap for neighborhood price comparison | 社区价格对比热力图 | P1 |

**Dashboard Widgets / 仪表板组件**:

| Widget / 组件 | Chart Type / 图表类型 | Data / 数据 | Priority |
|--------------|----------------------|------------|----------|
| Average Price by Neighborhood | Bar Chart | Aggregate by neighborhood | P0 |
| Price Distribution Histogram | Histogram | Price bins | P0 |
| Price vs Living Area Scatter | Scatter Plot | Correlation view | P0 |
| Year-over-Year Trend | Line Chart | Time series | P1 |
| Property Type Breakdown | Pie/Donut Chart | Category distribution | P1 |
| Quality vs Price Box Plot | Box Plot | Statistical distribution | P1 |

#### 3.3.2 Backend Features (Java/Spring Boot) / 后端功能

| ID | Feature (EN) | Feature (CN) | Priority |
|----|-------------|-------------|----------|
| MKT-B-001 | REST API endpoints for market statistics | 市场统计的REST API端点 | P0 |
| MKT-B-002 | Aggregate statistics: avg, median, min, max, count by dimensions | 聚合统计：按维度计算平均值、中位数、最小值、最大值、计数 | P0 |
| MKT-B-003 | Integration with ML model for what-if predictions | 与ML模型集成进行假设预测 | P0 |
| MKT-B-004 | Caching layer for expensive aggregate queries | 昂贵聚合查询的缓存层 | P0 |
| MKT-B-005 | CSV export generation endpoint | CSV导出生成端点 | P0 |
| MKT-B-006 | PDF report generation endpoint | PDF报告生成端点 | P1 |
| MKT-B-007 | Filtered data table endpoint with pagination | 带分页的筛选数据表格端点 | P0 |
| MKT-B-008 | Cache invalidation on data updates | 数据更新时的缓存失效 | P1 |

---

## 4. Technical Specifications / 技术规范

### 4.1 Next.js App Router Structure / Next.js App Router 结构

```
my-portal/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Portal landing page
│   ├── error.tsx                     # Global error boundary
│   ├── loading.tsx                   # Global loading state
│   ├── globals.css                   # Global styles + Tailwind
│   │
│   ├── (estimator)/                  # App 1 route group
│   │   ├── layout.tsx                # Estimator layout
│   │   ├── page.tsx                  # Estimator home
│   │   ├── new/
│   │   │   ├── page.tsx              # New estimation form (client)
│   │   │   └── loading.tsx           # Form skeleton
│   │   ├── history/
│   │   │   ├── page.tsx              # History list (server)
│   │   │   └── loading.tsx           # Table skeleton
│   │   ├── compare/
│   │   │   └── page.tsx              # Comparison view (client)
│   │   └── result/
│   │       └── [id]/
│   │           ├── page.tsx          # Result detail (server)
│   │           └── loading.tsx       # Result skeleton
│   │
│   ├── (market)/                     # App 2 route group
│   │   ├── layout.tsx                # Market analysis layout
│   │   ├── page.tsx                  # Redirect to dashboard
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Dashboard (client + server)
│   │   │   └── loading.tsx           # Dashboard skeleton
│   │   ├── what-if/
│   │   │   └── page.tsx              # What-if tool (client)
│   │   └── data/
│   │       └── page.tsx              # Data tables (server)
│   │
│   ├── api/                          # Next.js API routes (if needed)
│   │   └── proxy/
│   │       └── [...path]/
│   │           └── route.ts          # Backend proxy
│   │
│   └── not-found.tsx                 # 404 page
│
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/                       # Shared layout components
│   │   ├── app-shell.tsx
│   │   ├── top-nav.tsx
│   │   ├── sidebar.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── footer.tsx
│   │   └── mobile-menu.tsx
│   │
│   ├── shared/                       # Cross-app shared components
│   │   ├── error-fallback.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── data-table.tsx
│   │   ├── chart-container.tsx
│   │   └── export-button.tsx
│   │
│   ├── estimator/                    # App 1 specific components
│   │   ├── property-form.tsx
│   │   ├── prediction-result.tsx
│   │   ├── result-chart.tsx
│   │   ├── history-table.tsx
│   │   ├── compare-view.tsx
│   │   └── property-card.tsx
│   │
│   └── market/                       # App 2 specific components
│       ├── dashboard-grid.tsx
│       ├── filter-panel.tsx
│       ├── price-chart.tsx
│       ├── what-if-tool.tsx
│       ├── data-export.tsx
│       └── market-table.tsx
│
├── hooks/                            # Custom React hooks
│   ├── use-estimation.ts
│   ├── use-history.ts
│   ├── use-comparison.ts
│   ├── use-market-data.ts
│   ├── use-what-if.ts
│   ├── use-export.ts
│   └── use-toast.ts
│
├── lib/                              # Utility libraries
│   ├── utils.ts                      # General utilities
│   ├── api-client.ts                 # API client configuration
│   ├── validators.ts                 # Zod schemas
│   ├── constants.ts                  # App constants
│   └── types.ts                      # TypeScript types
│
├── stores/                           # Zustand stores
│   ├── estimator-store.ts
│   └── market-store.ts
│
├── public/                           # Static assets
│   ├── images/
│   └── fonts/
│
├── styles/                           # Additional styles
│   └── charts.css
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 4.2 Server vs Client Components Strategy / 服务端与客户端组件策略

| Component / 组件 | Type / 类型 | Reason / 原因 |
|-----------------|------------|--------------|
| RootLayout | Server | No interactivity needed, SEO-friendly |
| TopNav | Client | Interactive menu, state for mobile |
| Estimator Form | Client | Form state, validation, user input |
| History List | Server | Data fetching, SEO, fast initial load |
| Dashboard | Mixed | Server for initial data, client for interactivity |
| Data Tables | Server | Pagination, sorting via URL params |
| Charts | Client | Browser-only canvas/SVG rendering |
| Error Boundary | Client | React error catching requires client |

### 4.3 Data Fetching Patterns / 数据获取模式

```typescript
// Pattern 1: Server Component with direct fetch
// 模式1：服务端组件直接获取
async function HistoryPage() {
  const history = await fetch(`${API_BASE}/estimator/history`, {
    next: { revalidate: 60 } // ISR
  });
  return <HistoryTable data={await history.json()} />;
}

// Pattern 2: Server Component with React Query hydration
// 模式2：服务端组件配合React Query注水
async function DashboardPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['market-stats'],
    queryFn: fetchMarketStats
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MarketDashboard />
    </HydrationBoundary>
  );
}

// Pattern 3: Client Component with useQuery
// 模式3：客户端组件使用useQuery
function WhatIfTool() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['what-if', params],
    queryFn: () => fetchWhatIfResult(params),
    staleTime: 5 * 60 * 1000
  });
  // ...
}
```

### 4.4 Python Backend Structure (FastAPI) / Python后端结构

```
estimator-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI application entry
│   ├── config.py                     # Configuration & env vars
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py                 # Main API router
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── predict.py        # Prediction endpoints
│   │   │   │   ├── history.py        # History endpoints
│   │   │   │   ├── compare.py        # Comparison endpoints
│   │   │   │   └── health.py         # Health checks
│   │   │   └── deps.py               # Dependencies (DB, etc.)
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── exceptions.py             # Custom exceptions
│   │   ├── logging.py                # Logging configuration
│   │   └── middleware.py             # CORS, logging middleware
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py                # Pydantic request/response models
│   │   └── database.py               # SQLAlchemy models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ml_client.py              # ML model service client
│   │   ├── predictor.py              # Prediction orchestration
│   │   └── history_service.py        # History CRUD operations
│   │
│   └── db/
│       ├── __init__.py
│       ├── session.py                # Database session management
│       └── migrations/               # Alembic migrations
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_predict.py
│   ├── test_history.py
│   └── test_compare.py
│
├── Dockerfile
├── requirements.txt
├── alembic.ini
└── pyproject.toml
```

### 4.5 Java Backend Structure (Spring Boot) / Java后端结构

```
market-backend/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── portal/
│   │   │           └── market/
│   │   │               ├── MarketAnalysisApplication.java
│   │   │               │
│   │   │               ├── config/
│   │   │               │   ├── CacheConfig.java
│   │   │               │   ├── WebConfig.java
│   │   │               │   ├── SecurityConfig.java
│   │   │               │   └── JacksonConfig.java
│   │   │               │
│   │   │               ├── controller/
│   │   │               │   ├── DashboardController.java
│   │   │               │   ├── StatisticsController.java
│   │   │               │   ├── WhatIfController.java
│   │   │               │   ├── ExportController.java
│   │   │               │   └── HealthController.java
│   │   │               │
│   │   │               ├── service/
│   │   │               │   ├── DashboardService.java
│   │   │               │   ├── StatisticsService.java
│   │   │               │   ├── WhatIfService.java
│   │   │               │   ├── ExportService.java
│   │   │               │   ├── CacheService.java
│   │   │               │   └── MLClientService.java
│   │   │               │
│   │   │               ├── repository/
│   │   │               │   ├── PropertyRepository.java
│   │   │               │   └── MarketDataRepository.java
│   │   │               │
│   │   │               ├── model/
│   │   │               │   ├── entity/
│   │   │               │   │   ├── Property.java
│   │   │               │   │   └── MarketSnapshot.java
│   │   │               │   ├── dto/
│   │   │               │   │   ├── MarketStatsDTO.java
│   │   │               │   │   ├── FilterRequestDTO.java
│   │   │               │   │   ├── WhatIfRequestDTO.java
│   │   │               │   │   └── ExportRequestDTO.java
│   │   │               │   └── enums/
│   │   │               │       ├── Neighborhood.java
│   │   │               │       └── HouseStyle.java
│   │   │               │
│   │   │               ├── exception/
│   │   │               │   ├── GlobalExceptionHandler.java
│   │   │               │   ├── MLServiceException.java
│   │   │               │   └── DataNotFoundException.java
│   │   │               │
│   │   │               └── client/
│   │   │                   └── MLModelClient.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/
│   │           └── migration/
│   │               ├── V1__init_schema.sql
│   │               └── V2__add_indexes.sql
│   │
│   └── test/
│       └── java/
│           └── com/
│               └── portal/
│                   └── market/
│                       ├── controller/
│                       ├── service/
│                       └── repository/
│
├── pom.xml
├── Dockerfile
└── README.md
```

---

## 5. API Design / API设计

### 5.1 App 1: Property Value Estimator API / 应用1 API

#### 5.1.1 Predict Property Value / 预测房产价值

```yaml
Endpoint: POST /api/v1/estimator/predict
Description: Submit property details and receive value prediction
描述: 提交房产详情并接收价值预测

Request Body:
  content-type: application/json
  schema:
    type: object
    required: [lot_area, overall_qual, overall_cond, year_built, gr_liv_area, neighborhood]
    properties:
      lot_area:        { type: integer, minimum: 1, description: "Lot area in sq ft" }
      overall_qual:    { type: integer, minimum: 1, maximum: 10 }
      overall_cond:    { type: integer, minimum: 1, maximum: 10 }
      year_built:      { type: integer, minimum: 1800 }
      year_remod:      { type: integer, minimum: 1800 }
      total_bsmt_sf:   { type: integer, minimum: 0 }
      first_flr_sf:    { type: integer, minimum: 1 }
      second_flr_sf:   { type: integer, minimum: 0 }
      gr_liv_area:     { type: integer, minimum: 1 }
      full_bath:       { type: integer, minimum: 0 }
      half_bath:       { type: integer, minimum: 0 }
      bedroom:         { type: integer, minimum: 0 }
      kitchen:         { type: integer, minimum: 0 }
      tot_rms_abv_grd: { type: integer, minimum: 0 }
      garage_cars:     { type: integer, minimum: 0 }
      garage_area:     { type: integer, minimum: 0 }
      neighborhood:    { type: string, enum: ["Blmngtn", "Blueste", "BrDale", ...] }
      house_style:     { type: string, enum: ["1Story", "2Story", "1.5Fin", ...] }
      sale_type:       { type: string, enum: ["WD", "New", "COD", ...] }

Response 200 OK:
  content-type: application/json
  schema:
    type: object
    properties:
      estimate_id:     { type: string, format: uuid }
      predicted_value: { type: number, description: "Predicted sale price in USD" }
      confidence_interval:
        type: object
        properties:
          lower: { type: number }
          upper: { type: number }
      feature_importance:
        type: array
        items:
          type: object
          properties:
            feature: { type: string }
            importance: { type: number }
      created_at: { type: string, format: date-time }

Response 422 Unprocessable Entity:
  schema:
    type: object
    properties:
      detail:
        type: array
        items:
          type: object
          properties:
            loc:   { type: array, items: { type: string } }
            msg:   { type: string }
            type:  { type: string }
```

#### 5.1.2 Batch Predict (Comparison) / 批量预测（对比）

```yaml
Endpoint: POST /api/v1/estimator/predict/batch
Description: Submit multiple properties for comparison
描述: 提交多个房产进行对比

Request Body:
  schema:
    type: object
    properties:
      properties:
        type: array
        minItems: 2
        maxItems: 4
        items:
          $ref: "#/components/schemas/PropertyInput"

Response 200 OK:
  schema:
    type: object
    properties:
      results:
        type: array
        items:
          type: object
          properties:
            estimate_id:     { type: string }
            property_index:  { type: integer }
            predicted_value: { type: number }
            confidence_interval:
              type: object
              properties:
                lower: { type: number }
                upper: { type: number }
      comparison_summary:
        type: object
        properties:
          highest_value:   { type: number }
          lowest_value:    { type: number }
          average_value:   { type: number }
          value_range:     { type: number }
```

#### 5.1.3 Get Estimation History / 获取估值历史

```yaml
Endpoint: GET /api/v1/estimator/history
Description: Retrieve paginated estimation history
描述: 检索分页估值历史

Query Parameters:
  page:      { type: integer, default: 1, minimum: 1 }
  page_size: { type: integer, default: 20, minimum: 1, maximum: 100 }
  search:    { type: string, description: "Search by neighborhood or notes" }
  sort_by:   { type: string, enum: [created_at, predicted_value], default: created_at }
  sort_order:{ type: string, enum: [asc, desc], default: desc }

Response 200 OK:
  schema:
    type: object
    properties:
      items:
        type: array
        items:
          type: object
          properties:
            estimate_id:     { type: string }
            property_summary:{ type: string }
            predicted_value: { type: number }
            neighborhood:    { type: string }
            created_at:      { type: string, format: date-time }
      total:       { type: integer }
      page:        { type: integer }
      page_size:   { type: integer }
      total_pages: { type: integer }
```

#### 5.1.4 Get Single Estimate / 获取单个估值

```yaml
Endpoint: GET /api/v1/estimator/history/{estimate_id}
Description: Retrieve a single estimation by ID
描述: 通过ID检索单个估值

Response 200 OK:
  schema:
    type: object
    properties:
      estimate_id:     { type: string }
      input_data:      { $ref: "#/components/schemas/PropertyInput" }
      predicted_value: { type: number }
      confidence_interval:
        type: object
        properties:
          lower: { type: number }
          upper: { type: number }
      feature_importance:
        type: array
        items:
          type: object
          properties:
            feature:    { type: string }
            importance: { type: number }
      created_at: { type: string, format: date-time }

Response 404 Not Found:
  schema:
    type: object
    properties:
      detail: { type: string, example: "Estimate not found" }
```

#### 5.1.5 Health Check / 健康检查

```yaml
Endpoint: GET /api/v1/health
Description: Service health and readiness check
描述: 服务健康和就绪检查

Response 200 OK:
  schema:
    type: object
    properties:
      status:    { type: string, enum: [healthy, degraded] }
      version:   { type: string }
      timestamp: { type: string, format: date-time }
      checks:
        type: object
        properties:
          database:   { type: string, enum: [ok, error] }
          ml_service: { type: string, enum: [ok, error] }
```

---

### 5.2 App 2: Property Market Analysis API / 应用2 API

#### 5.2.1 Get Market Statistics / 获取市场统计

```yaml
Endpoint: GET /api/v1/market/statistics
Description: Retrieve aggregate market statistics with optional filters
描述: 检索聚合市场统计，支持可选筛选

Query Parameters:
  neighborhood:   { type: string, description: "Filter by neighborhood" }
  price_min:      { type: number, description: "Minimum price filter" }
  price_max:      { type: number, description: "Maximum price filter" }
  year_built_min: { type: integer, description: "Minimum year built" }
  year_built_max: { type: integer, description: "Maximum year built" }
  house_style:    { type: string, enum: ["1Story", "2Story", ...] }

Response 200 OK:
  schema:
    type: object
    properties:
      overall:
        type: object
        properties:
          count:          { type: integer }
          avg_price:      { type: number }
          median_price:   { type: number }
          min_price:      { type: number }
          max_price:      { type: number }
          std_deviation:  { type: number }
          avg_living_area:{ type: number }
      by_neighborhood:
        type: array
        items:
          type: object
          properties:
            neighborhood: { type: string }
            count:        { type: integer }
            avg_price:    { type: number }
            median_price: { type: number }
      by_year:
        type: array
        items:
          type: object
          properties:
            year:      { type: integer }
            count:     { type: integer }
            avg_price: { type: number }
      price_distribution:
        type: array
        items:
          type: object
          properties:
            range: { type: string, example: "100000-150000" }
            count: { type: integer }
      cached: { type: boolean, description: "Whether response was served from cache" }
      generated_at: { type: string, format: date-time }
```

#### 5.2.2 Get Dashboard Data / 获取仪表板数据

```yaml
Endpoint: GET /api/v1/market/dashboard
Description: Retrieve all data needed for the dashboard widgets
描述: 检索仪表板组件所需的所有数据

Query Parameters:
  period:    { type: string, enum: [1y, 3y, 5y, all], default: all }
  neighborhood: { type: string }

Response 200 OK:
  schema:
    type: object
    properties:
      summary_cards:
        type: object
        properties:
          total_properties:   { type: integer }
          avg_price:          { type: number }
          price_change_pct:   { type: number }
          top_neighborhood:   { type: string }
      price_by_neighborhood:
        type: array
        items:
          type: object
          properties:
            neighborhood: { type: string }
            avg_price:    { type: number }
            count:        { type: integer }
      price_trend:
        type: array
        items:
          type: object
          properties:
            year:      { type: integer }
            avg_price: { type: number }
            count:     { type: integer }
      price_vs_area:
        type: array
        items:
          type: object
          properties:
            living_area: { type: number }
            price:       { type: number }
            neighborhood:{ type: string }
      property_type_breakdown:
        type: array
        items:
          type: object
          properties:
            house_style: { type: string }
            count:       { type: integer }
            avg_price:   { type: number }
```

#### 5.2.3 What-If Analysis / 假设分析

```yaml
Endpoint: POST /api/v1/market/what-if
Description: Run what-if scenario by modifying property parameters
描述: 通过修改房产参数运行假设场景

Request Body:
  schema:
    type: object
    required: [base_property, modifications]
    properties:
      base_property:
        $ref: "#/components/schemas/PropertyInput"
      modifications:
        type: object
        description: "Key-value pairs of fields to modify"
        properties:
          overall_qual:    { type: integer, minimum: 1, maximum: 10 }
          gr_liv_area:     { type: integer, minimum: 1 }
          garage_cars:     { type: integer, minimum: 0 }
          year_remod:      { type: integer }
          # ... other modifiable fields

Response 200 OK:
  schema:
    type: object
    properties:
      base_prediction:
        type: object
        properties:
          predicted_value: { type: number }
          confidence_interval:
            type: object
            properties:
              lower: { type: number }
              upper: { type: number }
      modified_prediction:
        type: object
        properties:
          predicted_value: { type: number }
          confidence_interval:
            type: object
            properties:
              lower: { type: number }
              upper: { type: number }
      value_difference:    { type: number }
      percentage_change:   { type: number }
      impact_analysis:
        type: array
        items:
          type: object
          properties:
            field:      { type: string }
            old_value:  { type: string }
            new_value:  { type: string }
            impact:     { type: number, description: "Contribution to price change" }
```

#### 5.2.4 Get Filtered Data Table / 获取筛选数据表格

```yaml
Endpoint: GET /api/v1/market/data
Description: Retrieve paginated, filtered property data for tables
描述: 检索分页、筛选后的房产数据用于表格

Query Parameters:
  page:           { type: integer, default: 1 }
  page_size:      { type: integer, default: 50, maximum: 500 }
  sort_by:        { type: string, default: sale_price }
  sort_order:     { type: string, enum: [asc, desc], default: desc }
  neighborhood:   { type: string }
  price_min:      { type: number }
  price_max:      { type: number }
  year_built_min: { type: integer }
  year_built_max: { type: integer }
  house_style:    { type: string }
  search:         { type: string, description: "Full-text search" }

Response 200 OK:
  schema:
    type: object
    properties:
      items:
        type: array
        items:
          type: object
          properties:
            id:              { type: integer }
            neighborhood:    { type: string }
            house_style:     { type: string }
            year_built:      { type: integer }
            year_remod:      { type: integer }
            lot_area:        { type: integer }
            gr_liv_area:     { type: integer }
            overall_qual:    { type: integer }
            overall_cond:    { type: integer }
            sale_price:      { type: number }
            sale_date:       { type: string, format: date }
      total:       { type: integer }
      page:        { type: integer }
      page_size:   { type: integer }
      total_pages: { type: integer }
      filters_applied:
        type: object
        description: "Echo of applied filters"
```

#### 5.2.5 Export Data / 导出数据

```yaml
Endpoint: POST /api/v1/market/export
Description: Generate and return data export in requested format
描述: 生成并返回请求格式的数据导出

Request Body:
  schema:
    type: object
    required: [format]
    properties:
      format:     { type: string, enum: [csv, pdf] }
      filters:
        type: object
        properties:
          neighborhood:   { type: string }
          price_min:      { type: number }
          price_max:      { type: number }
          year_built_min: { type: integer }
          year_built_max: { type: integer }
      columns:
        type: array
        items: { type: string }
        description: "Columns to include in export"

Response 200 OK (CSV):
  content-type: text/csv
  body: CSV file content

Response 200 OK (PDF):
  content-type: application/pdf
  body: PDF file content

Response 202 Accepted:
  description: Export is being generated asynchronously
  schema:
    type: object
    properties:
      job_id:      { type: string }
      status:      { type: string, enum: [processing] }
      check_url:   { type: string, format: uri }
```

#### 5.2.6 Check Export Status / 检查导出状态

```yaml
Endpoint: GET /api/v1/market/export/{job_id}/status
Description: Check status of asynchronous export job
描述: 检查异步导出任务状态

Response 200 OK:
  schema:
    type: object
    properties:
      job_id:     { type: string }
      status:     { type: string, enum: [pending, processing, completed, failed] }
      progress:   { type: integer, minimum: 0, maximum: 100 }
      download_url: { type: string, format: uri, nullable: true }
      created_at: { type: string, format: date-time }
      completed_at: { type: string, format: date-time, nullable: true }
```

#### 5.2.7 Health Check / 健康检查

```yaml
Endpoint: GET /api/v1/health
Description: Service health and readiness check
描述: 服务健康和就绪检查

Response 200 OK:
  schema:
    type: object
    properties:
      status:     { type: string, enum: [healthy, degraded] }
      version:    { type: string }
      timestamp:  { type: string, format: date-time }
      checks:
        type: object
        properties:
          database:   { type: string, enum: [ok, error] }
          ml_service: { type: string, enum: [ok, error] }
          cache:      { type: string, enum: [ok, error] }
```

---

### 5.3 ML Model Service API (housing-price-api Integration) / ML模型服务API

```yaml
Endpoint: POST /api/v1/model/predict
Description: Direct ML model inference endpoint
描述: 直接ML模型推理端点

Request Body:
  schema:
    type: object
    required: [features]
    properties:
      features:
        type: object
        description: "Preprocessed feature vector matching model input"
      return_explanation:
        type: boolean
        default: false
        description: "Whether to return SHAP/feature importance values"

Response 200 OK:
  schema:
    type: object
    properties:
      prediction:    { type: number }
      confidence:    { type: number }
      explanation:
        type: object
        nullable: true
        properties:
          feature_importance:
            type: array
            items:
              type: object
              properties:
                feature:    { type: string }
                importance: { type: number }
                value:      { type: number }
      model_version: { type: string }
      inference_time_ms: { type: number }
```

---

## 6. UI/UX Design / UI/UX设计

### 6.1 Design System / 设计系统

#### 6.1.1 Color Palette / 色彩方案

```
Primary Colors / 主色:
  --color-primary-50:   #eff6ff   (blue-50)
  --color-primary-100:  #dbeafe   (blue-100)
  --color-primary-200:  #bfdbfe   (blue-200)
  --color-primary-300:  #93c5fd   (blue-300)
  --color-primary-400:  #60a5fa   (blue-400)
  --color-primary-500:  #3b82f6   (blue-500)  ← Primary
  --color-primary-600:  #2563eb   (blue-600)
  --color-primary-700:  #1d4ed8   (blue-700)
  --color-primary-800:  #1e40af   (blue-800)
  --color-primary-900:  #1e3a8a   (blue-900)

Secondary Colors / 辅色:
  --color-secondary-500: #10b981  (emerald-500)  ← App 1 accent
  --color-accent-500:    #f59e0b  (amber-500)    ← App 2 accent

Semantic Colors / 语义色:
  --color-success: #22c55e  (green-500)
  --color-warning: #f59e0b  (amber-500)
  --color-error:   #ef4444  (red-500)
  --color-info:    #3b82f6  (blue-500)

Neutral Colors / 中性色:
  --color-background: #ffffff
  --color-surface:    #f8fafc   (slate-50)
  --color-border:     #e2e8f0   (slate-200)
  --color-text-primary:   #0f172a   (slate-900)
  --color-text-secondary: #64748b   (slate-500)
  --color-text-muted:     #94a3b8   (slate-400)
```

#### 6.1.2 Typography / 字体

```
Font Family / 字体族:
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace

Font Sizes / 字号:
  --text-xs:   0.75rem   (12px)   - Captions, badges
  --text-sm:   0.875rem  (14px)   - Secondary text
  --text-base: 1rem      (16px)   - Body text
  --text-lg:   1.125rem  (18px)   - Lead paragraphs
  --text-xl:   1.25rem   (20px)   - Card titles
  --text-2xl:  1.5rem    (24px)   - Section headings
  --text-3xl:  1.875rem  (30px)   - Page titles
  --text-4xl:  2.25rem   (36px)   - Hero titles

Font Weights / 字重:
  --font-normal:   400
  --font-medium:   500
  --font-semibold: 600
  --font-bold:     700
```

#### 6.1.3 Spacing & Layout / 间距与布局

```
Spacing Scale / 间距尺度:
  --space-1: 0.25rem  (4px)
  --space-2: 0.5rem   (8px)
  --space-3: 0.75rem  (12px)
  --space-4: 1rem     (16px)
  --space-5: 1.25rem  (20px)
  --space-6: 1.5rem   (24px)
  --space-8: 2rem     (32px)
  --space-10: 2.5rem  (40px)
  --space-12: 3rem    (48px)
  --space-16: 4rem    (64px)

Layout / 布局:
  --max-width-content: 1280px
  --max-width-prose:   768px
  --sidebar-width:     256px
  --header-height:     64px
  --footer-height:     48px

Border Radius / 圆角:
  --radius-sm:  0.25rem  (4px)
  --radius-md:  0.375rem (6px)
  --radius-lg:  0.5rem   (8px)
  --radius-xl:  0.75rem  (12px)
  --radius-2xl: 1rem     (16px)
```

#### 6.1.4 Shadows & Elevation / 阴影与层级

```
Shadows / 阴影:
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05)
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1)
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1)
  --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1)

Elevation Levels / 层级:
  Level 0: Flat elements (inputs, plain text)
  Level 1: Cards, panels (--shadow-sm)
  Level 2: Dropdowns, popovers (--shadow-md)
  Level 3: Modals, dialogs (--shadow-lg)
  Level 4: Toasts, notifications (--shadow-xl)
```

### 6.2 Component Specifications / 组件规范

#### 6.2.1 Navigation Components / 导航组件

**Top Navigation Bar / 顶部导航栏**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  Property Portal        [App 1] [App 2]        [Theme] [User ▼]     │
│                                ────────                                     │
│                                Active indicator                             │
└─────────────────────────────────────────────────────────────────────────────┘

Height: 64px
Background: white with bottom border
Position: sticky top-0 z-50
Shadow on scroll: shadow-sm
```

**Application Switcher / 应用切换器**:
```
Desktop: Horizontal tabs in top nav
Mobile: Dropdown menu or bottom sheet

Active state:
  - Text: primary-600, font-semibold
  - Indicator: 2px bottom border, primary-500
  - Background: primary-50

Inactive state:
  - Text: slate-600
  - Hover: text-primary-600, bg-slate-50
```

**Sidebar (App-specific) / 侧边栏（应用特定）**:
```
Width: 256px (desktop), full-screen overlay (mobile)
Background: slate-50
Border: right, 1px, slate-200

Collapsible: Chevron button at bottom
Collapsed width: 64px (icons only)

Navigation items:
  - Icon + Label
  - Active: bg-primary-50, text-primary-700, left border 3px primary-500
  - Hover: bg-slate-100
```

#### 6.2.2 Form Components / 表单组件

**Property Input Form / 房产输入表单**:
```
Layout: 2-column grid on desktop, 1-column on mobile
Gap: 24px between fields

Field structure:
  ┌─────────────────────────────────────┐
  │ Label *                             │
  │ ┌─────────────────────────────────┐ │
  │ │ Placeholder text                │ │
  │ └─────────────────────────────────┘ │
  │ Helper text / Error message         │
  └─────────────────────────────────────┘

Field states:
  Default: border-slate-300
  Focus: border-primary-500, ring-2 ring-primary-200
  Error: border-red-500, ring-2 ring-red-200
  Disabled: bg-slate-100, text-slate-400

Submit button:
  - Full width on mobile, auto on desktop
  - Primary style with loading spinner
  - Disabled during submission
```

**Validation Feedback / 验证反馈**:
```
Inline validation: On blur + On submit
Error display: Red text below field with icon
Success: Green checkmark on valid fields (optional)

Error message style:
  Color: red-600
  Size: text-sm
  Icon: AlertCircle (16px)
  Animation: fade-in + slight translate-y
```

#### 6.2.3 Data Display Components / 数据展示组件

**Result Card / 结果卡片**:
```
┌─────────────────────────────────────────────┐
│  📊 Prediction Result                         │
│  ─────────────────────────────────────────  │
│                                             │
│  Estimated Value                            │
│  ┌─────────────────────────────────────┐   │
│  │           $285,000                  │   │
│  │     ($265,000 - $305,000)           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Feature Importance Chart]                 │
│  ┌─────────────────────────────────────┐   │
│  │ ████████████ Overall Qual   28%     │   │
│  │ ██████████   Gr Liv Area    22%     │   │
│  │ ███████      Garage Cars    15%     │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Save] [Compare] [Share]                   │
└─────────────────────────────────────────────┘

Background: white
Border: 1px, slate-200
Border-radius: lg (8px)
Shadow: shadow-md
Padding: 24px
```

**Comparison View / 对比视图**:
```
Desktop: Side-by-side cards (2-4 columns)
Mobile: Horizontal scroll or stacked cards

Comparison table:
  ┌─────────────┬──────────┬──────────┬──────────┐
  │ Feature     │ Property1│ Property2│ Property3│
  ├─────────────┼──────────┼──────────┼──────────┤
  │ Predicted   │ $285,000 │ $320,000 │ $250,000 │
  │ Lot Area    │ 8,000    │ 10,000   │ 7,500    │
  │ ...         │ ...      │ ...      │ ...      │
  └─────────────┴──────────┴──────────┴──────────┘

Highlighting:
  - Best value: green background
  - Worst value: red background
  - Differences: delta indicators (↑↓)
```

#### 6.2.4 Dashboard Components / 仪表板组件

**Dashboard Grid / 仪表板网格**:
```
Layout: CSS Grid, responsive
  Desktop: 3 columns
  Tablet:  2 columns
  Mobile:  1 column

Gap: 24px
Widget min-height: 300px

Widget types:
  - Stat cards: 1x1
  - Charts: 2x1 or 1x1
  - Tables: 3x1 or full-width
```

**Chart Specifications / 图表规范**:
```
Bar Chart:
  - Bar color: primary-500
  - Hover: primary-600
  - Grid: slate-100, dashed
  - Axis text: slate-500, text-sm
  - Tooltip: white bg, shadow-lg, rounded-lg

Line Chart:
  - Line color: primary-500, 2px stroke
  - Area fill: primary-100, 0.3 opacity
  - Points: primary-500, 6px radius
  - Hover point: primary-700, 8px radius

Pie/Donut Chart:
  - Colors: primary-500, secondary-500, accent-500, + extended palette
  - Legend: right side or bottom
  - Hover: expand slice by 5px

Scatter Plot:
  - Point color: primary-500, 4px radius
  - Hover: primary-700, 6px radius
  - Trend line: dashed, slate-400
```

### 6.3 Responsive Breakpoints / 响应式断点

| Breakpoint / 断点 | Width / 宽度 | Layout Changes / 布局变化 |
|------------------|-------------|--------------------------|
| Mobile / 移动端 | < 640px | Single column, stacked nav, full-width cards |
| Tablet / 平板 | 640px - 1024px | 2-column grid, collapsible sidebar |
| Desktop / 桌面 | 1024px - 1280px | 3-column grid, fixed sidebar |
| Wide / 宽屏 | > 1280px | Max-width container centered, 3-4 column grid |

### 6.4 Accessibility Requirements / 可访问性要求

| Requirement (EN) | Requirement (CN) | WCAG Level |
|-----------------|------------------|------------|
| All interactive elements keyboard accessible | 所有交互元素支持键盘访问 | A |
| Focus indicators visible on all focusable elements | 所有可聚焦元素显示焦点指示器 | A |
| Color contrast ratio minimum 4.5:1 for text | 文字色彩对比度最低4.5:1 | AA |
| Color contrast ratio minimum 3:1 for UI components | UI组件色彩对比度最低3:1 | AA |
| Form labels associated with inputs via htmlFor | 表单标签通过htmlFor与输入关联 | A |
| Error messages linked to inputs via aria-describedby | 错误消息通过aria-describedby关联输入 | A |
| Charts include data tables or aria-labels | 图表包含数据表格或aria-label | AA |
| Skip navigation link provided | 提供跳过导航链接 | A |
| Page title updates on route change | 路由变化时更新页面标题 | A |
| Toast notifications use role="alert" or role="status" | Toast通知使用role="alert"或role="status" | A |
| Modal dialogs trap focus and have close button | 模态对话框捕获焦点并有关闭按钮 | A |
| All images have alt text | 所有图片有alt文本 | A |

### 6.5 Loading & Empty States / 加载与空状态

**Skeleton Loaders / 骨架屏**:
```
Card skeleton:
  ┌─────────────────────────────────────┐
  │ ▓▓▓▓▓▓▓▓▓▓ (title)                  │
  │                                     │
  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
  └─────────────────────────────────────┘

Animation: pulse, 2s duration, infinite
Background: slate-200
Rounded: same as content
```

**Empty States / 空状态**:
```
No history:
  ┌─────────────────────────────────────┐
  │           📋                        │
  │     No estimates yet                │
  │                                     │
  │  Create your first property         │
  │  estimate to see it here.           │
  │                                     │
  │     [Create Estimate]               │
  └─────────────────────────────────────┘

Icon: 48px, slate-400
Title: text-lg, font-semibold, slate-700
Description: text-sm, slate-500
Action: primary button
```

---

## 7. Data Flow & State Management / 数据流与状态管理

### 7.1 Data Flow Architecture / 数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAM / 数据流图                        │
│                                                                             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   User       │────────▶│   Client     │────────▶│   Server     │       │
│   │   Action     │         │   State      │         │   Action     │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│          │                        │                        │                │
│          ▼                        ▼                        ▼                │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   Form       │         │   Zustand    │         │   React      │       │
│   │   Input      │         │   Store      │         │   Server     │       │
│   │              │         │              │         │   Component  │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│          │                        │                        │                │
│          │                        │                        ▼                │
│          │                        │                 ┌──────────────┐       │
│          │                        │                 │   API        │       │
│          │                        │                 │   Route      │       │
│          │                        │                 └──────────────┘       │
│          │                        │                        │                │
│          │                        │                        ▼                │
│          │                        │                 ┌──────────────┐       │
│          │                        │                 │   Backend    │       │
│          │                        │                 │   Service    │       │
│          │                        │                 └──────────────┘       │
│          │                        │                        │                │
│          │                        │                        ▼                │
│          │                        │                 ┌──────────────┐       │
│          │                        │                 │   ML Model   │       │
│          │                        │                 │   / Database │       │
│          │                        │                 └──────────────┘       │
│          │                        │                        │                │
│          │                        ▼                        │                │
│          │                 ┌──────────────┐               │                │
│          │                 │   React      │◀──────────────┘                │
│          │                 │   Query      │                                │
│          │                 │   Cache      │                                │
│          │                 └──────────────┘                                │
│          │                        │                                        │
│          ▼                        ▼                                        │
│   ┌──────────────┐         ┌──────────────┐                                │
│   │   UI         │◀────────│   Hydrated   │                                │
│   │   Update     │         │   Data       │                                │
│   └──────────────┘         └──────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 State Management Strategy / 状态管理策略

#### 7.2.1 Server State (React Query) / 服务端状态

```typescript
// Query keys structure / 查询键结构
const queryKeys = {
  estimator: {
    history: (filters: HistoryFilters) => ['estimator', 'history', filters],
    estimate: (id: string) => ['estimator', 'estimate', id],
    predict: () => ['estimator', 'predict'],
  },
  market: {
    dashboard: (filters: DashboardFilters) => ['market', 'dashboard', filters],
    statistics: (filters: StatFilters) => ['market', 'statistics', filters],
    data: (filters: DataFilters) => ['market', 'data', filters],
    whatIf: (params: WhatIfParams) => ['market', 'what-if', params],
    export: (jobId: string) => ['market', 'export', jobId],
  },
};

// Cache configuration / 缓存配置
const defaultQueryConfig = {
  staleTime: 5 * 60 * 1000,    // 5 minutes
  gcTime: 10 * 60 * 1000,      // 10 minutes
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: false,
};
```

#### 7.2.2 Client State (Zustand) / 客户端状态

```typescript
// Estimator Store / 估值器状态存储
interface EstimatorState {
  // Form state
  formData: Partial<PropertyInput>;
  formErrors: Record<string, string>;
  isSubmitting: boolean;
  
  // Comparison state
  comparisonItems: EstimateResult[];
  
  // UI state
  activeTab: 'form' | 'history' | 'compare';
  
  // Actions
  setFormData: (data: Partial<PropertyInput>) => void;
  setFormErrors: (errors: Record<string, string>) => void;
  addToComparison: (estimate: EstimateResult) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
  setActiveTab: (tab: EstimatorState['activeTab']) => void;
}

// Market Store / 市场分析状态存储
interface MarketState {
  // Filter state
  filters: MarketFilters;
  
  // Dashboard state
  selectedWidgets: string[];
  widgetLayouts: Record<string, WidgetLayout>;
  
  // Export state
  activeExportJobs: string[];
  
  // Actions
  setFilters: (filters: Partial<MarketFilters>) => void;
  resetFilters: () => void;
  toggleWidget: (widgetId: string) => void;
  addExportJob: (jobId: string) => void;
  removeExportJob: (jobId: string) => void;
}
```

### 7.3 Form State Management / 表单状态管理

```typescript
// React Hook Form + Zod integration
const propertySchema = z.object({
  lot_area: z.number().min(1, 'Lot area must be greater than 0'),
  overall_qual: z.number().min(1).max(10),
  overall_cond: z.number().min(1).max(10),
  year_built: z.number().min(1800).max(new Date().getFullYear()),
  gr_liv_area: z.number().min(1),
  neighborhood: z.string().min(1, 'Neighborhood is required'),
  // ... other fields
});

type PropertyFormData = z.infer<typeof propertySchema>;

function PropertyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      lot_area: 0,
      overall_qual: 5,
      overall_cond: 5,
      year_built: 2000,
      // ...
    },
  });

  const predictMutation = useMutation({
    mutationFn: submitPrediction,
    onSuccess: (data) => {
      // Invalidate history cache
      queryClient.invalidateQueries({ queryKey: ['estimator', 'history'] });
      // Show success toast
      toast.success('Prediction completed successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Prediction failed');
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    predictMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 7.4 Error Handling Flow / 错误处理流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING FLOW / 错误处理流程                      │
│                                                                             │
│  Error Source          Handler              User Feedback                   │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  API 4xx/5xx    →    React Query onError    →    Toast notification         │
│                      (auto-retry x3)            + Form field errors         │
│                                                                             │
│  Validation     →    Zod resolver           →    Inline field errors        │
│  (client-side)       (React Hook Form)          + Error summary             │
│                                                                             │
│  Network fail   →    React Query retry      →    Retry button               │
│                      + fallback cache           + Offline indicator         │
│                                                                             │
│  ML Service     →    Backend error handler  →    Graceful fallback          │
│  unavailable         (return cached/            + Warning message           │
│                      default values)                                        │
│                                                                             │
│  Uncaught JS    →    Error Boundary         →    Friendly error page        │
│  exception           (componentDidCatch)        + Report button             │
│                                                                             │
│  404 Route      →    not-found.tsx          →    Custom 404 page            │
│                      (Next.js)                  + Navigation links          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Non-functional Requirements / 非功能需求

### 8.1 Performance Requirements / 性能需求

| Metric / 指标 | Target / 目标 | Measurement / 测量方式 |
|--------------|--------------|----------------------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Prediction API response time (p95) | < 2s | Backend metrics |
| Market stats API response time (p95) | < 3s | Backend metrics |
| Dashboard initial load | < 3s | Lighthouse |
| History list load (50 items) | < 1s | Lighthouse |
| Data table sort/filter | < 500ms | Client-side timing |

### 8.2 Scalability Requirements / 可扩展性需求

| Requirement (EN) | Requirement (CN) | Target |
|-----------------|------------------|--------|
| Support concurrent users | 支持并发用户 | 1,000+ |
| Handle prediction requests per minute | 处理每分钟预测请求 | 10,000+ |
| History storage capacity | 历史存储容量 | 10M+ records |
| Market data set size | 市场数据集大小 | 100K+ properties |
| Horizontal scaling of backend services | 后端服务水平扩展 | Auto-scaling 2-10 instances |

### 8.3 Security Requirements / 安全需求

| Requirement (EN) | Requirement (CN) | Implementation |
|-----------------|------------------|---------------|
| HTTPS for all communications | 所有通信使用HTTPS | TLS 1.3 |
| Input validation and sanitization | 输入验证和清理 | Zod (client) + Pydantic/Bean Validation (server) |
| SQL injection prevention | SQL注入防护 | ORM parameterized queries |
| XSS prevention | XSS防护 | React auto-escaping + CSP headers |
| CSRF protection | CSRF防护 | SameSite cookies + CSRF tokens |
| Rate limiting | 速率限制 | 100 requests/minute per IP |
| Secure headers | 安全响应头 | HSTS, X-Frame-Options, X-Content-Type-Options |
| Dependency scanning | 依赖扫描 | Snyk / Dependabot |
| Container security | 容器安全 | Non-root user, minimal base images |

### 8.4 Reliability Requirements / 可靠性需求

| Requirement (EN) | Requirement (CN) | Target |
|-----------------|------------------|--------|
| System uptime | 系统可用性 | 99.9% |
| ML service fallback | ML服务降级 | Return cached predictions or default estimates |
| Database backup frequency | 数据库备份频率 | Daily automated backups |
| Recovery Time Objective (RTO) | 恢复时间目标 | < 1 hour |
| Recovery Point Objective (RPO) | 恢复点目标 | < 15 minutes |

### 8.5 Monitoring & Observability / 监控与可观测性

| Component / 组件 | Tool / 工具 | Metrics / 指标 |
|-----------------|------------|---------------|
| Frontend performance | Vercel Analytics / Lighthouse | Core Web Vitals |
| Backend metrics | Prometheus + Grafana | Request rate, latency, error rate |
| Logging | ELK Stack / Loki | Structured JSON logs |
| Distributed tracing | Jaeger / Zipkin | Request tracing across services |
| Error tracking | Sentry | Frontend + backend exceptions |
| Uptime monitoring | UptimeRobot / Pingdom | Endpoint health checks |

---

## 9. Development Plan / 开发计划

### 9.1 Phase Breakdown / 阶段划分

#### Phase 1: Foundation (Week 1-2) / 第一阶段：基础

| Task (EN) | Task (CN) | Owner | Duration |
|-----------|-----------|-------|----------|
| Set up Next.js project with App Router | 使用App Router搭建Next.js项目 | Frontend | 2 days |
| Configure Tailwind CSS and design tokens | 配置Tailwind CSS和设计令牌 | Frontend | 2 days |
| Set up shadcn/ui component library | 配置shadcn/ui组件库 | Frontend | 2 days |
| Create shared layout and navigation | 创建共享布局和导航 | Frontend | 3 days |
| Set up Python FastAPI project structure | 搭建Python FastAPI项目结构 | Backend (Py) | 2 days |
| Set up Java Spring Boot project structure | 搭建Java Spring Boot项目结构 | Backend (Java) | 2 days |
| Set up PostgreSQL and Redis | 搭建PostgreSQL和Redis | DevOps | 2 days |
| Configure Docker and docker-compose | 配置Docker和docker-compose | DevOps | 2 days |

#### Phase 2: App 1 - Property Value Estimator (Week 3-4) / 第二阶段：应用1

| Task (EN) | Task (CN) | Owner | Duration |
|-----------|-----------|-------|----------|
| Implement property input form with validation | 实现房产输入表单和验证 | Frontend | 3 days |
| Create prediction result display (table + chart) | 创建预测结果展示（表格+图表） | Frontend | 2 days |
| Build history page with pagination | 构建带分页的历史页面 | Frontend | 2 days |
| Build comparison view | 构建对比视图 | Frontend | 2 days |
| Implement FastAPI prediction endpoints | 实现FastAPI预测端点 | Backend (Py) | 3 days |
| Integrate with ML model service | 与ML模型服务集成 | Backend (Py) | 2 days |
| Implement history storage and retrieval | 实现历史存储和检索 | Backend (Py) | 2 days |
| Write unit and integration tests | 编写单元和集成测试 | Backend (Py) | 2 days |

#### Phase 3: App 2 - Property Market Analysis (Week 5-6) / 第三阶段：应用2

| Task (EN) | Task (CN) | Owner | Duration |
|-----------|-----------|-------|----------|
| Implement dashboard with chart widgets | 实现带图表组件的仪表板 | Frontend | 3 days |
| Build filter panel and data tables | 构建筛选面板和数据表格 | Frontend | 2 days |
| Create what-if analysis tool | 创建假设分析工具 | Frontend | 2 days |
| Implement CSV/PDF export functionality | 实现CSV/PDF导出功能 | Frontend | 2 days |
| Implement Spring Boot REST API endpoints | 实现Spring Boot REST API端点 | Backend (Java) | 3 days |
| Build aggregate statistics service | 构建聚合统计服务 | Backend (Java) | 2 days |
| Implement caching layer (Caffeine/Redis) | 实现缓存层 | Backend (Java) | 2 days |
| Integrate with ML model for what-if | 与ML模型集成进行假设分析 | Backend (Java) | 2 days |
| Write unit and integration tests | 编写单元和集成测试 | Backend (Java) | 2 days |

#### Phase 4: Integration & Polish (Week 7) / 第四阶段：集成与优化

| Task (EN) | Task (CN) | Owner | Duration |
|-----------|-----------|-------|----------|
| End-to-end integration testing | 端到端集成测试 | QA | 3 days |
| Performance optimization | 性能优化 | All | 2 days |
| Accessibility audit and fixes | 可访问性审计和修复 | Frontend | 2 days |
| Responsive design refinement | 响应式设计优化 | Frontend | 2 days |
| Error handling and edge cases | 错误处理和边界情况 | All | 2 days |
| Documentation and deployment guides | 文档和部署指南 | All | 2 days |

### 9.2 Milestones / 里程碑

| Milestone / 里程碑 | Date / 日期 | Deliverables / 交付物 |
|-------------------|------------|----------------------|
| M1: Project Setup Complete | Week 2 | Repository structure, CI/CD, dev environment |
| M2: App 1 MVP | Week 4 | Property estimator with prediction, history, comparison |
| M3: App 2 MVP | Week 6 | Market dashboard with filters, what-if, export |
| M4: Production Ready | Week 7 | Full integration, tests, documentation, deployment |

### 9.3 Risk Assessment / 风险评估

| Risk / 风险 | Impact / 影响 | Probability / 概率 | Mitigation / 缓解措施 |
|------------|--------------|-------------------|----------------------|
| ML model integration complexity | High | Medium | Early prototyping, fallback mechanisms |
| Performance with large datasets | High | Medium | Pagination, caching, query optimization |
| Cross-team coordination (Py + Java) | Medium | Medium | Daily standups, shared API contracts |
| Browser compatibility issues | Medium | Low | Automated cross-browser testing |
| Third-party dependency vulnerabilities | Medium | Low | Automated dependency scanning |

---

## 10. Appendices / 附录

### Appendix A: Glossary / 附录A：术语表

| Term (EN) | Term (CN) | Definition / 定义 |
|-----------|-----------|------------------|
| App Router | 应用路由 | Next.js file-system based router with Server Components support |
| Server Component | 服务端组件 | React component that renders exclusively on the server |
| Client Component | 客户端组件 | React component that renders on both server and client, with interactivity |
| ISR | 增量静态再生 | Incremental Static Regeneration for dynamic content caching |
| RSC | 服务端组件 | React Server Components |
| Pydantic | - | Python data validation library using type hints |
| Bean Validation | Bean验证 | Java specification for object validation |
| SHAP | - | SHapley Additive exPlanations for ML model interpretability |
| WCAG | 网页内容无障碍指南 | Web Content Accessibility Guidelines |
| CSP | 内容安全策略 | Content Security Policy |

### Appendix B: Environment Variables / 附录B：环境变量

```bash
# Next.js Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP2_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_ML_API_URL=http://localhost:5000

# Python FastAPI Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/estimator
ML_SERVICE_URL=http://ml-service:5000
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=info

# Java Spring Boot Backend
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/market
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379
ML_SERVICE_URL=http://ml-service:5000
SERVER_PORT=8080

# ML Model Service
MODEL_PATH=/models/property_value_model.pkl
PORT=5000
```

### Appendix C: Docker Compose Configuration / 附录C：Docker Compose配置

```yaml
version: '3.8'

services:
  # Frontend
  portal:
    build: ./portal
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
      - NEXT_PUBLIC_APP2_API_BASE_URL=http://localhost:8080
    depends_on:
      - estimator-api
      - market-api

  # App 1 Backend
  estimator-api:
    build: ./estimator-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/estimator
      - ML_SERVICE_URL=http://ml-service:5000
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
      - ml-service

  # App 2 Backend
  market-api:
    build: ./market-backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/market
      - SPRING_REDIS_HOST=redis
      - ML_SERVICE_URL=http://ml-service:5000
    depends_on:
      - postgres
      - redis
      - ml-service

  # ML Model Service
  ml-service:
    build: ./ml-service
    ports:
      - "5000:5000"
    volumes:
      - ./models:/models
    environment:
      - MODEL_PATH=/models/property_value_model.pkl

  # Database
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=portal
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Appendix D: Testing Strategy / 附录D：测试策略

| Test Type / 测试类型 | Scope / 范围 | Tools / 工具 | Coverage Target / 覆盖率目标 |
|---------------------|-------------|-------------|---------------------------|
| Unit Tests | Components, hooks, utilities | Jest, React Testing Library | 80%+ |
| Integration Tests | API routes, data fetching | MSW, React Testing Library | 70%+ |
| E2E Tests | Critical user flows | Playwright | Core flows covered |
| Backend Unit Tests | Services, repositories | pytest (Py), JUnit (Java) | 80%+ |
| API Contract Tests | API request/response schemas | schemathesis, Spring Cloud Contract | All endpoints |
| Performance Tests | Load and stress testing | k6, Artillery | Key endpoints |
| Accessibility Tests | WCAG compliance | axe-core, Lighthouse | AA standard |

### Appendix E: Database Schema / 附录E：数据库Schema

```sql
-- Estimation History Table
CREATE TABLE estimation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input_data JSONB NOT NULL,
    predicted_value DECIMAL(12, 2) NOT NULL,
    confidence_lower DECIMAL(12, 2),
    confidence_upper DECIMAL(12, 2),
    feature_importance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_estimation_history_created_at ON estimation_history(created_at DESC);
CREATE INDEX idx_estimation_history_predicted_value ON estimation_history(predicted_value);

-- Market Data Table
CREATE TABLE property_market_data (
    id SERIAL PRIMARY KEY,
    neighborhood VARCHAR(50) NOT NULL,
    house_style VARCHAR(20) NOT NULL,
    year_built INTEGER NOT NULL,
    year_remod INTEGER,
    lot_area INTEGER NOT NULL,
    gr_liv_area INTEGER NOT NULL,
    overall_qual INTEGER NOT NULL,
    overall_cond INTEGER NOT NULL,
    sale_price DECIMAL(12, 2) NOT NULL,
    sale_date DATE,
    full_bath INTEGER,
    half_bath INTEGER,
    bedroom INTEGER,
    kitchen INTEGER,
    garage_cars INTEGER,
    garage_area INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_data_neighborhood ON property_market_data(neighborhood);
CREATE INDEX idx_market_data_sale_price ON property_market_data(sale_price);
CREATE INDEX idx_market_data_year_built ON property_market_data(year_built);
CREATE INDEX idx_market_data_house_style ON property_market_data(house_style);

-- Cache Metadata Table (for cache invalidation)
CREATE TABLE cache_metadata (
    cache_key VARCHAR(255) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    invalidated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Appendix F: Dependencies & Versions / 附录F：依赖与版本

#### Frontend Dependencies
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.13.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "lucide-react": "^0.460.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jest": "^29.7.0",
    "playwright": "^1.48.0"
  }
}
```

#### Python Dependencies
```txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.9.0
sqlalchemy==2.0.0
alembic==1.14.0
psycopg2-binary==2.9.0
redis==5.2.0
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
prometheus-client==0.21.0
python-dotenv==1.0.0
```

#### Java Dependencies (pom.xml)
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <version>3.4.4</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
        <version>3.4.4</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
        <version>3.4.4</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
        <version>3.4.4</version>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <version>42.7.4</version>
    </dependency>
    <dependency>
        <groupId>com.github.ben-manes.caffeine</groupId>
        <artifactId>caffeine</artifactId>
        <version>3.1.8</version>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.6.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <version>3.4.4</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

**End of Document / 文档结束**

*This PRD is a living document. All changes should be tracked via version control and communicated to the team.*

*本文档为活文档。所有变更应通过版本控制追踪并通知团队。*
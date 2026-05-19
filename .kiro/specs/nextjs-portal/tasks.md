# Implementation Plan: Multi-Application Next.js Portal

## Overview

This plan implements a Multi-Application Next.js Portal hosting two independent applications (Property Value Estimator with Python/FastAPI backend, and Property Market Analysis with Java/Spring Boot backend) under a unified navigation shell. The implementation proceeds from infrastructure and shared components through individual app features, ending with integration and deployment wiring. Frontend uses TypeScript/Next.js 15, Estimator Backend uses Python/FastAPI, and Market Backend uses Java/Spring Boot.

## Tasks

- [x] 1. Set up project structure, shared types, and infrastructure configuration
  - [x] 1.1 Initialize Next.js 15 project with App Router, Tailwind CSS, shadcn/ui, and configure route groups for `(estimator)` and `(market)`
    - Create `nextjs-portal/` directory with `npx create-next-app@latest` using App Router
    - Install dependencies: `@tanstack/react-query`, `zustand`, `zod`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `shadcn/ui`, `fast-check`
    - Configure `tailwind.config.ts` with design tokens
    - Set up `app/(estimator)/` and `app/(market)/` route groups
    - Create `app/layout.tsx` root layout with QueryClientProvider and Zustand store
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 1.2 Define shared TypeScript types and Zod validation schemas
    - Create `lib/types/index.ts` with interfaces: `HouseFeatures`, `PredictionResult`, `BatchPredictionResult`, `HistoryItem`, `PaginatedResponse<T>`, `MarketStatistics`, `WhatIfResult`, `ApiError`
    - Create `lib/schemas/index.ts` with Zod schemas for `HouseFeatures` validation (square_footage 1–100,000; bedrooms 1–10; bathrooms 0.5–10 in 0.5 increments; year_built 1800–current year; lot_size 1–1,000,000; distance_to_city_center 0–500; school_rating 0–10)
    - _Requirements: 2.2, 9.1, 10.2_

  - [x] 1.3 Create Docker Compose configuration, Nginx reverse proxy, and database initialization scripts
    - Create `docker-compose.yml` with services: nginx, nextjs, estimator-backend, market-backend, housing-price-api, postgres, redis
    - Define health checks for each service
    - Define service dependencies (postgres/redis healthy before backends; ML service healthy before backends)
    - Create `nginx/nginx.conf` with path-based routing: `/*` → Next.js, `/api/v1/estimator/*` → FastAPI, `/api/v1/market/*` → Spring Boot
    - Create `db/init.sql` with `estimation_history` and `property_data` tables and indexes
    - Create environment variable configuration via `.env.example`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 1.4 Initialize Estimator Backend (Python/FastAPI) project structure
    - Create `estimator-backend/` with FastAPI 0.115+ project structure
    - Set up `requirements.txt` with fastapi, uvicorn, pydantic, sqlalchemy, asyncpg, httpx, hypothesis
    - Create Pydantic models: `EstimationRequest`, `EstimationResponse`, `HistoryFilter`, `FeatureImportanceItem`
    - Create `Dockerfile` for the estimator backend
    - Set up project layout: `app/`, `app/routers/`, `app/services/`, `app/models/`, `app/db/`
    - _Requirements: 9.1, 9.5, 14.2_

  - [x] 1.5 Initialize Market Backend (Java/Spring Boot) project structure
    - Create `market-backend/` with Spring Boot 3.4.4 project (Java 21)
    - Set up `pom.xml` with dependencies: spring-boot-starter-web, spring-boot-starter-data-jpa, spring-boot-starter-cache, spring-boot-starter-data-redis, caffeine, jqwik
    - Create DTOs: `WhatIfRequestDTO`, `MarketStatsDTO`, `FilterRequestDTO`, `HouseFeaturesDTO`
    - Create `Dockerfile` for the market backend
    - Set up project layout: `src/main/java/com/portal/market/` with controller, service, repository, dto, config packages
    - _Requirements: 10.1, 10.7, 14.2_

- [x] 2. Implement Navigation Shell and shared UI components
  - [x] 2.1 Implement RootLayout, TopNav, AppSwitcher, and Breadcrumb components
    - Create `components/layout/RootLayout.tsx` as Server Component wrapping providers
    - Create `components/layout/TopNav.tsx` as Client Component with fixed positioning
    - Create `components/layout/AppSwitcher.tsx` with tab-style navigation between Home, Estimator, Market
    - Create `components/layout/Breadcrumb.tsx` displaying current path up to 3 levels
    - Implement active application visual distinction in navigation
    - Ensure full keyboard navigation (Tab + Enter) for all nav elements
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

  - [ ]* 2.2 Write property test for breadcrumb depth invariant
    - **Property 1: Breadcrumb depth invariant**
    - Use fast-check to generate arbitrary route paths and verify breadcrumb renders at most 3 levels
    - **Validates: Requirements 1.3**

  - [x] 2.3 Implement MobileMenu, Footer, and landing page
    - Create `components/layout/MobileMenu.tsx` with hamburger trigger for viewports < 768px
    - Create `components/layout/Footer.tsx` (Server Component) displaying backend health status and app version
    - Create `app/page.tsx` landing page with cards for App 1 and App 2 with descriptions and links
    - Ensure touch targets are minimum 44×44 CSS pixels on mobile
    - _Requirements: 1.4, 1.5, 1.6, 13.7_

  - [x] 2.4 Implement shared components: ErrorBoundary, SkeletonLoader, Toast, DataTable
    - Create `components/shared/ErrorBoundary.tsx` (global and route-level) with recovery UI
    - Create `components/shared/SkeletonLoader.tsx` matching target component dimensions
    - Create `components/shared/Toast.tsx` notification system (auto-dismiss 5s for success, persistent for errors, max 120 chars)
    - Create `components/shared/DataTable.tsx` reusable table with pagination, sorting, column config
    - Implement ARIA live regions for toast (assertive) and loading states (polite)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.6_

  - [ ]* 2.5 Write property test for error toast message constraint
    - **Property 21: Error toast message constraint**
    - Use fast-check to generate error messages and verify toast displays at most 120 characters with a recovery action
    - **Validates: Requirements 12.5**

- [x] 3. Checkpoint - Ensure navigation shell and shared components work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Estimator Backend API (Python/FastAPI)
  - [x] 4.1 Implement single prediction endpoint and ML service integration
    - Create `app/services/ml_client.py` with HTTP client to housing-price-api `/predict` endpoint
    - Implement 5-second timeout for ML service requests
    - Create `app/routers/predict.py` with `POST /api/v1/estimator/predict`
    - Validate request with Pydantic, call ML service, return `EstimationResponse`
    - Return HTTP 503 with `ML_SERVICE_UNAVAILABLE` if ML service unreachable
    - Return HTTP 504 if ML service times out
    - _Requirements: 9.1, 9.4, 9.6, 11.1, 11.3, 11.5_

  - [x] 4.2 Implement batch prediction endpoint with full-batch validation
    - Create `POST /api/v1/estimator/predict/batch` accepting 1–100 records
    - Validate all records; reject entire batch with HTTP 422 if any record fails validation
    - Include zero-based index in error details for invalid records
    - Call ML service `/predict/batch` for valid batches
    - Return response with total_records, successful_predictions count, and individual predicted_price per record
    - Return within 10 seconds (p95)
    - _Requirements: 9.2, 9.7, 11.1_

  - [ ]* 4.3 Write property tests for batch prediction validation
    - **Property 13: Batch prediction validation** — verify accepts 1–100 records, rejects 0 or >100
    - **Property 15: Batch rejection on partial validation failure** — verify entire batch rejected when any record invalid
    - **Validates: Requirements 9.2, 9.7**

  - [ ]* 4.4 Write property test for validation error structure
    - **Property 14: Validation error structure**
    - Use Hypothesis to generate invalid inputs and verify HTTP 422 response contains error code, message, and field-level details
    - **Validates: Requirements 9.4**

  - [x] 4.5 Implement history persistence and paginated retrieval
    - Create `app/db/models.py` with SQLAlchemy model for `estimation_history` table
    - Create `app/services/history_service.py` with insert (cap at 10,000 records, evict oldest) and query logic
    - Create `app/routers/history.py` with `GET /api/v1/estimator/history` (paginated, default 20, max 100)
    - Support search by neighborhood (case-insensitive, 2+ chars), filter by date range and price range
    - Create `GET /api/v1/estimator/history/{id}` for single record retrieval
    - _Requirements: 4.1, 9.3_

  - [ ]* 4.6 Write property tests for history record cap and pagination
    - **Property 4: History record cap with eviction** — verify count never exceeds 10,000 and oldest removed
    - **Property 5: History pagination and ordering** — verify page_size constraint, descending order, metadata correctness
    - **Validates: Requirements 4.1, 4.2, 9.3**

  - [x] 4.7 Implement health check endpoint
    - Create `GET /api/v1/estimator/health` returning status ("healthy"/"unhealthy"), model_loaded boolean, model_version, and timestamp
    - Check DB connectivity and ML service reachability
    - _Requirements: 9.5_

  - [ ]* 4.8 Write property test for ML error propagation
    - **Property 19: ML error propagation (Estimator)**
    - Use Hypothesis to generate ML error responses and verify structured error propagation with code, message, timestamp
    - **Validates: Requirements 11.3**

- [x] 5. Checkpoint - Ensure Estimator Backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Market Backend API (Java/Spring Boot)
  - [x] 6.1 Implement aggregate statistics endpoint with caching
    - Create `StatisticsService` computing avg, median, min, max, count grouped by configurable dimensions (neighborhood, house_style, sale_type, year_built range)
    - Create `CacheService` with Caffeine (L1) + Redis (L2) layers, configurable TTL (default 300s, min 1 min, max 60 min)
    - Create `GET /api/v1/market/statistics` with filter parameters
    - Return `cached: true/false` indicator in response
    - Implement cache invalidation on data changes within 5 seconds
    - Return results within 2 seconds (p95)
    - _Requirements: 10.1, 10.4, 10.5_

  - [ ]* 6.2 Write property tests for aggregate statistics and cache behavior
    - **Property 16: Aggregate statistics correctness** — verify count, avg, median, min, max calculations
    - **Property 8: Cache TTL behavior** — verify cache population, hit within TTL, miss after expiry
    - **Validates: Requirements 6.4, 10.1, 10.4**

  - [x] 6.3 Implement paginated property data endpoint with filtering and sorting
    - Create `GET /api/v1/market/data` with pagination (default 20, max 100)
    - Support filtering by neighborhood, price range, year built, property type
    - Support sorting by any numeric or date field (asc/desc)
    - Return error for page_size > 100 or offset beyond total record count
    - _Requirements: 10.3, 10.9_

  - [ ]* 6.4 Write property tests for filtered/sorted data and pagination
    - **Property 17: Filtered and sorted data correctness** — verify all records match filters and sort order
    - **Property 18: Invalid pagination rejection** — verify error on page_size > 100 or offset beyond total
    - **Validates: Requirements 10.3, 10.9**

  - [x] 6.5 Implement what-if prediction endpoint with ML integration and retry logic
    - Create `WhatIfService` calling ML service `/predict` for base and modified feature sets
    - Implement exponential backoff retry: initial 1s, multiplier 2, max 3 attempts for HTTP 429/5xx
    - Create `POST /api/v1/market/what-if` returning base prediction, modified prediction, absolute difference, percentage change
    - Return HTTP 504 on 5-second timeout, HTTP 502 after retries exhausted
    - Include `Retry-After: 30` header on ML unavailability
    - Return within 3 seconds (p95) under normal conditions
    - _Requirements: 10.2, 10.8, 11.2, 11.4, 11.6, 11.7, 11.8_

  - [ ]* 6.6 Write property tests for what-if calculation and retry behavior
    - **Property 9: What-if price difference calculation** — verify absolute difference and percentage change formulas
    - **Property 20: Exponential backoff retry** — verify retry delays (1s, 2s, 4s) and max 3 attempts
    - **Property 19: ML error propagation (Market)** — verify structured error with code, message, timestamp
    - **Validates: Requirements 7.2, 11.4, 11.7**

  - [x] 6.7 Implement export endpoints (CSV and PDF)
    - Create `ExportService` generating UTF-8 CSV (max 50,000 rows with truncation message) and PDF with rendered charts and summary statistics (avg, median, min, max, count)
    - Create `POST /api/v1/market/export` triggering async export job
    - Create `GET /api/v1/market/export/{jobId}/status` for job status polling
    - Return error if dataset exceeds 10,000 records per export request (Market_Backend limit)
    - CSV generation within 30 seconds, PDF generation within 60 seconds
    - _Requirements: 10.6, 8.2, 8.4_

  - [ ]* 6.8 Write property test for CSV export correctness
    - **Property 12: CSV export correctness**
    - Use jqwik to generate filtered datasets and verify UTF-8 encoding, correct columns, max 50,000 rows, header row
    - **Validates: Requirements 8.2**

  - [x] 6.9 Implement health check endpoint
    - Create `GET /api/v1/market/health` returning service status (healthy/unhealthy), cache connectivity (connected/disconnected), ML connectivity (reachable/unreachable)
    - Respond within 500ms
    - _Requirements: 10.7_

- [x] 7. Checkpoint - Ensure Market Backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement App 1 Frontend (Property Value Estimator)
  - [x] 8.1 Implement PropertyForm with Zod validation and submission logic
    - Create `app/(estimator)/estimator/page.tsx` with PropertyForm component
    - Integrate React Hook Form with Zod resolver using shared schemas from `lib/schemas/`
    - Implement real-time field validation on blur (within 100ms)
    - Accept input for all ML model fields: square_footage, bedrooms, bathrooms, year_built, lot_size, distance_to_city_center, school_rating
    - Handle form submission: loading indicator on submit button, 30-second timeout
    - Display toast on error (preserve form input), display toast on network failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 8.2 Write property test for form validation schema correctness
    - **Property 2: Form validation schema correctness**
    - Use fast-check to generate values within and outside constraints, verify accept/reject behavior
    - **Validates: Requirements 2.2**

  - [x] 8.3 Implement PredictionResult display and FeatureImportanceChart
    - Create `app/(estimator)/estimator/result/[id]/page.tsx`
    - Create `components/estimator/PredictionResult.tsx` displaying predicted price (currency symbol + 2 decimal places), currency code, model version, ISO 8601 timestamp
    - Create `components/estimator/FeatureImportanceChart.tsx` using Recharts horizontal bar chart (features on vertical axis, importance % on horizontal, sorted descending, summing to 100%)
    - Display skeleton loader while loading (matching card + chart layout, 10s timeout)
    - Display error state for not-found estimation with link back to history
    - Display retry button when ML_Service unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 8.4 Write property test for prediction result rendering completeness
    - **Property 3: Prediction result rendering completeness**
    - Use fast-check to generate PredictionResult objects and verify all fields rendered, chart sorted, importance sums to 100%
    - **Validates: Requirements 3.1, 3.2**

  - [x] 8.5 Implement HistoryTable with search, filters, and pagination
    - Create `app/(estimator)/estimator/history/page.tsx`
    - Create `components/estimator/HistoryTable.tsx` using shared DataTable
    - Display paginated list sorted by date descending, 20 records per page, columns: date, neighborhood, predicted price, summary features (gr_liv_area, bedroom, full_bath, garage_cars)
    - Implement search (2+ chars, case-insensitive partial match against neighborhood/house_style/price range, within 500ms)
    - Implement date range and price range filters (apply immediately, show only matching records)
    - Display skeleton loader matching table layout, empty state message, error state with retry
    - Navigate to `/estimator/result/[id]` on row click
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 8.6 Write property test for history filter correctness
    - **Property 6: History filter correctness**
    - Use fast-check to generate filter combinations and verify all returned records satisfy all active constraints simultaneously
    - **Validates: Requirements 4.3, 4.4**

  - [x] 8.7 Implement CompareView with batch prediction and grouped bar chart
    - Create `app/(estimator)/estimator/compare/page.tsx`
    - Create `components/estimator/CompareView.tsx` with property selection (2–4 from history)
    - Display side-by-side table with all input features and predicted prices
    - Render grouped bar chart with labeled bars per property (Recharts)
    - Disable compare action if < 2 selected (show minimum message)
    - Disable further selection if > 4 selected (show maximum message)
    - Display error on ML unavailability (retain selection)
    - Display message if history has < 2 entries
    - Batch prediction within 2 seconds (p95)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 8.8 Write property test for comparison view completeness
    - **Property 7: Comparison view completeness**
    - Use fast-check to generate 2–4 property sets and verify table and chart render correctly
    - **Validates: Requirements 5.3, 5.4**

- [x] 9. Checkpoint - Ensure App 1 frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement App 2 Frontend (Property Market Analysis)
  - [x] 10.1 Implement DashboardGrid with FilterPanel and chart components
    - Create `app/(market)/market/page.tsx` with DashboardGrid layout
    - Create `components/market/FilterPanel.tsx` with multi-select neighborhood, price range (0–10,000,000), year built range (1800–current year), property type (multi-select)
    - Create `components/market/NeighborhoodBarChart.tsx` (avg price by neighborhood, Recharts bar chart)
    - Create `components/market/PriceHistogram.tsx` (price distribution, 10–20 equal-width bins)
    - Create `components/market/PriceAreaScatter.tsx` (price vs living area, Recharts scatter plot)
    - Update all charts within 500ms of filter change completing API call
    - Responsive stacking on viewports < 768px
    - Display skeleton loaders matching each chart widget dimensions
    - Display empty-state message within each chart area when filters match zero properties
    - Display error message with retry button on backend failure/5s timeout
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 10.2 Write property test for chart ARIA label completeness
    - **Property 22: Chart ARIA label completeness**
    - Use fast-check to generate chart data and verify ARIA labels contain chart type, data summary, and axis labels
    - **Validates: Requirements 13.4**

  - [x] 10.3 Implement WhatIfTool with sliders, sensitivity chart, and parameter locks
    - Create `app/(market)/market/what-if/page.tsx`
    - Create `components/market/WhatIfTool.tsx` with sliders/numeric inputs for each ML feature (same validation constraints as Property_Form)
    - On parameter adjustment: send updated features to Market_Backend, display new predicted price within 2s, show absolute difference and percentage change
    - Create `components/market/SensitivityChart.tsx` line chart showing price vs single parameter (minimum 10 evenly spaced data points across valid range)
    - Implement parameter lock toggles (prevent modification of locked params, at least one must remain unlocked)
    - Handle ML unavailability: show last prediction with stale-data indicator (timestamp), or disable controls if no previous prediction exists
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 10.4 Write property tests for what-if tool behavior
    - **Property 10: Sensitivity chart data point generation** — verify minimum 10 evenly spaced points across valid range
    - **Property 11: Parameter lock invariant** — verify cannot lock all parameters simultaneously
    - **Validates: Requirements 7.3, 7.4**

  - [x] 10.5 Implement MarketTable with pagination, sorting, and export buttons
    - Create `app/(market)/market/data/page.tsx`
    - Create `components/market/MarketTable.tsx` using shared DataTable with sorting (any numeric/date field, asc/desc) and filtering
    - Create `components/market/ExportButton.tsx` for CSV and PDF export
    - CSV export: download currently filtered dataset, UTF-8 encoded, max 50,000 rows
    - PDF export: capture current chart state with filters, include summary statistics (avg, median, min, max, count)
    - Display progress indicator during export, disable button to prevent duplicates
    - Handle export errors (re-enable button, show error message), zero-record state (show message, don't generate file), truncation (> 50,000 rows message)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 11. Checkpoint - Ensure App 2 frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integration wiring and final configuration
  - [x] 12.1 Configure React Query hooks and API client layer
    - Create `lib/api/estimator-client.ts` with typed fetch functions for all Estimator Backend endpoints
    - Create `lib/api/market-client.ts` with typed fetch functions for all Market Backend endpoints
    - Create React Query hooks in `lib/hooks/` for each endpoint with proper caching, retry (3x, 30s interval), and error handling
    - Configure 10-second timeout for all API calls
    - Implement automatic retry every 30 seconds up to 3 attempts on service unavailability
    - Display persistent error with manual retry button after all retries exhausted
    - _Requirements: 12.6, 12.7_

  - [x] 12.2 Wire route-level error boundaries and loading states
    - Create `app/(estimator)/error.tsx` and `app/(market)/error.tsx` route-level error boundaries (show failed section name + retry, preserve top nav)
    - Create `app/(estimator)/loading.tsx` and `app/(market)/loading.tsx` with skeleton loaders matching content regions
    - Create `app/error.tsx` global error boundary with recovery UI (retry button + home link)
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 12.3 Implement accessibility compliance across all components
    - Add ARIA labels to all chart components (chart type, data summary, axis labels)
    - Ensure logical tab order matching visual reading order with focus indicators (3:1 contrast minimum)
    - Verify color contrast ratios (4.5:1 normal text, 3:1 large text per WCAG 2.1)
    - Add ARIA live regions: assertive for toast notifications, polite for loading state transitions
    - Ensure 44×44px minimum touch targets on viewports < 768px
    - Ensure no horizontal scrolling from 320px to 2560px viewport width
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 12.4 Finalize Dockerfiles and verify full stack startup
    - Create `nextjs-portal/Dockerfile` for Next.js production build
    - Verify all Dockerfiles build successfully
    - Verify `docker compose up` brings all services healthy within 60 seconds
    - Verify Nginx routing correctly forwards requests to all backends
    - Verify environment variables are used for all connection strings, ports, and configuration
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (22 properties total)
- Unit tests validate specific examples and edge cases
- Frontend uses TypeScript with Next.js 15 (fast-check for PBT), Estimator Backend uses Python/FastAPI (Hypothesis for PBT), Market Backend uses Java/Spring Boot (jqwik for PBT)
- The existing `housing-price-api` service is reused as-is; no modifications needed
- All services communicate via HTTP REST through the Nginx reverse proxy

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.3", "2.4", "4.1", "6.1", "6.9"] },
    { "id": 3, "tasks": ["2.2", "2.5", "4.2", "4.5", "4.7", "6.3", "6.5", "6.7"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.6", "4.8", "6.2", "6.4", "6.6", "6.8"] },
    { "id": 5, "tasks": ["8.1", "8.3", "8.5", "8.7", "12.1"] },
    { "id": 6, "tasks": ["8.2", "8.4", "8.6", "8.8", "10.1", "10.3", "10.5"] },
    { "id": 7, "tasks": ["10.2", "10.4", "12.2", "12.3"] },
    { "id": 8, "tasks": ["12.4"] }
  ]
}
```

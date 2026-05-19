# Requirements Document

## Introduction

This document defines the requirements for a Multi-Application Next.js Portal that hosts two independent applications under a unified navigation shell. App 1 (Property Value Estimator) uses a Python/FastAPI backend, and App 2 (Property Market Analysis) uses a Java/Spring Boot backend. Both applications consume predictions from the existing housing-price-api ML regression model service via HTTP. The portal provides a consistent design system, responsive layout, and accessible UI across all routes.

## Glossary

- **Portal**: The unified Next.js 15 application that hosts both App 1 and App 2 under shared navigation and layout
- **App_1_Estimator**: The Property Value Estimator application accessible under `/estimator/*` routes
- **App_2_Market**: The Property Market Analysis application accessible under `/market/*` routes
- **ML_Service**: The existing housing-price-api container that exposes prediction endpoints (single and batch)
- **Estimator_Backend**: The Python 3.12+ / FastAPI 0.115+ backend service for App 1
- **Market_Backend**: The Java 21 / Spring Boot 3.4.4 backend service for App 2
- **Property_Form**: The client-side form component for entering property features for estimation
- **Prediction_Result**: The structured response containing a predicted property price and metadata
- **History_Store**: The PostgreSQL database table storing past estimation records for App 1
- **Cache_Layer**: The Caffeine (in-memory) and Redis (distributed) caching system used by App 2
- **Dashboard**: The interactive visualization page in App 2 displaying market statistics via charts
- **What_If_Tool**: The interactive analysis component allowing users to adjust property parameters and observe predicted price changes
- **Navigation_Shell**: The persistent top navigation bar, breadcrumb, and mobile menu shared across all portal routes
- **Skeleton_Loader**: A placeholder UI rendered while async data is being fetched
- **Error_Boundary**: A React component that catches JavaScript errors in its child tree and displays a fallback UI

## Requirements

### Requirement 1: Unified Portal Navigation and Layout

**User Story:** As a portal user, I want a persistent navigation shell with an application switcher, so that I can seamlessly move between the Property Value Estimator and Market Analysis applications.

#### Acceptance Criteria

1. THE Navigation_Shell SHALL render a fixed-position top navigation bar that remains visible during scrolling on every portal route
2. THE Navigation_Shell SHALL display an application switcher allowing navigation between App_1_Estimator, App_2_Market, and the landing page
3. WHEN a user navigates to a route, THE Navigation_Shell SHALL visually distinguish the active application in the navigation bar using a distinct style differentiator and display a breadcrumb trail reflecting the current path up to a maximum depth of 3 levels
4. WHILE the viewport width is less than 768 pixels, THE Navigation_Shell SHALL collapse into a hamburger menu button that, when activated, expands to show all navigation options
5. THE Portal SHALL render a landing page at the root route (`/`) displaying cards for App_1_Estimator and App_2_Market with descriptions and navigation links
6. THE Navigation_Shell SHALL include a footer displaying the operational status of backend services (healthy, degraded, or unavailable) and the application version identifier
7. THE Navigation_Shell SHALL support full keyboard navigation, allowing users to traverse all navigation links and the application switcher using Tab and Enter keys

### Requirement 2: Property Estimation Input Form

**User Story:** As a real estate agent, I want to enter property features into a validated form, so that I can obtain an estimated property value from the ML model.

#### Acceptance Criteria

1. THE Property_Form SHALL accept input for all ML model fields: square_footage, bedrooms, bathrooms, year_built, lot_size, distance_to_city_center, and school_rating
2. THE Property_Form SHALL validate each field in real-time using Zod schemas with the following constraints: square_footage (number, 1 to 100,000), bedrooms (integer, 1 to 10), bathrooms (number, 0.5 to 10 in 0.5 increments), year_built (integer, 1800 to current year), lot_size (number, 1 to 1,000,000), distance_to_city_center (number, 0 to 500), school_rating (number, 0 to 10)
3. WHEN a field loses focus with invalid input, THE Property_Form SHALL display an inline error message adjacent to the invalid field within 100 milliseconds of the blur event
4. WHEN the user submits a valid form, THE Property_Form SHALL send the data to the Estimator_Backend and display a loading indicator overlaying the submit button until the response arrives or a 30-second timeout elapses
5. IF the Estimator_Backend returns an error response, THEN THE Property_Form SHALL display a toast notification containing the error description from the response and preserve all user input in the form fields
6. IF the request to the Estimator_Backend fails due to network error or the 30-second timeout elapses, THEN THE Property_Form SHALL display a toast notification indicating the service is unreachable and preserve all user input in the form fields

### Requirement 3: Prediction Results Display

**User Story:** As a property investor, I want to view prediction results in both tabular and chart formats, so that I can quickly understand the estimated value and contributing factors.

#### Acceptance Criteria

1. WHEN the Estimator_Backend returns a Prediction_Result, THE Portal SHALL display the predicted price (formatted with currency symbol and two decimal places), currency code, model version, and prediction timestamp (in ISO 8601 format) in a structured card layout within 1 second of receiving the response
2. WHEN the Estimator_Backend returns a Prediction_Result containing feature_importance data, THE Portal SHALL render a bar chart showing each input feature name on the vertical axis and its importance score (as a percentage of total importance, summing to 100%) on the horizontal axis, sorted in descending order of importance
3. WHEN a user navigates to `/estimator/result/[id]`, THE Portal SHALL retrieve and display the full Prediction_Result for the stored estimation matching that id, including the predicted price card and feature importance bar chart
4. IF a user navigates to `/estimator/result/[id]` and no stored estimation matches the provided id, THEN THE Portal SHALL display an error message indicating the estimation was not found and provide a link to navigate back to the estimation history page
5. IF the ML_Service is unavailable when a prediction is requested, THEN THE Portal SHALL display an error message indicating the service is temporarily unavailable and provide a retry button that re-submits the most recent prediction request
6. WHILE the Portal is loading a Prediction_Result from the Estimator_Backend, THE Portal SHALL display a skeleton placeholder matching the card and chart layout until data is received or a timeout of 10 seconds is reached

### Requirement 4: Estimation History

**User Story:** As a real estate agent, I want to view and search my past property estimations, so that I can reference previous valuations without re-entering data.

#### Acceptance Criteria

1. WHEN a prediction is successfully completed, THE Estimator_Backend SHALL persist the input features, predicted price, and timestamp to the History_Store, retaining a maximum of 10,000 records per user with oldest records removed when the limit is exceeded
2. THE Portal SHALL display a paginated list of past estimations at `/estimator/history`, sorted by date descending (most recent first), showing 20 records per page, with columns for date, neighborhood, predicted price, and a summary of up to 4 property features (gr_liv_area, bedroom, full_bath, garage_cars)
3. WHEN a user enters a search term of at least 2 characters, THE Portal SHALL filter the history list within 500 milliseconds by performing a case-insensitive partial match against neighborhood, house_style, and predicted price range
4. THE Portal SHALL support filtering history records by date range (start date and end date) and price range (minimum and maximum predicted price), applying filters immediately upon selection and displaying only records matching all active filter criteria
5. WHEN the history list is loading, THE Portal SHALL display a Skeleton_Loader matching the table layout
6. IF the history list contains no records matching the current search or filter criteria, THEN THE Portal SHALL display an empty-state message indicating no results were found and suggesting the user adjust filters or perform a new estimation
7. IF the History_Store is unavailable when the Portal requests history data, THEN THE Portal SHALL display an error message indicating the history service is temporarily unavailable and provide a retry action
8. WHEN a user selects a history record, THE Portal SHALL navigate to the estimation result detail view at `/estimator/result/[id]` displaying the full input features and predicted price

### Requirement 5: Property Comparison View

**User Story:** As a property investor, I want to compare 2 to 4 properties side-by-side, so that I can evaluate relative value differences.

#### Acceptance Criteria

1. THE Portal SHALL provide a comparison page at `/estimator/compare` allowing selection of 2 to 4 properties from the estimation history
2. WHEN properties are selected for comparison, THE Estimator_Backend SHALL execute a batch prediction request to the ML_Service and return results for all selected properties within 2 seconds (p95)
3. THE Portal SHALL display comparison results in a side-by-side table showing all input features and predicted prices for each selected property
4. THE Portal SHALL render a grouped bar chart comparing predicted prices across the selected properties, with each bar labeled by a property identifier
5. IF fewer than 2 properties are selected, THEN THE Portal SHALL disable the compare action and display a message indicating the minimum selection requirement
6. IF more than 4 properties are selected, THEN THE Portal SHALL disable further selection and display a message indicating the maximum of 4 properties has been reached
7. IF the ML_Service is unavailable or the batch prediction request fails, THEN THE Portal SHALL display an error message indicating that comparison results could not be retrieved and retain the user's property selection
8. IF the estimation history contains fewer than 2 entries, THEN THE Portal SHALL display a message on the comparison page indicating that at least 2 completed estimations are required before comparison is available

### Requirement 6: Market Analysis Dashboard

**User Story:** As a data analyst, I want an interactive dashboard with multiple chart types, so that I can analyze property market trends and distributions.

#### Acceptance Criteria

1. THE Dashboard SHALL display at minimum: average price by neighborhood (bar chart), price distribution (histogram with 10 to 20 equal-width bins), and price vs living area (scatter plot)
2. THE Dashboard SHALL provide filter controls for neighborhood (multi-select), price range (minimum 0, maximum 10,000,000), year built range (1800 to current year), and property type (multi-select)
3. WHEN a user changes a filter, THE Dashboard SHALL update all visible charts within 500 milliseconds of the filter change completing its API call
4. WHEN the Dashboard page loads, THE Market_Backend SHALL serve cached aggregate data from the Cache_Layer if the cache entry exists and is younger than 300 seconds
5. WHEN the Dashboard is loading initial data, THE Portal SHALL display Skeleton_Loaders matching each chart widget's width and height
6. THE Dashboard SHALL render responsively, stacking charts vertically on viewports narrower than 768 pixels
7. IF the Market_Backend returns an error or fails to respond within 5 seconds during data loading, THEN THE Dashboard SHALL display an error message indicating the failure reason and a retry button that re-triggers the data request
8. IF the active filters match zero properties, THEN THE Dashboard SHALL display an empty-state message within each chart area indicating that no data matches the current filter criteria

### Requirement 7: What-If Analysis Tool

**User Story:** As a property investor, I want to adjust property parameters and instantly see how the predicted price changes, so that I can evaluate renovation or purchase scenarios.

#### Acceptance Criteria

1. THE What_If_Tool SHALL present adjustable sliders or numeric inputs for each ML model feature (square_footage, bedrooms, bathrooms, year_built, lot_size, distance_to_city_center, school_rating) with the same validation constraints as the Property_Form (square_footage > 0; bedrooms 1–10; bathrooms 0.5–10; year_built 1800–2030; lot_size > 0; distance_to_city_center >= 0; school_rating 0–10)
2. WHEN a user adjusts a parameter value, THE What_If_Tool SHALL send the updated feature set to the Market_Backend and display the new predicted price within 2 seconds, including the absolute price difference and percentage change relative to the previous prediction
3. THE What_If_Tool SHALL display a line chart showing how the predicted price changes as a single user-selected parameter varies across its valid range in a minimum of 10 evenly spaced data points while all other parameters remain at their current values
4. THE What_If_Tool SHALL allow the user to lock individual parameters at their current values via a toggle control, preventing locked parameters from being modified, while requiring at least one parameter to remain unlocked at all times
5. IF the ML_Service is unavailable during a what-if request, THEN THE What_If_Tool SHALL display the last successful prediction result with a stale-data indicator showing the timestamp of that prediction
6. IF the ML_Service is unavailable and no previous successful prediction exists in the current session, THEN THE What_If_Tool SHALL display an error message indicating the service is unavailable and disable the parameter adjustment controls until the service recovers

### Requirement 8: Data Export

**User Story:** As a data analyst, I want to export market data and dashboard views, so that I can use the data in external tools and reports.

#### Acceptance Criteria

1. THE Portal SHALL provide a CSV export button on the market data table page that downloads the currently filtered dataset
2. WHEN a user triggers CSV export, THE Market_Backend SHALL generate a UTF-8 encoded CSV file containing all columns visible in the data table with applied filters, limited to a maximum of 50,000 rows, within 30 seconds
3. THE Portal SHALL provide a PDF export option on the dashboard page that captures the current chart state including all applied filters and selected date ranges
4. WHEN a user triggers PDF export, THE Market_Backend SHALL generate a PDF document containing rendered charts and a summary statistics section showing aggregate values (average, median, minimum, maximum, and record count) for the currently filtered dataset, within 60 seconds
5. WHILE an export is being generated, THE Portal SHALL display a progress indicator and disable the export button to prevent duplicate requests
6. IF an export generation fails or exceeds its time limit, THEN THE Portal SHALL re-enable the export button and display an error message indicating the failure reason
7. IF the filtered dataset contains zero records when a user triggers CSV export, THEN THE Portal SHALL display a message indicating no data is available for export and SHALL NOT generate a file
8. IF the filtered dataset exceeds 50,000 rows when a user triggers CSV export, THEN THE Market_Backend SHALL export only the first 50,000 rows and THE Portal SHALL display a message indicating the export was truncated

### Requirement 9: Estimator Backend API

**User Story:** As a frontend developer, I want a well-structured REST API from the Estimator Backend, so that I can integrate prediction, history, and comparison features reliably.

#### Acceptance Criteria

1. THE Estimator_Backend SHALL expose a POST endpoint for single property prediction that accepts HouseFeatures and returns a Prediction_Result containing predicted_price, currency, echoed input_features, model_version, and timestamp within 2 seconds (p95)
2. THE Estimator_Backend SHALL expose a POST endpoint for batch prediction accepting 1 to 100 property records and returning predictions for all valid records within 10 seconds (p95), where the response includes total_records, successful_predictions count, and individual predicted_price per record
3. THE Estimator_Backend SHALL expose a GET endpoint for retrieving paginated estimation history with a default page size of 20 and a maximum page size of 100, supporting optional search by neighborhood and filter by date range and price range via query parameters
4. IF a request fails Pydantic validation, THEN THE Estimator_Backend SHALL return an HTTP 422 response with a structured error body containing an error code, a human-readable message, and a list of field-level details identifying each invalid field and its validation failure reason
5. THE Estimator_Backend SHALL expose a GET health check endpoint returning a status field of "healthy" or "unhealthy", a model_loaded boolean, model_version, and a timestamp
6. IF the ML_Service is unreachable, THEN THE Estimator_Backend SHALL return an HTTP 503 response with error code ML_SERVICE_UNAVAILABLE
7. IF one or more records in a batch prediction request fail validation while others are valid, THEN THE Estimator_Backend SHALL reject the entire batch and return an HTTP 422 response with field-level error details identifying the invalid records by their zero-based index

### Requirement 10: Market Backend API

**User Story:** As a frontend developer, I want a performant REST API from the Market Backend with caching, so that dashboard and analysis features load quickly.

#### Acceptance Criteria

1. THE Market_Backend SHALL expose GET endpoints for aggregate market statistics (average, median, min, max, count) grouped by configurable dimensions (neighborhood, house_style, sale_type, year_built range) and return results within 2 seconds at the 95th percentile
2. THE Market_Backend SHALL expose a POST endpoint for what-if predictions that accepts a feature set matching the ML model input schema and returns a predicted price within 3 seconds at the 95th percentile
3. THE Market_Backend SHALL expose a GET endpoint for paginated property data with a default page size of 20, a maximum page size of 100, filtering by neighborhood, price range, year built, and property type, and sorting by any numeric or date field in ascending or descending order
4. THE Market_Backend SHALL cache aggregate query results using the Cache_Layer with a configurable TTL (default 5 minutes, minimum 1 minute, maximum 60 minutes)
5. WHEN underlying data is inserted, updated, or deleted in the property data store, THE Market_Backend SHALL invalidate all cache entries whose grouping dimensions include the modified records within 5 seconds of the data change
6. THE Market_Backend SHALL expose GET endpoints for CSV and PDF export generation limited to a maximum of 10,000 records per export request, returning an error indication if the requested dataset exceeds this limit
7. THE Market_Backend SHALL expose a GET health check endpoint returning service status (healthy or unhealthy), cache connectivity status (connected or disconnected), and ML_Service connectivity status (reachable or unreachable) within 500 milliseconds
8. IF the ML_Service is unreachable when processing a what-if prediction request, THEN THE Market_Backend SHALL return an error response indicating ML service unavailability and include a Retry-After header suggesting a retry interval of 30 seconds
9. IF a paginated property data request specifies a page size exceeding 100 or a page number resulting in an offset beyond the total record count, THEN THE Market_Backend SHALL return an error response indicating the invalid pagination parameters

### Requirement 11: ML Service Integration

**User Story:** As a system architect, I want both backends to integrate reliably with the existing housing-price-api, so that predictions are consistent and failures are handled gracefully.

#### Acceptance Criteria

1. THE Estimator_Backend SHALL communicate with the ML_Service via HTTP REST using the existing `/predict` and `/predict/batch` endpoints
2. THE Market_Backend SHALL communicate with the ML_Service via HTTP REST using the existing `/predict` and `/predict/batch` endpoints
3. WHEN the ML_Service returns an error response, THE Estimator_Backend SHALL propagate a structured error to the frontend containing the ML_Service error code, a human-readable message, and a timestamp
4. WHEN the ML_Service returns an error response, THE Market_Backend SHALL propagate a structured error to the frontend containing the ML_Service error code, a human-readable message, and a timestamp
5. WHEN the ML_Service does not respond within 5 seconds, THE Estimator_Backend SHALL timeout the request and return an HTTP 504 response
6. WHEN the ML_Service does not respond within 5 seconds, THE Market_Backend SHALL timeout the request and return an HTTP 504 response
7. WHEN the ML_Service returns an HTTP 429 or 5xx status code, THE Market_Backend SHALL retry the request using exponential backoff with an initial delay of 1 second, a multiplier of 2, and a maximum of 3 retry attempts
8. IF all retry attempts to the ML_Service are exhausted without a successful response, THEN THE Market_Backend SHALL return an HTTP 502 response with a structured error indicating that the ML_Service is temporarily unavailable

### Requirement 12: Error Handling and Loading States

**User Story:** As a portal user, I want clear feedback during loading and meaningful error messages when something goes wrong, so that I understand the system state at all times.

#### Acceptance Criteria

1. THE Portal SHALL implement a global Error_Boundary that catches unhandled JavaScript exceptions and displays a recovery UI containing a retry button and a navigation link to return to the portal home page
2. THE Portal SHALL implement route-level Error_Boundaries for each application section (`/estimator/*` and `/market/*`) that display an error message identifying the failed section name and a retry button, while preserving the top navigation so the user can navigate away
3. THE Portal SHALL display Skeleton_Loaders for all server-fetched data components, where each skeleton reproduces the number and approximate dimensions of the content regions (e.g., rows, cards, chart area) of the target component
4. WHEN a user-initiated mutation (form submission, export, or delete action) completes successfully, THE Portal SHALL display a toast notification confirming the completed action that auto-dismisses after 5 seconds
5. WHEN a user-initiated async operation fails, THE Portal SHALL display a toast notification containing a one-line error summary (maximum 120 characters) and a suggested recovery action (retry, check input, or contact support) that remains visible until the user dismisses it
6. IF the Estimator_Backend or Market_Backend does not respond within 10 seconds, THEN THE Portal SHALL display a service unavailable message and automatically retry the request every 30 seconds up to a maximum of 3 retry attempts
7. IF all automatic retry attempts are exhausted without a successful response, THEN THE Portal SHALL display a persistent error message indicating the service is unavailable and offering a manual retry button

### Requirement 13: Responsive Design and Accessibility

**User Story:** As a user with accessibility needs, I want the portal to be fully accessible and responsive, so that I can use it on any device with assistive technology.

#### Acceptance Criteria

1. THE Portal SHALL comply with WCAG 2.1 Level AA for all interactive components including forms, navigation, charts, and data tables
2. THE Portal SHALL render a layout on viewports from 320 pixels to 2560 pixels wide where all content is accessible without horizontal scrolling at each breakpoint, no interactive elements are obscured or overlapping, and all functionality remains operable
3. THE Portal SHALL support keyboard navigation for all interactive elements following a logical tab order that matches the visual reading order, with focus indicators that have a minimum contrast ratio of 3:1 against adjacent colors
4. THE Portal SHALL provide ARIA labels for all chart components and data visualizations that convey the chart type, a summary of the data represented, and the axis labels so that the information is programmatically determinable
5. THE Portal SHALL maintain a minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text as defined by WCAG 2.1 (18pt regular or 14pt bold)
6. THE Portal SHALL use ARIA live regions to announce dynamic content changes including toast notifications (using assertive politeness) and loading state transitions (using polite politeness) without relying on screen reader detection
7. WHILE the viewport width is less than 768 pixels, THE Portal SHALL render all interactive elements with a minimum touch target size of 44 by 44 CSS pixels

### Requirement 14: Containerized Deployment

**User Story:** As a DevOps engineer, I want all services containerized with Docker Compose, so that the entire portal stack can be started with a single command.

#### Acceptance Criteria

1. THE Portal SHALL provide a Docker Compose configuration that starts all services: Next.js frontend, Estimator_Backend, Market_Backend, ML_Service, PostgreSQL, and Redis
2. THE Portal SHALL provide individual Dockerfiles for the Next.js frontend, Estimator_Backend, and Market_Backend
3. WHEN `docker compose up` is executed, THE Portal SHALL have all services healthy and communicating within 60 seconds
4. THE Portal SHALL use environment variables for all service connection strings, ports, and configuration values
5. THE Portal SHALL include a reverse proxy (Nginx) configuration for routing requests to appropriate backend services
6. THE Docker Compose configuration SHALL define health check commands for each service that verify the service is ready to accept requests
7. THE Docker Compose configuration SHALL define service dependencies ensuring that PostgreSQL and Redis are healthy before Estimator_Backend and Market_Backend start, and that ML_Service is healthy before either backend starts

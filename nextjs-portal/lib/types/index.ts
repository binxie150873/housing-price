// Shared TypeScript types for the Multi-Application Next.js Portal

/**
 * ML model input features matching housing-price-api HouseFeatures schema.
 */
export interface HouseFeatures {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
}

/**
 * Individual feature importance score from the ML model.
 */
export interface FeatureImportance {
  feature: string;
  importance: number; // dollar contribution to predicted price
}

/**
 * Prediction result returned by the Estimator Backend.
 */
export interface PredictionResult {
  estimate_id: string;
  predicted_price: number;
  currency: string;
  input_features: HouseFeatures;
  model_version: string;
  timestamp: string; // ISO 8601
  feature_importance: FeatureImportance[];
}

/**
 * Batch prediction result for property comparison (2–4 properties).
 */
export interface BatchPredictionResult {
  results: PredictionResult[];
  comparison_summary: {
    highest_value: number;
    lowest_value: number;
    average_value: number;
    value_range: number;
  };
}

/**
 * History list item for past estimations.
 */
export interface HistoryItem {
  id: string;
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
  predicted_price: number;
  currency: string;
  model_version: string;
  feature_importance: FeatureImportance[] | null;
  created_at: string;
}

/**
 * Generic paginated response envelope.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Market statistics from the Market Backend.
 */
export interface MarketStatistics {
  squareFootageVsPrice: { squareFootage: number; price: number }[];
  yearBuiltVsPrice: { decade: string; avgPrice: number; count: number }[];
  distanceSchoolVsPrice: {
    byDistance: { value: number; avgPrice: number; count: number }[];
    bySchoolRating: { value: number; avgPrice: number; count: number }[];
  };
  cached: boolean;
  generatedAt: string;
}

/**
 * What-if analysis result from the Market Backend.
 */
export interface WhatIfResult {
  base_prediction: { predicted_value: number };
  modified_prediction: { predicted_value: number };
  value_difference: number;
  percentage_change: number;
}

/**
 * Property data record from the Market Backend.
 */
export interface PropertyData {
  id: number;
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
  price: number;
  created_at: string;
}

/**
 * Export job status from the Market Backend.
 */
export interface ExportJob {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: "csv" | "pdf";
  download_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  total_records?: number;
  truncated?: boolean;
}

/**
 * Health check response from backend services.
 */
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  model_loaded?: boolean;
  model_version?: string;
  cache_status?: "connected" | "disconnected";
  ml_service_status?: "reachable" | "unreachable";
  timestamp: string;
}

/**
 * Unified error response format across backends.
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
    timestamp: string;
  };
}

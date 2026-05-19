import {
  HouseFeatures,
  PredictionResult,
  BatchPredictionResult,
  HistoryItem,
  PaginatedResponse,
  HealthResponse,
} from "@/lib/types";
import { fetchWithTimeout, getBaseUrl } from "./fetch-client";

const ESTIMATOR_BASE = "/api/v1/estimator";

function url(path: string): string {
  return `${getBaseUrl()}${ESTIMATOR_BASE}${path}`;
}

/**
 * Parameters for querying estimation history.
 */
export interface HistoryParams {
  page?: number;
  page_size?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  price_min?: number;
  price_max?: number;
}

/**
 * Submit a single property for price prediction.
 */
export async function predictSingle(
  features: HouseFeatures
): Promise<PredictionResult> {
  return fetchWithTimeout<PredictionResult>(url("/predict"), {
    method: "POST",
    body: JSON.stringify(features),
  });
}

/**
 * Submit a batch of properties for comparison prediction (2–4 properties).
 */
export async function predictBatch(
  records: HouseFeatures[]
): Promise<BatchPredictionResult> {
  return fetchWithTimeout<BatchPredictionResult>(url("/predict/batch"), {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

/**
 * Retrieve paginated estimation history with optional search and filters.
 */
export async function getHistory(
  params: HistoryParams = {}
): Promise<PaginatedResponse<HistoryItem>> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.search) searchParams.set("search", params.search);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.price_min != null)
    searchParams.set("price_min", String(params.price_min));
  if (params.price_max != null)
    searchParams.set("price_max", String(params.price_max));

  const query = searchParams.toString();
  const path = query ? `/history?${query}` : "/history";

  return fetchWithTimeout<PaginatedResponse<HistoryItem>>(url(path), {
    method: "GET",
  });
}

/**
 * Retrieve a single estimation result by ID.
 */
export async function getHistoryById(id: string): Promise<PredictionResult> {
  return fetchWithTimeout<PredictionResult>(url(`/history/${id}`), {
    method: "GET",
  });
}

/**
 * Check the health status of the Estimator Backend.
 */
export async function getHealth(): Promise<HealthResponse> {
  return fetchWithTimeout<HealthResponse>(url("/health"), {
    method: "GET",
  });
}

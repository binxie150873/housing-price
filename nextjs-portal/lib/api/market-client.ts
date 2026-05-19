import {
  HouseFeatures,
  MarketStatistics,
  PropertyData,
  PaginatedResponse,
  WhatIfResult,
  ExportJob,
  HealthResponse,
} from "@/lib/types";
import { fetchWithTimeout, getBaseUrl } from "./fetch-client";

const MARKET_BASE = "/api/v1/market";

function url(path: string): string {
  return `${getBaseUrl()}${MARKET_BASE}${path}`;
}

/**
 * Filter parameters for market statistics.
 */
export interface StatisticsFilters {
  bedrooms_min?: number;
  bedrooms_max?: number;
  year_min?: number;
  year_max?: number;
  square_footage_min?: number;
  square_footage_max?: number;
  bathrooms_min?: number;
  bathrooms_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;
  distance_max?: number;
  school_rating_min?: number;
}

/**
 * Parameters for querying paginated property data.
 */
export interface PropertyDataParams {
  page?: number;
  page_size?: number;
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bedrooms_max?: number;
  bathrooms_min?: number;
  bathrooms_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  square_footage_min?: number;
  square_footage_max?: number;
  lot_size_min?: number;
  lot_size_max?: number;
  school_rating_min?: number;
  distance_max?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

/**
 * Request body for what-if analysis.
 */
export interface WhatIfRequest {
  base_property: HouseFeatures;
  modifications: Partial<HouseFeatures>;
}

/**
 * Request body for triggering an export.
 */
export interface ExportRequest {
  format: "csv" | "pdf";
  filters?: Omit<PropertyDataParams, "page" | "page_size">;
}

/**
 * Retrieve aggregate market statistics with optional filters.
 */
export async function getStatistics(
  filters: StatisticsFilters = {}
): Promise<MarketStatistics> {
  const searchParams = new URLSearchParams();

  if (filters.bedrooms_min != null)
    searchParams.set("bedroomsMin", String(filters.bedrooms_min));
  if (filters.bedrooms_max != null)
    searchParams.set("bedroomsMax", String(filters.bedrooms_max));
  if (filters.year_min != null)
    searchParams.set("yearMin", String(filters.year_min));
  if (filters.year_max != null)
    searchParams.set("yearMax", String(filters.year_max));
  if (filters.square_footage_min != null)
    searchParams.set("squareFootageMin", String(filters.square_footage_min));
  if (filters.square_footage_max != null)
    searchParams.set("squareFootageMax", String(filters.square_footage_max));
  if (filters.bathrooms_min != null)
    searchParams.set("bathroomsMin", String(filters.bathrooms_min));
  if (filters.bathrooms_max != null)
    searchParams.set("bathroomsMax", String(filters.bathrooms_max));
  if (filters.lot_size_min != null)
    searchParams.set("lotSizeMin", String(filters.lot_size_min));
  if (filters.lot_size_max != null)
    searchParams.set("lotSizeMax", String(filters.lot_size_max));
  if (filters.distance_max != null)
    searchParams.set("distanceMax", String(filters.distance_max));
  if (filters.school_rating_min != null)
    searchParams.set("schoolRatingMin", String(filters.school_rating_min));

  const query = searchParams.toString();
  const path = query ? `/statistics?${query}` : "/statistics";

  return fetchWithTimeout<MarketStatistics>(url(path), {
    method: "GET",
  });
}

/**
 * Retrieve paginated property data with filters and sorting.
 */
export async function getData(
  params: PropertyDataParams = {}
): Promise<PaginatedResponse<PropertyData>> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.price_min != null)
    searchParams.set("priceMin", String(params.price_min));
  if (params.price_max != null)
    searchParams.set("priceMax", String(params.price_max));
  if (params.bedrooms_min != null)
    searchParams.set("bedroomsMin", String(params.bedrooms_min));
  if (params.bedrooms_max != null)
    searchParams.set("bedroomsMax", String(params.bedrooms_max));
  if (params.bathrooms_min != null)
    searchParams.set("bathroomsMin", String(params.bathrooms_min));
  if (params.bathrooms_max != null)
    searchParams.set("bathroomsMax", String(params.bathrooms_max));
  if (params.year_built_min != null)
    searchParams.set("yearBuiltMin", String(params.year_built_min));
  if (params.year_built_max != null)
    searchParams.set("yearBuiltMax", String(params.year_built_max));
  if (params.square_footage_min != null)
    searchParams.set("squareFootageMin", String(params.square_footage_min));
  if (params.square_footage_max != null)
    searchParams.set("squareFootageMax", String(params.square_footage_max));
  if (params.lot_size_min != null)
    searchParams.set("lotSizeMin", String(params.lot_size_min));
  if (params.lot_size_max != null)
    searchParams.set("lotSizeMax", String(params.lot_size_max));
  if (params.school_rating_min != null)
    searchParams.set("schoolRatingMin", String(params.school_rating_min));
  if (params.distance_max != null)
    searchParams.set("distanceMax", String(params.distance_max));
  if (params.sort_by) searchParams.set("sortBy", params.sort_by);
  if (params.sort_order) searchParams.set("sortOrder", params.sort_order);

  const query = searchParams.toString();
  const path = query ? `/data?${query}` : "/data";

  return fetchWithTimeout<PaginatedResponse<PropertyData>>(url(path), {
    method: "GET",
  });
}

/**
 * Perform a what-if prediction analysis.
 */
export async function predictWhatIf(
  request: WhatIfRequest
): Promise<WhatIfResult> {
  return fetchWithTimeout<WhatIfResult>(url("/what-if"), {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Trigger a CSV or PDF export job.
 */
export async function triggerExport(request: ExportRequest): Promise<ExportJob> {
  return fetchWithTimeout<ExportJob>(url("/export"), {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Check the status of an export job.
 */
export async function getExportStatus(jobId: string): Promise<ExportJob> {
  return fetchWithTimeout<ExportJob>(url(`/export/${jobId}/status`), {
    method: "GET",
  });
}

/**
 * Check the health status of the Market Backend.
 */
export async function getHealth(): Promise<HealthResponse> {
  return fetchWithTimeout<HealthResponse>(url("/health"), {
    method: "GET",
  });
}

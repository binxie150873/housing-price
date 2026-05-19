"use client";

import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  MarketStatistics,
  PropertyData,
  PaginatedResponse,
  WhatIfResult,
  ExportJob,
  HealthResponse,
} from "@/lib/types";
import {
  getStatistics,
  getData,
  predictWhatIf,
  triggerExport,
  getExportStatus,
  getHealth,
  StatisticsFilters,
  PropertyDataParams,
  WhatIfRequest,
  ExportRequest,
} from "@/lib/api/market-client";
import { ApiClientError } from "@/lib/api/fetch-client";

/**
 * Retry configuration per Requirements 12.6:
 * - Retry 3 times with 30-second intervals on service unavailability
 */
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 30_000;

function shouldRetry(failureCount: number, error: Error): boolean {
  if (failureCount >= RETRY_COUNT) return false;
  // Retry on network errors, timeouts, and 5xx server errors
  if (error instanceof ApiClientError) {
    return error.status >= 500;
  }
  // Retry on network/timeout errors
  return true;
}

function retryDelay(): number {
  return RETRY_DELAY_MS;
}

// Query key factory for consistent cache key management
export const marketKeys = {
  all: ["market"] as const,
  statistics: (filters: StatisticsFilters) =>
    [...marketKeys.all, "statistics", filters] as const,
  data: (params: PropertyDataParams) =>
    [...marketKeys.all, "data", params] as const,
  export: (jobId: string) => [...marketKeys.all, "export", jobId] as const,
  health: () => [...marketKeys.all, "health"] as const,
};

/**
 * Hook for fetching market statistics with filters.
 * Implements retry (3x, 30s interval) per Requirements 12.6.
 */
export function useMarketStatistics(
  filters: StatisticsFilters = {},
  options?: Omit<
    UseQueryOptions<MarketStatistics, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<MarketStatistics, Error>({
    queryKey: marketKeys.statistics(filters),
    queryFn: () => getStatistics(filters),
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

/**
 * Hook for fetching paginated property data.
 * Implements retry (3x, 30s interval) per Requirements 12.6.
 */
export function usePropertyData(
  params: PropertyDataParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<PropertyData>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<PaginatedResponse<PropertyData>, Error>({
    queryKey: marketKeys.data(params),
    queryFn: () => getData(params),
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

/**
 * Hook for performing what-if prediction analysis.
 * Uses mutation since it's a POST with user-provided parameters.
 */
export function useWhatIfPrediction(
  options?: Omit<
    UseMutationOptions<WhatIfResult, Error, WhatIfRequest>,
    "mutationFn"
  >
) {
  return useMutation<WhatIfResult, Error, WhatIfRequest>({
    mutationFn: predictWhatIf,
    ...options,
  });
}

/**
 * Hook for triggering a data export (CSV or PDF).
 * Uses mutation since it creates a new export job.
 */
export function useTriggerExport(
  options?: Omit<
    UseMutationOptions<ExportJob, Error, ExportRequest>,
    "mutationFn"
  >
) {
  return useMutation<ExportJob, Error, ExportRequest>({
    mutationFn: triggerExport,
    ...options,
  });
}

/**
 * Hook for polling export job status.
 * Automatically refetches while the job is pending/processing.
 */
export function useExportStatus(
  jobId: string,
  options?: Omit<
    UseQueryOptions<ExportJob, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<ExportJob, Error>({
    queryKey: marketKeys.export(jobId),
    queryFn: () => getExportStatus(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "pending" || data?.status === "processing") {
        return 2_000; // Poll every 2 seconds while in progress
      }
      return false; // Stop polling when completed or failed
    },
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

/**
 * Hook for checking Market Backend health.
 * Short stale time since health can change frequently.
 */
export function useMarketHealth(
  options?: Omit<
    UseQueryOptions<HealthResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<HealthResponse, Error>({
    queryKey: marketKeys.health(),
    queryFn: getHealth,
    staleTime: 30_000,
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

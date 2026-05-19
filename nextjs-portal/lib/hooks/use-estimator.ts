"use client";

import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  HouseFeatures,
  PredictionResult,
  BatchPredictionResult,
  HistoryItem,
  PaginatedResponse,
  HealthResponse,
} from "@/lib/types";
import {
  predictSingle,
  predictBatch,
  getHistory,
  getHistoryById,
  getHealth,
  HistoryParams,
} from "@/lib/api/estimator-client";
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
export const estimatorKeys = {
  all: ["estimator"] as const,
  history: () => [...estimatorKeys.all, "history"] as const,
  historyList: (params: HistoryParams) =>
    [...estimatorKeys.history(), params] as const,
  historyDetail: (id: string) =>
    [...estimatorKeys.history(), "detail", id] as const,
  health: () => [...estimatorKeys.all, "health"] as const,
};

/**
 * Hook for submitting a single property prediction.
 * Uses mutation since it's a POST that creates a new resource.
 */
export function usePredictSingle(
  options?: Omit<
    UseMutationOptions<PredictionResult, Error, HouseFeatures>,
    "mutationFn"
  >
) {
  return useMutation<PredictionResult, Error, HouseFeatures>({
    mutationFn: predictSingle,
    ...options,
  });
}

/**
 * Hook for submitting a batch prediction (comparison).
 * Uses mutation since it's a POST that creates new resources.
 */
export function usePredictBatch(
  options?: Omit<
    UseMutationOptions<BatchPredictionResult, Error, HouseFeatures[]>,
    "mutationFn"
  >
) {
  return useMutation<BatchPredictionResult, Error, HouseFeatures[]>({
    mutationFn: predictBatch,
    ...options,
  });
}

/**
 * Hook for fetching paginated estimation history.
 * Implements retry (3x, 30s interval) per Requirements 12.6.
 */
export function useEstimationHistory(
  params: HistoryParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<HistoryItem>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<PaginatedResponse<HistoryItem>, Error>({
    queryKey: estimatorKeys.historyList(params),
    queryFn: () => getHistory(params),
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

/**
 * Hook for fetching a single estimation result by ID.
 * Implements retry (3x, 30s interval) per Requirements 12.6.
 */
export function useEstimationDetail(
  id: string,
  options?: Omit<
    UseQueryOptions<PredictionResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<PredictionResult, Error>({
    queryKey: estimatorKeys.historyDetail(id),
    queryFn: () => getHistoryById(id),
    enabled: !!id,
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

/**
 * Hook for checking Estimator Backend health.
 * Short stale time since health can change frequently.
 */
export function useEstimatorHealth(
  options?: Omit<
    UseQueryOptions<HealthResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<HealthResponse, Error>({
    queryKey: estimatorKeys.health(),
    queryFn: getHealth,
    staleTime: 30_000,
    retry: shouldRetry,
    retryDelay,
    ...options,
  });
}

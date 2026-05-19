"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { FeatureImportanceChart } from "@/components/estimator/FeatureImportanceChart";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import type { PredictionResult } from "@/lib/types";

type PageState =
  | { status: "loading" }
  | { status: "success"; data: PredictionResult }
  | { status: "not-found" }
  | { status: "service-unavailable" }
  | { status: "error"; message: string };

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Result detail page for a single estimation.
 * Fetches from GET /api/v1/estimator/history/{id}.
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6
 */
export default function EstimationResultPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  const fetchResult = async () => {
    setState({ status: "loading" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `/api/v1/estimator/history/${params.id}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: PredictionResult = await response.json();
        setState({ status: "success", data });
      } else if (response.status === 404) {
        setState({ status: "not-found" });
      } else if (response.status === 503) {
        setState({ status: "service-unavailable" });
      } else {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error?.message || `Unexpected error (${response.status})`;
        setState({ status: "error", message });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        setState({ status: "service-unavailable" });
      } else {
        setState({ status: "service-unavailable" });
      }
    }
  };

  useEffect(() => {
    fetchResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (state.status === "loading") {
    return <LoadingSkeleton />;
  }

  if (state.status === "not-found") {
    return <NotFoundState />;
  }

  if (state.status === "service-unavailable") {
    return <ServiceUnavailableState onRetry={fetchResult} />;
  }

  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={fetchResult} />;
  }

  const { data } = state;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/estimator/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to History
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Estimation Result</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">
            Prediction Details
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Predicted Price</p>
              <p
                className="text-3xl font-bold text-primary"
                aria-label={`Predicted price: $${data.predicted_price.toLocaleString()} ${data.currency}`}
              >
                ${data.predicted_price.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Currency: {data.currency}
              </p>
            </div>

            <hr className="border-border" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Square Footage</p>
                <p className="text-base font-medium">{data.input_features.square_footage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bedrooms</p>
                <p className="text-base font-medium">{data.input_features.bedrooms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bathrooms</p>
                <p className="text-base font-medium">{data.input_features.bathrooms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year Built</p>
                <p className="text-base font-medium">{data.input_features.year_built}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lot Size</p>
                <p className="text-base font-medium">{data.input_features.lot_size.toLocaleString()} sqft</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Distance to City Center</p>
                <p className="text-base font-medium">{data.input_features.distance_to_city_center} mi</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">School Rating</p>
                <p className="text-base font-medium">{data.input_features.school_rating.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Model Version</p>
                <p className="text-base font-medium">{data.model_version}</p>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <p className="text-sm text-muted-foreground">Prediction Date</p>
              <time
                dateTime={data.timestamp}
                className="text-base font-medium text-card-foreground"
              >
                {new Date(data.timestamp).toLocaleString()}
              </time>
            </div>
          </div>
        </div>

        {data.feature_importance && data.feature_importance.length > 0 && (
          <FeatureImportanceChart data={data.feature_importance} />
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader matching the card + chart layout.
 */
function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      <div className="h-8 w-64 rounded bg-muted animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonLoader variant="card" height="240px" />
        <SkeletonLoader variant="chart" height="240px" />
      </div>
    </div>
  );
}

/**
 * Error state when estimation is not found (404).
 * Provides link back to history page.
 */
function NotFoundState() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle
          className="h-12 w-12 text-muted-foreground mb-4"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Estimation Not Found
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          The estimation you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/estimator/history"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go to Estimation History
        </Link>
      </div>
    </div>
  );
}

/**
 * Error state when ML service is unavailable (503 or timeout).
 * Provides retry button.
 */
function ServiceUnavailableState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle
          className="h-12 w-12 text-destructive mb-4"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Service Temporarily Unavailable
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          The estimation service is currently unavailable. Please try again in a
          moment.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * Generic error state with retry option.
 */
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle
          className="h-12 w-12 text-destructive mb-4"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something Went Wrong
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  );
}

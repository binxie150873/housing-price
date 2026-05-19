"use client";

import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/lib/toast-store";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import type {
  HistoryItem,
  PaginatedResponse,
  BatchPredictionResult,
  HouseFeatures,
} from "@/lib/types";

const BAR_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea"];

const FEATURE_LABELS: Record<keyof HouseFeatures, string> = {
  square_footage: "Square Footage",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  year_built: "Year Built",
  lot_size: "Lot Size",
  distance_to_city_center: "Distance to City Center",
  school_rating: "School Rating",
};

/**
 * CompareView component for side-by-side property comparison.
 * Allows selecting 2–4 properties from history, runs batch prediction,
 * and displays results in a table and grouped bar chart.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
export function CompareView() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] =
    useState<BatchPredictionResult | null>(null);

  const addToast = useToastStore((state) => state.addToast);

  // Fetch history items
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery<PaginatedResponse<HistoryItem>>({
    queryKey: ["estimator-history-compare"],
    queryFn: async () => {
      const response = await fetch(
        "/api/v1/estimator/history?page=1&page_size=100"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch estimation history");
      }
      return response.json();
    },
  });

  // Batch prediction mutation
  const batchPrediction = useMutation<BatchPredictionResult, Error, string[]>({
    mutationFn: async (estimateIds: string[]) => {
      const response = await fetch("/api/v1/estimator/predict/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate_ids: estimateIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error?.message ||
          "Comparison results could not be retrieved";
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonResult(data);
    },
    onError: (error) => {
      addToast({
        type: "error",
        message: error.message || "Comparison results could not be retrieved",
        recoveryAction: "Retry comparison",
        onRecover: () => handleCompare(),
      });
    },
  });

  const historyItems = historyData?.items ?? [];
  const hasMinimumHistory = historyItems.length >= 2;
  const canCompare = selectedIds.length >= 2 && selectedIds.length <= 4;
  const isMaxSelected = selectedIds.length >= 4;

  const handleSelectionChange = useCallback(
    (estimateId: string, checked: boolean) => {
      setSelectedIds((prev) => {
        if (checked) {
          if (prev.length >= 4) return prev;
          return [...prev, estimateId];
        }
        return prev.filter((id) => id !== estimateId);
      });
    },
    []
  );

  const handleCompare = useCallback(() => {
    if (selectedIds.length >= 2 && selectedIds.length <= 4) {
      batchPrediction.mutate(selectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // Loading state
  if (isHistoryLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="table-row" count={5} />
        <SkeletonLoader variant="chart" height="300px" />
      </div>
    );
  }

  // History fetch error
  if (isHistoryError) {
    return (
      <div
        className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <p className="text-sm font-medium text-destructive">
          Failed to load estimation history. Please try again.
        </p>
        <button
          onClick={() => refetchHistory()}
          className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
        >
          Retry
        </button>
      </div>
    );
  }

  // Not enough history entries
  if (!hasMinimumHistory) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/50 p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-lg font-medium text-foreground">
          Not enough estimations to compare
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          At least 2 completed estimations are required before comparison is
          available. Please perform more estimations first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property selection */}
      <section aria-labelledby="selection-heading">
        <h2 id="selection-heading" className="text-lg font-semibold mb-3">
          Select Properties to Compare
        </h2>

        {/* Selection messages */}
        {selectedIds.length < 2 && (
          <p
            className="mb-3 text-sm text-amber-600"
            role="status"
            aria-live="polite"
          >
            Select at least 2 properties to enable comparison.
          </p>
        )}
        {isMaxSelected && (
          <p
            className="mb-3 text-sm text-amber-600"
            role="status"
            aria-live="polite"
          >
            Maximum of 4 properties reached. Deselect one to choose a different
            property.
          </p>
        )}

        {/* History items with checkboxes */}
        <div className="overflow-x-auto rounded-md border border-border">
          <table
            className="w-full text-sm"
            aria-label="Estimation history for comparison selection"
            role="table"
          >
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-muted-foreground w-12"
                >
                  Select
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  Sq. Footage
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  Predicted Price
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  Bed / Bath
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  Year Built
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isDisabled = isMaxSelected && !isSelected;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      isSelected
                        ? "bg-primary/5"
                        : "hover:bg-muted/30",
                      isDisabled && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={(e) =>
                          handleSelectionChange(
                            item.id,
                            e.target.checked
                          )
                        }
                        aria-label={`Select property ${item.id.slice(0, 8)} for comparison`}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-2 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.square_footage.toLocaleString()} sq ft
                    </td>
                    <td className="px-4 py-3">
                      ${item.predicted_price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {item.bedrooms} bed / {item.bathrooms} bath
                    </td>
                    <td className="px-4 py-3">{item.year_built}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compare button */}
        <div className="mt-4">
          <button
            onClick={handleCompare}
            disabled={!canCompare || batchPrediction.isPending}
            aria-disabled={!canCompare}
            className={cn(
              "inline-flex items-center rounded-md px-6 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "min-h-[44px] min-w-[44px]",
              canCompare
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {batchPrediction.isPending ? (
              <>
                <span
                  className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Comparing...
              </>
            ) : (
              `Compare ${selectedIds.length} Properties`
            )}
          </button>
        </div>
      </section>

      {/* Comparison results */}
      {comparisonResult && (
        <section aria-labelledby="results-heading" className="space-y-6">
          <h2 id="results-heading" className="text-lg font-semibold">
            Comparison Results
          </h2>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="Highest Value"
              value={comparisonResult.comparison_summary.highest_value}
            />
            <SummaryCard
              label="Lowest Value"
              value={comparisonResult.comparison_summary.lowest_value}
            />
            <SummaryCard
              label="Average Value"
              value={comparisonResult.comparison_summary.average_value}
            />
            <SummaryCard
              label="Value Range"
              value={comparisonResult.comparison_summary.value_range}
            />
          </div>

          {/* Side-by-side comparison table */}
          <ComparisonTable results={comparisonResult.results} />

          {/* Grouped bar chart */}
          <ComparisonChart results={comparisonResult.results} />
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">
        $
        {value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

function ComparisonTable({
  results,
}: {
  results: BatchPredictionResult["results"];
}) {
  const featureKeys = Object.keys(FEATURE_LABELS) as (keyof HouseFeatures)[];

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table
        className="w-full text-sm"
        aria-label="Side-by-side property comparison table showing all input features and predicted prices"
        role="table"
      >
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-muted-foreground"
            >
              Feature
            </th>
            {results.map((result, index) => (
              <th
                key={result.estimate_id}
                scope="col"
                className="px-4 py-3 text-left font-medium text-muted-foreground"
              >
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: BAR_COLORS[index] }}
                  aria-hidden="true"
                />
                Property {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Predicted price row */}
          <tr className="border-b border-border bg-primary/5 font-semibold">
            <td className="px-4 py-3">Predicted Price</td>
            {results.map((result) => (
              <td key={result.estimate_id} className="px-4 py-3">
                $
                {result.predicted_price.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            ))}
          </tr>
          {/* Feature rows */}
          {featureKeys.map((featureKey) => (
            <tr
              key={featureKey}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3 font-medium">
                {FEATURE_LABELS[featureKey]}
              </td>
              {results.map((result) => (
                <td key={result.estimate_id} className="px-4 py-3">
                  {formatFeatureValue(
                    featureKey,
                    result.input_features[featureKey]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonChart({
  results,
}: {
  results: BatchPredictionResult["results"];
}) {
  const chartData = results.map((result, index) => ({
    name: `Property ${index + 1}`,
    predicted_price: result.predicted_price,
  }));

  return (
    <div
      className="rounded-lg border border-border p-4"
      role="img"
      aria-label="Grouped bar chart comparing predicted prices across selected properties. X-axis shows property identifiers, Y-axis shows predicted price in USD."
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Predicted Price Comparison
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis
            tickFormatter={(value: number) =>
              `$${(value / 1000).toFixed(0)}k`
            }
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number | string) => [
              `$${Number(value).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              "Predicted Price",
            ]) as any}
          />
          <Legend />
          <Bar
            dataKey="predicted_price"
            name="Predicted Price"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatFeatureValue(key: keyof HouseFeatures, value: number): string {
  switch (key) {
    case "square_footage":
    case "lot_size":
      return value.toLocaleString() + " sq ft";
    case "distance_to_city_center":
      return value.toFixed(1) + " mi";
    case "school_rating":
      return value.toFixed(1) + " / 10";
    case "year_built":
      return String(value);
    default:
      return String(value);
  }
}

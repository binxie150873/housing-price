"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { houseFeaturesSchema, type HouseFeaturesInput } from "@/lib/schemas";
import { useToastStore } from "@/lib/toast-store";
import type { PredictionResult } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const FIELD_CONFIG = [
  {
    name: "square_footage" as const,
    label: "Square Footage",
    type: "number",
    placeholder: "e.g. 1500",
    step: "1",
  },
  {
    name: "bedrooms" as const,
    label: "Bedrooms",
    type: "number",
    placeholder: "e.g. 3",
    step: "1",
  },
  {
    name: "bathrooms" as const,
    label: "Bathrooms",
    type: "number",
    placeholder: "e.g. 2",
    step: "0.5",
  },
  {
    name: "year_built" as const,
    label: "Year Built",
    type: "number",
    placeholder: "e.g. 1990",
    step: "1",
  },
  {
    name: "lot_size" as const,
    label: "Lot Size (sq ft)",
    type: "number",
    placeholder: "e.g. 5000",
    step: "1",
  },
  {
    name: "distance_to_city_center" as const,
    label: "Distance to City Center (miles)",
    type: "number",
    placeholder: "e.g. 10",
    step: "0.1",
  },
  {
    name: "school_rating" as const,
    label: "School Rating (0-10)",
    type: "number",
    placeholder: "e.g. 7",
    step: "0.1",
  },
];

const SUBMIT_TIMEOUT_MS = 30_000;

export default function FeatureComparePage() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultA, setResultA] = useState<PredictionResult | null>(null);
  const [resultB, setResultB] = useState<PredictionResult | null>(null);

  const formA = useForm<HouseFeaturesInput>({
    resolver: zodResolver(houseFeaturesSchema),
    mode: "onBlur",
  });

  const formB = useForm<HouseFeaturesInput>({
    resolver: zodResolver(houseFeaturesSchema),
    mode: "onBlur",
  });

  const fetchPrediction = async (
    data: HouseFeaturesInput
  ): Promise<PredictionResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/v1/estimator/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error?.message ||
          `Prediction failed (HTTP ${response.status})`;
        throw new Error(message);
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(
          "Request timed out. The service may be experiencing high load."
        );
      }
      throw error;
    }
  };

  const onCompare = async () => {
    const validA = await formA.trigger();
    const validB = await formB.trigger();

    if (!validA || !validB) {
      addToast({
        type: "error",
        message: "Please fix validation errors in both forms before comparing.",
      });
      return;
    }

    setIsSubmitting(true);
    setResultA(null);
    setResultB(null);

    try {
      const dataA = formA.getValues();
      const dataB = formB.getValues();

      const [predictionA, predictionB] = await Promise.all([
        fetchPrediction(dataA),
        fetchPrediction(dataB),
      ]);

      setResultA(predictionA);
      setResultB(predictionB);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reach the estimation service. Please try again.";
      addToast({
        type: "error",
        message,
        recoveryAction: "Retry",
        onRecover: () => onCompare(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData =
    resultA && resultB
      ? resultA.feature_importance.map((f, i) => ({
          feature: f.feature,
          "House A": Math.round((f.importance / 100) * resultA.predicted_price),
          "House B": Math.round(((resultB.feature_importance[i]?.importance ?? 0) / 100) * resultB.predicted_price),
        }))
      : [];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Contribution Comparison</h1>
          <p className="mt-2 text-muted-foreground">
            Compare how different features contribute to the predicted price of
            two properties side by side.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/estimator/history")}
          className="shrink-0 inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
        >
          View History
        </button>
      </div>

      {/* Forms */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* House A Form */}
        <div className="rounded-lg border-2 border-blue-500/30 bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">House A</h2>
          <div className="space-y-4">
            {FIELD_CONFIG.map((field) => (
              <div key={field.name} className="space-y-1">
                <label
                  htmlFor={`a-${field.name}`}
                  className="text-sm font-medium leading-none"
                >
                  {field.label}
                </label>
                <input
                  id={`a-${field.name}`}
                  type={field.type}
                  step={field.step}
                  placeholder={field.placeholder}
                  aria-invalid={!!formA.formState.errors[field.name]}
                  aria-describedby={
                    formA.formState.errors[field.name]
                      ? `a-${field.name}-error`
                      : undefined
                  }
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    formA.formState.errors[field.name]
                      ? "border-destructive focus-visible:ring-destructive"
                      : "border-input"
                  }`}
                  {...formA.register(field.name, { valueAsNumber: true })}
                />
                {formA.formState.errors[field.name] && (
                  <p
                    id={`a-${field.name}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {formA.formState.errors[field.name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* House B Form */}
        <div className="rounded-lg border-2 border-green-500/30 bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">House B</h2>
          <div className="space-y-4">
            {FIELD_CONFIG.map((field) => (
              <div key={field.name} className="space-y-1">
                <label
                  htmlFor={`b-${field.name}`}
                  className="text-sm font-medium leading-none"
                >
                  {field.label}
                </label>
                <input
                  id={`b-${field.name}`}
                  type={field.type}
                  step={field.step}
                  placeholder={field.placeholder}
                  aria-invalid={!!formB.formState.errors[field.name]}
                  aria-describedby={
                    formB.formState.errors[field.name]
                      ? `b-${field.name}-error`
                      : undefined
                  }
                  className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    formB.formState.errors[field.name]
                      ? "border-destructive focus-visible:ring-destructive"
                      : "border-input"
                  }`}
                  {...formB.register(field.name, { valueAsNumber: true })}
                />
                {formB.formState.errors[field.name] && (
                  <p
                    id={`b-${field.name}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {formB.formState.errors[field.name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compare Button */}
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onCompare}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-w-[160px]"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Comparing...</span>
            </>
          ) : (
            "Compare"
          )}
        </button>
      </div>

      {/* Results Section */}
      {resultA && resultB && (
        <div className="mt-10 space-y-6">
          {/* Predicted Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border-2 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">House A</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPrice(resultA.predicted_price)}
              </p>
            </div>
            <div className="rounded-lg border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">House B</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatPrice(resultB.predicted_price)}
              </p>
            </div>
          </div>

          {/* Clustered Bar Chart */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">
              Feature Contribution to Price
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="feature"
                  angle={-30}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                  label={{
                    value: "Contribution ($)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 },
                  }}
                />
                <Tooltip
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="House A" fill="#2563eb" />
                <Bar dataKey="House B" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

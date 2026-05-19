"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { houseFeaturesSchema, type HouseFeaturesInput } from "@/lib/schemas";
import { useToastStore } from "@/lib/toast-store";

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

export default function EstimatorPage() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HouseFeaturesInput>({
    resolver: zodResolver(houseFeaturesSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: HouseFeaturesInput) => {
    setIsSubmitting(true);

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
        addToast({
          type: "error",
          message,
          recoveryAction: "Retry",
          onRecover: () => handleSubmit(onSubmit)(),
        });
        return;
      }

      const result = await response.json();
      const estimateId = result.estimate_id;
      router.push(`/estimator/result/${estimateId}`);
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === "AbortError") {
        addToast({
          type: "error",
          message:
            "Request timed out. The service may be experiencing high load.",
          recoveryAction: "Retry",
          onRecover: () => handleSubmit(onSubmit)(),
        });
      } else {
        addToast({
          type: "error",
          message: "Unable to reach the estimation service. Please try again.",
          recoveryAction: "Retry",
          onRecover: () => handleSubmit(onSubmit)(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Property Value Estimator</h1>
          <p className="mt-2 text-muted-foreground">
            Enter property features to get an estimated value from our ML model.
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

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FIELD_CONFIG.map((field) => (
            <div key={field.name} className="space-y-2">
              <label
                htmlFor={field.name}
                className="text-sm font-medium leading-none"
              >
                {field.label}
              </label>
              <input
                id={field.name}
                type={field.type}
                step={field.step}
                placeholder={field.placeholder}
                aria-invalid={!!errors[field.name]}
                aria-describedby={
                  errors[field.name] ? `${field.name}-error` : undefined
                }
                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors[field.name]
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-input"
                }`}
                {...register(field.name, { valueAsNumber: true })}
              />
              {errors[field.name] && (
                <p
                  id={`${field.name}-error`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors[field.name]?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-w-[160px]"
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
              <span>Estimating...</span>
            </>
          ) : (
            "Get Estimate"
          )}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { houseFeaturesSchema, type HouseFeaturesInput } from "@/lib/schemas";
import { useToastStore } from "@/lib/toast-store";

interface PredictionResult {
  predicted_price: number;
  feature_importance: { feature: string; importance: number }[];
}

const FEATURE_SLIDERS = [
  { key: "square_footage" as const, label: "Square Footage", min: 500, max: 5000, step: 50 },
  { key: "bedrooms" as const, label: "Bedrooms", min: 1, max: 6, step: 1 },
  { key: "bathrooms" as const, label: "Bathrooms", min: 1, max: 5, step: 0.5 },
  { key: "year_built" as const, label: "Year Built", min: 1970, max: 2025, step: 1 },
  { key: "lot_size" as const, label: "Lot Size (sq ft)", min: 3000, max: 15000, step: 100 },
  { key: "distance_to_city_center" as const, label: "Distance to City (mi)", min: 0, max: 15, step: 0.5 },
  { key: "school_rating" as const, label: "School Rating", min: 0, max: 10, step: 0.1 },
];

const FIELD_CONFIG = [
  { name: "square_footage" as const, label: "Square Footage", placeholder: "e.g. 1500", step: "1" },
  { name: "bedrooms" as const, label: "Bedrooms", placeholder: "e.g. 3", step: "1" },
  { name: "bathrooms" as const, label: "Bathrooms", placeholder: "e.g. 2", step: "0.5" },
  { name: "year_built" as const, label: "Year Built", placeholder: "e.g. 2000", step: "1" },
  { name: "lot_size" as const, label: "Lot Size (sq ft)", placeholder: "e.g. 7000", step: "1" },
  { name: "distance_to_city_center" as const, label: "Distance to City (mi)", placeholder: "e.g. 5", step: "0.1" },
  { name: "school_rating" as const, label: "School Rating (0-10)", placeholder: "e.g. 7.5", step: "0.1" },
];

export default function WhatIfPage() {
  const [phase, setPhase] = useState<"input" | "slider">("input");
  const [baseFeatures, setBaseFeatures] = useState<HouseFeaturesInput | null>(null);
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [currentFeatures, setCurrentFeatures] = useState<HouseFeaturesInput | null>(null);
  const [currentResult, setCurrentResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<HouseFeaturesInput>({
    resolver: zodResolver(houseFeaturesSchema),
    mode: "onBlur",
  });

  const fetchPrediction = async (features: HouseFeaturesInput): Promise<PredictionResult | null> => {
    try {
      const response = await fetch("/api/v1/estimator/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  // Handle "What-If" button click
  const onWhatIf = async (data: HouseFeaturesInput) => {
    setIsLoading(true);
    const result = await fetchPrediction(data);
    setIsLoading(false);

    if (!result) {
      addToast({ type: "error", message: "Failed to get prediction. Please try again." });
      return;
    }

    setBaseFeatures(data);
    setBasePrice(result.predicted_price);
    setCurrentFeatures(data);
    setCurrentResult(result);
    setPhase("slider");
  };

  // Handle slider change with debounce
  const handleSliderChange = useCallback(
    (key: keyof HouseFeaturesInput, value: number) => {
      if (!currentFeatures) return;

      const updated = { ...currentFeatures, [key]: value };
      setCurrentFeatures(updated);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const result = await fetchPrediction(updated);
        if (result) setCurrentResult(result);
      }, 300);
    },
    [currentFeatures]
  );

  const handleReset = () => {
    setPhase("input");
    setBaseFeatures(null);
    setBasePrice(null);
    setCurrentFeatures(null);
    setCurrentResult(null);
  };

  const priceDiff = currentResult && basePrice ? currentResult.predicted_price - basePrice : 0;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold">What-If Analysis</h1>
      <p className="mt-2 text-muted-foreground mb-8">
        Enter base property features, then use sliders to explore how changes affect the predicted price.
      </p>

      {/* Layout 1: Input Form */}
      {phase === "input" && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Base Property Features</h2>
          <form onSubmit={form.handleSubmit(onWhatIf)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELD_CONFIG.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label htmlFor={`wif-${field.name}`} className="text-sm font-medium">
                    {field.label}
                  </label>
                  <input
                    id={`wif-${field.name}`}
                    type="number"
                    step={field.step}
                    placeholder={field.placeholder}
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                      form.formState.errors[field.name] ? "border-destructive" : "border-input"
                    }`}
                    {...form.register(field.name, { valueAsNumber: true })}
                  />
                  {form.formState.errors[field.name] && (
                    <p className="text-sm text-destructive">{form.formState.errors[field.name]?.message}</p>
                  )}
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? "Calculating..." : "What-If →"}
            </button>
          </form>
        </div>
      )}

      {/* Layout 2: Slider Controls */}
      {phase === "slider" && currentFeatures && currentResult && basePrice != null && (
        <div className="space-y-6">
          {/* Price display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Base Price</p>
              <p className="text-xl font-bold">${basePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-xl font-bold text-primary">
                ${currentResult.predicted_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className={`rounded-lg border p-4 text-center ${priceDiff >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p className={`text-xl font-bold ${priceDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                {priceDiff >= 0 ? "+" : ""}${priceDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Sliders */}
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Adjust Parameters</h2>
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                ← Back to Input
              </button>
            </div>

            {FEATURE_SLIDERS.map((slider) => (
              <div key={slider.key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="font-medium">{slider.label}</label>
                  <span className="text-muted-foreground font-mono">
                    {currentFeatures[slider.key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={currentFeatures[slider.key]}
                  onChange={(e) => handleSliderChange(slider.key, Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label={slider.label}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{slider.min}</span>
                  <span>{slider.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Feature importance / marginal impact */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Feature Contributions</h2>
            <div className="space-y-2">
              {currentResult.feature_importance
                .sort((a, b) => b.importance - a.importance)
                .map((fi) => (
                  <div key={fi.feature} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{fi.feature.replace(/_/g, " ")}</span>
                    <span className="font-mono font-medium">
                      ${fi.importance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWhatIfPrediction } from "@/lib/hooks/use-market";
import { WhatIfRequest } from "@/lib/api/market-client";
import { HouseFeatures, WhatIfResult } from "@/lib/types";
import { SensitivityChart, SensitivityDataPoint } from "./SensitivityChart";
import { predictWhatIf } from "@/lib/api/market-client";

/**
 * Feature configuration matching PropertyForm validation constraints (Requirement 2.2 / 7.1).
 */
const FEATURE_CONFIG: {
  key: keyof HouseFeatures;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}[] = [
  { key: "square_footage", label: "Square Footage", min: 1, max: 100_000, step: 100, defaultValue: 1500 },
  { key: "bedrooms", label: "Bedrooms", min: 1, max: 10, step: 1, defaultValue: 3 },
  { key: "bathrooms", label: "Bathrooms", min: 0.5, max: 10, step: 0.5, defaultValue: 2 },
  { key: "year_built", label: "Year Built", min: 1800, max: 2030, step: 1, defaultValue: 2000 },
  { key: "lot_size", label: "Lot Size (sq ft)", min: 1, max: 1_000_000, step: 500, defaultValue: 5000 },
  { key: "distance_to_city_center", label: "Distance to City Center (mi)", min: 0, max: 500, step: 1, defaultValue: 10 },
  { key: "school_rating", label: "School Rating (0-10)", min: 0, max: 10, step: 0.1, defaultValue: 7 },
];

const DEFAULT_FEATURES: HouseFeatures = Object.fromEntries(
  FEATURE_CONFIG.map((f) => [f.key, f.defaultValue])
) as unknown as HouseFeatures;

const DEBOUNCE_MS = 500;
const SENSITIVITY_POINTS = 12;

export function WhatIfTool() {
  const [features, setFeatures] = useState<HouseFeatures>(DEFAULT_FEATURES);
  const [lockedParams, setLockedParams] = useState<Set<keyof HouseFeatures>>(new Set());
  const [lastResult, setLastResult] = useState<WhatIfResult | null>(null);
  const [lastResultTimestamp, setLastResultTimestamp] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [mlUnavailable, setMlUnavailable] = useState(false);
  const [sensitivityParam, setSensitivityParam] = useState<keyof HouseFeatures>("square_footage");
  const [sensitivityData, setSensitivityData] = useState<SensitivityDataPoint[]>([]);
  const [sensitivityLoading, setSensitivityLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseFeatures = useRef<HouseFeatures>(DEFAULT_FEATURES);

  const whatIfMutation = useWhatIfPrediction({
    onSuccess: (result) => {
      setLastResult(result);
      setLastResultTimestamp(new Date().toISOString());
      setIsStale(false);
      setMlUnavailable(false);
    },
    onError: () => {
      // ML unavailable: show stale data indicator (Requirement 7.5, 7.6)
      setMlUnavailable(true);
      if (lastResult) {
        setIsStale(true);
      }
    },
  });

  // Debounced prediction call
  const triggerPrediction = useCallback(
    (updatedFeatures: HouseFeatures) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const modifications: Partial<HouseFeatures> = {};
        for (const config of FEATURE_CONFIG) {
          if (updatedFeatures[config.key] !== baseFeatures.current[config.key]) {
            (modifications as Record<string, number>)[config.key] = updatedFeatures[config.key];
          }
        }
        const request: WhatIfRequest = {
          base_property: baseFeatures.current,
          modifications,
        };
        whatIfMutation.mutate(request);
      }, DEBOUNCE_MS);
    },
    [whatIfMutation]
  );

  const handleFeatureChange = useCallback(
    (key: keyof HouseFeatures, value: number) => {
      if (lockedParams.has(key)) return;

      const config = FEATURE_CONFIG.find((f) => f.key === key)!;
      const clampedValue = Math.min(Math.max(value, config.min), config.max);

      setFeatures((prev) => {
        const updated = { ...prev, [key]: clampedValue };
        triggerPrediction(updated);
        return updated;
      });
    },
    [lockedParams, triggerPrediction]
  );

  const handleLockToggle = useCallback(
    (key: keyof HouseFeatures) => {
      setLockedParams((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          // Ensure at least one param remains unlocked (Requirement 7.4)
          const unlockedCount = FEATURE_CONFIG.length - next.size;
          if (unlockedCount <= 1) return prev;
          next.add(key);
        }
        return next;
      });
    },
    []
  );

  // Compute sensitivity data when parameter selection changes
  const computeSensitivity = useCallback(
    async (param: keyof HouseFeatures) => {
      const config = FEATURE_CONFIG.find((f) => f.key === param)!;
      setSensitivityLoading(true);
      setSensitivityData([]);

      const points: SensitivityDataPoint[] = [];
      const range = config.max - config.min;
      const stepSize = range / (SENSITIVITY_POINTS - 1);

      try {
        const promises = Array.from({ length: SENSITIVITY_POINTS }, (_, i) => {
          const paramValue = config.min + stepSize * i;
          const modifications: Partial<HouseFeatures> = { [param]: paramValue };
          const request: WhatIfRequest = {
            base_property: features,
            modifications,
          };
          return predictWhatIf(request).then((result) => ({
            parameterValue: paramValue,
            predictedPrice: result.modified_prediction.predicted_value,
          }));
        });

        const results = await Promise.all(promises);
        points.push(...results.sort((a, b) => a.parameterValue - b.parameterValue));
        setSensitivityData(points);
      } catch {
        // If sensitivity computation fails, show empty chart
        setSensitivityData([]);
      } finally {
        setSensitivityLoading(false);
      }
    },
    [features]
  );

  // Trigger sensitivity computation when param changes
  useEffect(() => {
    if (sensitivityParam && !mlUnavailable) {
      computeSensitivity(sensitivityParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensitivityParam]);

  // Initial prediction on mount
  useEffect(() => {
    const request: WhatIfRequest = {
      base_property: DEFAULT_FEATURES,
      modifications: {},
    };
    whatIfMutation.mutate(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const controlsDisabled = mlUnavailable && !lastResult;

  return (
    <div className="space-y-8">
      {/* ML Unavailability Warning */}
      {mlUnavailable && !lastResult && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="text-sm font-medium text-destructive">
            ML service is currently unavailable. Parameter adjustment controls are disabled until the service recovers.
          </p>
        </div>
      )}

      {/* Stale Data Indicator */}
      {isStale && lastResult && lastResultTimestamp && (
        <div
          className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 p-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Showing last successful prediction from{" "}
            <time dateTime={lastResultTimestamp}>
              {new Date(lastResultTimestamp).toLocaleString()}
            </time>
            . ML service is currently unavailable.
          </p>
        </div>
      )}

      {/* Prediction Result Display */}
      {lastResult && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">Predicted Price</p>
            <p className="text-2xl font-bold text-primary">
              ${lastResult.modified_prediction.predicted_value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">Absolute Difference</p>
            <p className="text-2xl font-bold">
              {lastResult.value_difference >= 0 ? "+" : ""}$
              {Math.abs(lastResult.value_difference).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">Percentage Change</p>
            <p
              className={`text-2xl font-bold ${
                lastResult.percentage_change >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {lastResult.percentage_change >= 0 ? "+" : ""}
              {lastResult.percentage_change.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Loading indicator for prediction */}
      {whatIfMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Updating prediction...</span>
        </div>
      )}

      {/* Parameter Sliders */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Adjust Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURE_CONFIG.map((config) => {
            const isLocked = lockedParams.has(config.key);
            const isDisabled = isLocked || controlsDisabled;

            return (
              <div
                key={config.key}
                className={`space-y-2 rounded-lg border p-4 ${
                  isLocked ? "bg-muted/50 opacity-75" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`whatif-${config.key}`}
                    className="text-sm font-medium"
                  >
                    {config.label}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleLockToggle(config.key)}
                    disabled={controlsDisabled}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 ${
                      isLocked
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    aria-pressed={isLocked}
                    aria-label={`${isLocked ? "Unlock" : "Lock"} ${config.label}`}
                    title={
                      isLocked
                        ? `Unlock ${config.label}`
                        : `Lock ${config.label} at current value`
                    }
                  >
                    {isLocked ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      </svg>
                    )}
                    {isLocked ? "Locked" : "Lock"}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id={`whatif-${config.key}`}
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={features[config.key]}
                    onChange={(e) =>
                      handleFeatureChange(config.key, Number(e.target.value))
                    }
                    disabled={isDisabled}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    aria-valuemin={config.min}
                    aria-valuemax={config.max}
                    aria-valuenow={features[config.key]}
                  />
                  <input
                    type="number"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={features[config.key]}
                    onChange={(e) =>
                      handleFeatureChange(config.key, Number(e.target.value))
                    }
                    disabled={isDisabled}
                    className="w-24 h-8 rounded-md border border-input px-2 text-sm text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`${config.label} value`}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{config.min}</span>
                  <span>{config.max.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold">Sensitivity Analysis</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="sensitivity-param" className="text-sm text-muted-foreground">
              Parameter:
            </label>
            <select
              id="sensitivity-param"
              value={sensitivityParam}
              onChange={(e) => setSensitivityParam(e.target.value as keyof HouseFeatures)}
              disabled={controlsDisabled}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] md:min-h-0"
            >
              {FEATURE_CONFIG.map((config) => (
                <option key={config.key} value={config.key}>
                  {config.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => computeSensitivity(sensitivityParam)}
              disabled={controlsDisabled || sensitivityLoading}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
            >
              {sensitivityLoading ? "Computing..." : "Refresh"}
            </button>
          </div>
        </div>

        <SensitivityChart
          data={sensitivityData}
          parameterName={sensitivityParam}
          parameterLabel={FEATURE_CONFIG.find((f) => f.key === sensitivityParam)?.label ?? sensitivityParam}
          isLoading={sensitivityLoading}
        />
      </div>
    </div>
  );
}

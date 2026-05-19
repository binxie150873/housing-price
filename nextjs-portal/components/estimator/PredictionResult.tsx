"use client";

import type { PredictionResult as PredictionResultType } from "@/lib/types";

interface PredictionResultProps {
  result: PredictionResultType;
}

/**
 * Displays predicted price card with currency symbol, 2 decimal places,
 * currency code, model version, and ISO 8601 timestamp.
 * Validates: Requirements 3.1
 */
export function PredictionResult({ result }: PredictionResultProps) {
  const formattedPrice = formatCurrency(result.predicted_price, result.currency);

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">
        Prediction Result
      </h2>

      <div className="space-y-4">
        {/* Predicted Price */}
        <div>
          <p className="text-sm text-muted-foreground">Predicted Price</p>
          <p
            className="text-3xl font-bold text-primary"
            aria-label={`Predicted price: ${formattedPrice} ${result.currency}`}
          >
            {formattedPrice}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Currency: {result.currency}
          </p>
        </div>

        {/* Model Version */}
        <div>
          <p className="text-sm text-muted-foreground">Model Version</p>
          <p className="text-base font-medium text-card-foreground">
            {result.model_version}
          </p>
        </div>

        {/* Timestamp */}
        <div>
          <p className="text-sm text-muted-foreground">Prediction Timestamp</p>
          <time
            dateTime={result.timestamp}
            className="text-base font-medium text-card-foreground"
          >
            {result.timestamp}
          </time>
        </div>
      </div>
    </div>
  );
}

/**
 * Formats a number as currency with symbol and 2 decimal places.
 * Uses Intl.NumberFormat for locale-aware formatting.
 */
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currency codes
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

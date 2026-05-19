"use client";

import { useEffect } from "react";

export default function EstimatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Estimator error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-destructive">
          Property Value Estimator
        </h2>
        <p className="text-muted-foreground max-w-md">
          {error.message ||
            "An error occurred while loading the estimator. Please try again."}
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

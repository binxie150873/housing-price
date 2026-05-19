"use client";

import React from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Section name for route-level error display */
  sectionName?: string;
  /** Whether this is a route-level boundary (preserves nav) */
  routeLevel?: boolean;
  /** Custom fallback component */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global and route-level error boundary with recovery UI.
 * React error boundaries must be class components.
 *
 * - Global: shows retry button + home link
 * - Route-level: shows error message with section name, retry button, preserves top nav
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          sectionName={this.props.sectionName}
          routeLevel={this.props.routeLevel}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  sectionName?: string;
  routeLevel?: boolean;
  onRetry: () => void;
}

function ErrorFallback({
  error,
  sectionName,
  routeLevel,
  onRetry,
}: ErrorFallbackProps) {
  const title = routeLevel
    ? `Something went wrong in ${sectionName || "this section"}`
    : "Something went wrong";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-8 text-center",
        !routeLevel && "min-h-[50vh]"
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {error?.message && (
          <p className="max-w-md text-sm text-muted-foreground">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>

        {!routeLevel && (
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </a>
        )}
      </div>
    </div>
  );
}

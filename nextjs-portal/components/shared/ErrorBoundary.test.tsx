import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Content rendered successfully</div>;
}

describe("ErrorBoundary", () => {
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    cleanup();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Content rendered successfully")).toBeInTheDocument();
  });

  it("renders global error fallback when an error is thrown", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("Go home")).toBeInTheDocument();
  });

  it("renders route-level error fallback with section name", () => {
    render(
      <ErrorBoundary routeLevel sectionName="Estimator">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(
      screen.getByText("Something went wrong in Estimator")
    ).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    // Route-level should NOT show "Go home" link
    expect(screen.queryByText("Go home")).not.toBeInTheDocument();
  });

  it("recovers when retry button is clicked", () => {
    // Use a ref-like approach: the component reads from a mutable variable
    let shouldThrow = true;
    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>Content rendered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the error condition before retrying
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));

    expect(screen.getByText("Content rendered successfully")).toBeInTheDocument();
  });

  it("has accessible role=alert on error fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});

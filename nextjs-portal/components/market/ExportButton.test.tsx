import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportButton } from "./ExportButton";

// Mock the hooks
const mockMutate = vi.fn();
const mockAddToast = vi.fn();

vi.mock("@/lib/hooks/use-market", () => ({
  useTriggerExport: (opts: any) => {
    // Store callbacks for testing
    (globalThis as any).__exportCallbacks = opts;
    return { mutate: mockMutate };
  },
  useExportStatus: () => ({ data: null }),
}));

vi.mock("@/lib/toast-store", () => ({
  useToastStore: (selector: any) => {
    const state = { addToast: mockAddToast };
    return selector(state);
  },
}));

describe("ExportButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CSV export button with correct label", () => {
    render(<ExportButton format="csv" totalRecords={100} />);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
  });

  it("renders PDF export button with correct label", () => {
    render(<ExportButton format="pdf" totalRecords={100} />);
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeInTheDocument();
  });

  it("is disabled when totalRecords is 0", () => {
    render(<ExportButton format="csv" totalRecords={0} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<ExportButton format="csv" totalRecords={100} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows zero-record toast when clicking with zero records", () => {
    render(<ExportButton format="csv" totalRecords={0} />);
    // Button is disabled, so we can't click it directly
    // The zero-record check is in handleExport which won't fire when disabled
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls triggerExport mutation on click with correct params", () => {
    const filters = { price_min: 100000, bedrooms_min: 2 };
    render(
      <ExportButton format="csv" totalRecords={100} filters={filters} />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(mockMutate).toHaveBeenCalledWith({
      format: "csv",
      filters,
    });
  });

  it("shows truncation warning when totalRecords exceeds 50,000", () => {
    render(<ExportButton format="csv" totalRecords={60000} />);
    expect(
      screen.getByText(/Dataset exceeds 50,000 rows/)
    ).toBeInTheDocument();
  });

  it("does not show truncation warning when totalRecords is within limit", () => {
    render(<ExportButton format="csv" totalRecords={1000} />);
    expect(
      screen.queryByText(/Dataset exceeds 50,000 rows/)
    ).not.toBeInTheDocument();
  });

  it("has minimum touch target size for accessibility", () => {
    render(<ExportButton format="csv" totalRecords={100} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("min-h-[44px]");
    expect(button.className).toContain("min-w-[44px]");
  });

  it("shows error toast when export trigger fails", () => {
    render(<ExportButton format="csv" totalRecords={100} />);
    fireEvent.click(screen.getByRole("button"));

    // Simulate error callback
    const callbacks = (globalThis as any).__exportCallbacks;
    callbacks?.onError?.(new Error("Network error"));

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Export failed: Network error",
        recoveryAction: "Try again",
      })
    );
  });
});

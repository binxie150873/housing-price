"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { HistoryTable } from "./HistoryTable";
import type { PaginatedResponse, HistoryItem } from "@/lib/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockHistoryData: PaginatedResponse<HistoryItem> = {
  items: [
    {
      estimate_id: "abc-123",
      neighborhood: "CollgCr",
      predicted_price: 215000.5,
      gr_liv_area: 1710,
      bedroom: 3,
      full_bath: 2,
      garage_cars: 2,
      created_at: "2025-01-15T10:30:00Z",
    },
    {
      estimate_id: "def-456",
      neighborhood: "Veenker",
      predicted_price: 320000.0,
      gr_liv_area: 2200,
      bedroom: 4,
      full_bath: 3,
      garage_cars: 3,
      created_at: "2025-01-14T09:00:00Z",
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const emptyResponse: PaginatedResponse<HistoryItem> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};

describe("HistoryTable", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("displays skeleton loader while loading", () => {
    // Never resolve the fetch
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<HistoryTable />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders history data in table after loading", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    });

    vi.useRealTimers();
    render(<HistoryTable />);

    await waitFor(() => {
      expect(screen.getByText("CollgCr")).toBeInTheDocument();
    });

    expect(screen.getByText("Veenker")).toBeInTheDocument();
    expect(screen.getByText("$215,000.50")).toBeInTheDocument();
    expect(screen.getByText("$320,000.00")).toBeInTheDocument();
    expect(screen.getByText("1,710")).toBeInTheDocument();
    expect(screen.getByText("2,200")).toBeInTheDocument();
  });

  it("displays empty state when no results", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(emptyResponse),
    });

    vi.useRealTimers();
    render(<HistoryTable />);

    await waitFor(() => {
      expect(
        screen.getByText(/No results found matching your current search or filter criteria/)
      ).toBeInTheDocument();
    });
  });

  it("displays error state with retry button on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    vi.useRealTimers();
    render(<HistoryTable />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(
      screen.getByText("The history service is temporarily unavailable.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("retries fetch when retry button is clicked", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

    vi.useRealTimers();
    render(<HistoryTable />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText("CollgCr")).toBeInTheDocument();
    });
  });

  it("navigates to result page on row click", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    });

    vi.useRealTimers();
    render(<HistoryTable />);

    await waitFor(() => {
      expect(screen.getByText("CollgCr")).toBeInTheDocument();
    });

    // Click the row containing "CollgCr"
    const row = screen.getByText("CollgCr").closest("tr");
    if (row) {
      fireEvent.click(row);
    }

    expect(mockPush).toHaveBeenCalledWith("/estimator/result/abc-123");
  });

  it("debounces search input and sends request after 500ms", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    });

    vi.useRealTimers();
    render(<HistoryTable />);

    // Wait for initial fetch
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByLabelText("Search estimation history");
    fireEvent.change(searchInput, { target: { value: "Col" } });

    // Wait for debounce (500ms) + re-render
    await waitFor(
      () => {
        const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
        expect(lastCall?.[0]).toContain("search=Col");
      },
      { timeout: 2000 }
    );
  });

  it("sends date filter params on change", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    });

    vi.useRealTimers();
    render(<HistoryTable />);

    // Wait for initial load
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    const dateFromInput = screen.getByLabelText("Filter from date");
    fireEvent.change(dateFromInput, { target: { value: "2025-01-01" } });

    await waitFor(
      () => {
        const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
        expect(lastCall?.[0]).toContain("date_from=2025-01-01");
      },
      { timeout: 2000 }
    );
  });

  it("sends price filter params on change", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryData),
    });

    vi.useRealTimers();
    render(<HistoryTable />);

    // Wait for initial load
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    const priceMinInput = screen.getByLabelText("Minimum price filter");
    fireEvent.change(priceMinInput, { target: { value: "100000" } });

    await waitFor(
      () => {
        const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
        expect(lastCall?.[0]).toContain("price_min=100000");
      },
      { timeout: 2000 }
    );
  });

  it("has accessible search input", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<HistoryTable />);
    expect(screen.getByLabelText("Search estimation history")).toBeInTheDocument();
  });

  it("has accessible date and price filter inputs", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<HistoryTable />);
    expect(screen.getByLabelText("Filter from date")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter to date")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum price filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum price filter")).toBeInTheDocument();
  });
});

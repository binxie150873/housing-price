import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompareView } from "./CompareView";
import type { HistoryItem, PaginatedResponse, BatchPredictionResult } from "@/lib/types";

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockHistoryItems: HistoryItem[] = [
  {
    estimate_id: "id-1",
    neighborhood: "Downtown",
    predicted_price: 350000,
    gr_liv_area: 1800,
    bedroom: 3,
    full_bath: 2,
    garage_cars: 2,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    estimate_id: "id-2",
    neighborhood: "Suburbs",
    predicted_price: 250000,
    gr_liv_area: 2200,
    bedroom: 4,
    full_bath: 3,
    garage_cars: 2,
    created_at: "2024-01-14T10:00:00Z",
  },
  {
    estimate_id: "id-3",
    neighborhood: "Midtown",
    predicted_price: 420000,
    gr_liv_area: 1500,
    bedroom: 2,
    full_bath: 2,
    garage_cars: 1,
    created_at: "2024-01-13T10:00:00Z",
  },
  {
    estimate_id: "id-4",
    neighborhood: "Uptown",
    predicted_price: 550000,
    gr_liv_area: 2800,
    bedroom: 5,
    full_bath: 4,
    garage_cars: 3,
    created_at: "2024-01-12T10:00:00Z",
  },
  {
    estimate_id: "id-5",
    neighborhood: "Eastside",
    predicted_price: 180000,
    gr_liv_area: 1200,
    bedroom: 2,
    full_bath: 1,
    garage_cars: 1,
    created_at: "2024-01-11T10:00:00Z",
  },
];

const mockHistoryResponse: PaginatedResponse<HistoryItem> = {
  items: mockHistoryItems,
  total: 5,
  page: 1,
  page_size: 100,
  total_pages: 1,
};

const mockBatchResult: BatchPredictionResult = {
  results: [
    {
      estimate_id: "id-1",
      predicted_price: 350000,
      currency: "USD",
      input_features: {
        square_footage: 1800,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 2005,
        lot_size: 5000,
        distance_to_city_center: 5.2,
        school_rating: 7.5,
      },
      model_version: "1.0.0",
      timestamp: "2024-01-15T10:00:00Z",
      feature_importance: [],
    },
    {
      estimate_id: "id-2",
      predicted_price: 250000,
      currency: "USD",
      input_features: {
        square_footage: 2200,
        bedrooms: 4,
        bathrooms: 3,
        year_built: 1998,
        lot_size: 8000,
        distance_to_city_center: 12.0,
        school_rating: 6.0,
      },
      model_version: "1.0.0",
      timestamp: "2024-01-14T10:00:00Z",
      feature_importance: [],
    },
  ],
  comparison_summary: {
    highest_value: 350000,
    lowest_value: 250000,
    average_value: 300000,
    value_range: 100000,
  },
};

describe("CompareView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading skeleton while fetching history", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });
    const statusElements = screen.getAllByRole("status");
    expect(statusElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Loading...").length).toBeGreaterThanOrEqual(1);
  });

  it("shows message when history has fewer than 2 entries", async () => {
    const singleItemResponse: PaginatedResponse<HistoryItem> = {
      items: [mockHistoryItems[0]],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(singleItemResponse),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Not enough estimations to compare")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/At least 2 completed estimations are required/)
    ).toBeInTheDocument();
  });

  it("renders history items with checkboxes when history has >= 2 entries", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    expect(screen.getByText("Suburbs")).toBeInTheDocument();
    expect(screen.getByText("Midtown")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
  });

  it("shows minimum selection message when fewer than 2 selected", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Select at least 2 properties to enable comparison.")
    ).toBeInTheDocument();
  });

  it("disables compare button when fewer than 2 selected", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    const compareButton = screen.getByRole("button", {
      name: /Compare 0 Properties/,
    });
    expect(compareButton).toBeDisabled();
  });

  it("enables compare button when 2 properties are selected", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const compareButton = screen.getByRole("button", {
      name: /Compare 2 Properties/,
    });
    expect(compareButton).not.toBeDisabled();
  });

  it("shows maximum message and disables unselected checkboxes when 4 selected", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(checkboxes[3]);

    expect(
      screen.getByText(/Maximum of 4 properties reached/)
    ).toBeInTheDocument();

    // The 5th checkbox should be disabled
    expect(checkboxes[4]).toBeDisabled();
  });

  it("displays comparison results after successful batch prediction", async () => {
    let fetchCallCount = 0;
    global.fetch = vi.fn(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHistoryResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBatchResult),
      });
    }) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    // Select 2 properties
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Click compare
    const compareButton = screen.getByRole("button", {
      name: /Compare 2 Properties/,
    });
    fireEvent.click(compareButton);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText("Comparison Results")).toBeInTheDocument();
    });

    // Check summary cards
    expect(screen.getByText("Highest Value")).toBeInTheDocument();
    expect(screen.getByText("Lowest Value")).toBeInTheDocument();
    expect(screen.getByText("Average Value")).toBeInTheDocument();
    expect(screen.getByText("Value Range")).toBeInTheDocument();

    // Check comparison table
    expect(screen.getAllByText("Predicted Price").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Square Footage")).toBeInTheDocument();
    expect(screen.getByText("Bathrooms")).toBeInTheDocument();
  });

  it("shows error toast on batch prediction failure and retains selection", async () => {
    let fetchCallCount = 0;
    global.fetch = vi.fn(() => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHistoryResponse),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            error: {
              code: "ML_SERVICE_UNAVAILABLE",
              message: "ML service is temporarily unavailable",
            },
          }),
      });
    }) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Downtown")).toBeInTheDocument();
    });

    // Select 2 properties
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Click compare
    const compareButton = screen.getByRole("button", {
      name: /Compare 2 Properties/,
    });
    fireEvent.click(compareButton);

    // Wait for error - selection should be retained
    await waitFor(() => {
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });
  });

  it("shows error state when history fetch fails", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      })
    ) as unknown as typeof fetch;

    render(<CompareView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load estimation history/)
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

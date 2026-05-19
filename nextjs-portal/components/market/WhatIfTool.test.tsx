import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WhatIfTool } from "./WhatIfTool";

// Mock recharts
vi.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockLineChart = ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-items={data?.length ?? 0}>
      {children}
    </div>
  );
  const MockLine = () => <div data-testid="line" />;
  const MockXAxis = () => <div data-testid="x-axis" />;
  const MockYAxis = () => <div data-testid="y-axis" />;
  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />;
  const MockTooltip = () => <div data-testid="tooltip" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    Line: MockLine,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
  };
});

// Mock the market API client
const mockPredictWhatIf = vi.fn();
vi.mock("@/lib/api/market-client", () => ({
  predictWhatIf: (...args: unknown[]) => mockPredictWhatIf(...args),
}));

// Mock the hook to use our mocked function
vi.mock("@/lib/hooks/use-market", () => ({
  useWhatIfPrediction: (options: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void }) => {
    return {
      mutate: (request: unknown) => {
        mockPredictWhatIf(request)
          .then((result: unknown) => options?.onSuccess?.(result))
          .catch((err: unknown) => options?.onError?.(err));
      },
      isPending: false,
    };
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("WhatIfTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPredictWhatIf.mockResolvedValue({
      base_prediction: { predicted_value: 300000 },
      modified_prediction: { predicted_value: 320000 },
      value_difference: 20000,
      percentage_change: 6.67,
    });
  });

  it("renders all 7 feature sliders", () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    expect(screen.getByLabelText("Square Footage")).toBeInTheDocument();
    expect(screen.getByLabelText("Bedrooms")).toBeInTheDocument();
    expect(screen.getByLabelText("Bathrooms")).toBeInTheDocument();
    expect(screen.getByLabelText("Year Built")).toBeInTheDocument();
    expect(screen.getByLabelText("Lot Size (sq ft)")).toBeInTheDocument();
    expect(screen.getByLabelText("Distance to City Center (mi)")).toBeInTheDocument();
    expect(screen.getByLabelText("School Rating (0-10)")).toBeInTheDocument();
  });

  it("renders lock toggle buttons for each parameter", () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    const lockButtons = screen.getAllByRole("button", { pressed: false });
    // Filter to only lock buttons (they have aria-pressed)
    const lockToggles = lockButtons.filter(
      (btn) => btn.getAttribute("aria-pressed") !== null
    );
    expect(lockToggles.length).toBe(7);
  });

  it("locks a parameter when toggle is clicked", async () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    const lockBtn = screen.getByLabelText("Lock Square Footage");
    fireEvent.click(lockBtn);
    await waitFor(() => {
      expect(lockBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("prevents locking all parameters (at least one must remain unlocked)", async () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    // Lock 6 parameters
    const labels = [
      "Lock Square Footage",
      "Lock Bedrooms",
      "Lock Bathrooms",
      "Lock Year Built",
      "Lock Lot Size (sq ft)",
      "Lock Distance to City Center (mi)",
    ];
    for (const label of labels) {
      fireEvent.click(screen.getByLabelText(label));
    }
    // Try to lock the 7th - should not work
    const lastLockBtn = screen.getByLabelText("Lock School Rating (0-10)");
    fireEvent.click(lastLockBtn);
    await waitFor(() => {
      expect(lastLockBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("displays prediction results after successful API call", async () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Predicted Price")).toBeInTheDocument();
    });
    expect(screen.getByText("Absolute Difference")).toBeInTheDocument();
    expect(screen.getByText("Percentage Change")).toBeInTheDocument();
  });

  it("shows ML unavailable error when API fails and no previous result", async () => {
    mockPredictWhatIf.mockRejectedValue(new Error("Service unavailable"));
    render(<WhatIfTool />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText(/ML service is currently unavailable/)
      ).toBeInTheDocument();
    });
  });

  it("renders sensitivity analysis section with parameter selector", () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    expect(screen.getByText("Sensitivity Analysis")).toBeInTheDocument();
    expect(screen.getByLabelText("Parameter:")).toBeInTheDocument();
  });

  it("renders the sensitivity chart area", () => {
    render(<WhatIfTool />, { wrapper: createWrapper() });
    // The sensitivity chart should be present (either loading or with data)
    expect(
      screen.getByRole("status", { name: "Loading sensitivity chart" }) ||
        screen.getByTestId("line-chart")
    ).toBeTruthy();
  });
});

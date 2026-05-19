import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SensitivityChart, SensitivityDataPoint } from "./SensitivityChart";

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockLineChart = ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-items={data.length}>
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

const mockData: SensitivityDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
  parameterValue: 1000 + i * 9090,
  predictedPrice: 200000 + i * 15000,
}));

describe("SensitivityChart", () => {
  it("renders the line chart with data", () => {
    render(
      <SensitivityChart
        data={mockData}
        parameterName="square_footage"
        parameterLabel="Square Footage"
      />
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("passes correct number of data points to chart", () => {
    render(
      <SensitivityChart
        data={mockData}
        parameterName="square_footage"
        parameterLabel="Square Footage"
      />
    );
    const chart = screen.getByTestId("line-chart");
    expect(chart).toHaveAttribute("data-items", "12");
  });

  it("provides ARIA label describing the chart", () => {
    render(
      <SensitivityChart
        data={mockData}
        parameterName="square_footage"
        parameterLabel="Square Footage"
      />
    );
    const chartContainer = screen.getByRole("img");
    expect(chartContainer).toHaveAttribute("aria-label");
    const ariaLabel = chartContainer.getAttribute("aria-label") || "";
    expect(ariaLabel).toContain("Line chart");
    expect(ariaLabel).toContain("Square Footage");
    expect(ariaLabel).toContain("Predicted Price");
    expect(ariaLabel).toContain("12 data points");
  });

  it("shows loading state when isLoading is true", () => {
    render(
      <SensitivityChart
        data={[]}
        parameterName="square_footage"
        parameterLabel="Square Footage"
        isLoading={true}
      />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Computing sensitivity...")).toBeInTheDocument();
  });

  it("shows empty state when no data and not loading", () => {
    render(
      <SensitivityChart
        data={[]}
        parameterName="square_footage"
        parameterLabel="Square Footage"
      />
    );
    expect(
      screen.getByText("Select a parameter to view sensitivity analysis")
    ).toBeInTheDocument();
  });
});

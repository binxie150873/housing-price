import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FeatureImportanceChart } from "./FeatureImportanceChart";
import type { FeatureImportance } from "@/lib/types";

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  );
  const MockBarChart = ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-items={data.length}>
      {children}
    </div>
  );
  const MockBar = () => <div data-testid="bar" />;
  const MockXAxis = () => <div data-testid="x-axis" />;
  const MockYAxis = () => <div data-testid="y-axis" />;
  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />;
  const MockTooltip = () => <div data-testid="tooltip" />;
  const MockCell = () => <div data-testid="cell" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: MockBar,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
    Cell: MockCell,
  };
});

const mockData: FeatureImportance[] = [
  { feature: "square_footage", importance: 40 },
  { feature: "bedrooms", importance: 20 },
  { feature: "school_rating", importance: 15 },
  { feature: "year_built", importance: 10 },
  { feature: "lot_size", importance: 8 },
  { feature: "distance_to_city_center", importance: 5 },
  { feature: "bathrooms", importance: 2 },
];

describe("FeatureImportanceChart", () => {
  it("renders the chart container with heading", () => {
    render(<FeatureImportanceChart data={mockData} />);
    expect(screen.getByText("Feature Importance")).toBeInTheDocument();
  });

  it("provides ARIA label describing the chart", () => {
    render(<FeatureImportanceChart data={mockData} />);
    const chartContainer = screen.getByRole("img");
    expect(chartContainer).toHaveAttribute("aria-label");
    const ariaLabel = chartContainer.getAttribute("aria-label") || "";
    expect(ariaLabel).toContain("Horizontal bar chart");
    expect(ariaLabel).toContain("feature importance");
    expect(ariaLabel).toContain("100%");
  });

  it("renders the bar chart component", () => {
    render(<FeatureImportanceChart data={mockData} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("passes correct number of data items to chart", () => {
    render(<FeatureImportanceChart data={mockData} />);
    const chart = screen.getByTestId("bar-chart");
    expect(chart).toHaveAttribute("data-items", "7");
  });

  it("renders with empty data without crashing", () => {
    render(<FeatureImportanceChart data={[]} />);
    expect(screen.getByText("Feature Importance")).toBeInTheDocument();
  });
});

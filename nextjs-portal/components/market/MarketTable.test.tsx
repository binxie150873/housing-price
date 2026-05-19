import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketTable } from "./MarketTable";
import type { PropertyData, PaginatedResponse } from "@/lib/types";

const mockPropertyData: PaginatedResponse<PropertyData> = {
  items: [
    {
      id: 1,
      square_footage: 1200,
      bedrooms: 3,
      bathrooms: 2,
      year_built: 1960,
      lot_size: 8450,
      distance_to_city_center: 5.2,
      school_rating: 7,
      price: 215000,
      created_at: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      square_footage: 1800,
      bedrooms: 4,
      bathrooms: 3,
      year_built: 2003,
      lot_size: 9600,
      distance_to_city_center: 3.1,
      school_rating: 9,
      price: 310000,
      created_at: "2024-02-20T14:30:00Z",
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

// Mock hooks
vi.mock("@/lib/hooks/use-market", () => ({
  usePropertyData: () => ({
    data: mockPropertyData,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useTriggerExport: () => ({ mutate: vi.fn() }),
  useExportStatus: () => ({ data: null }),
}));

vi.mock("@/lib/toast-store", () => ({
  useToastStore: (selector: any) => {
    const state = { addToast: vi.fn() };
    return selector(state);
  },
}));

describe("MarketTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the filter controls", () => {
    render(<MarketTable />);
    expect(screen.getByLabelText("Min Price")).toBeInTheDocument();
    expect(screen.getByLabelText("Max Price")).toBeInTheDocument();
    expect(screen.getByLabelText("Bedrooms (min)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bedrooms (max)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bathrooms (min)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bathrooms (max)")).toBeInTheDocument();
    expect(screen.getByLabelText("Year Built (min)")).toBeInTheDocument();
    expect(screen.getByLabelText("Year Built (max)")).toBeInTheDocument();
    expect(screen.getByLabelText("Sq Ft (min)")).toBeInTheDocument();
    expect(screen.getByLabelText("Sq Ft (max)")).toBeInTheDocument();
  });

  it("renders the data table with property data", () => {
    render(<MarketTable />);
    expect(screen.getByText("$215,000")).toBeInTheDocument();
    expect(screen.getByText("$310,000")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("1,800")).toBeInTheDocument();
  });

  it("renders sortable column headers", () => {
    render(<MarketTable />);
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Sq Ft")).toBeInTheDocument();
    expect(screen.getByText("Beds")).toBeInTheDocument();
    expect(screen.getByText("Baths")).toBeInTheDocument();
    expect(screen.getAllByText("Year Built").length).toBeGreaterThanOrEqual(1);
  });

  it("renders export buttons", () => {
    render(<MarketTable />);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeInTheDocument();
  });

  it("displays record count", () => {
    render(<MarketTable />);
    expect(screen.getByText("2 records found")).toBeInTheDocument();
  });

  it("renders filter inputs that accept user input", () => {
    render(<MarketTable />);
    const minPriceInput = screen.getByLabelText("Min Price");
    fireEvent.change(minPriceInput, { target: { value: "100000" } });
    expect(minPriceInput).toHaveValue(100000);
  });

  it("shows clear all button when filters are active", () => {
    render(<MarketTable />);
    const minPriceInput = screen.getByLabelText("Min Price");
    fireEvent.change(minPriceInput, { target: { value: "100000" } });
    expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
  });

  it("clears filters when clear all is clicked", () => {
    render(<MarketTable />);
    const minPriceInput = screen.getByLabelText("Min Price");
    fireEvent.change(minPriceInput, { target: { value: "100000" } });
    fireEvent.click(screen.getByLabelText("Clear all filters"));
    expect(minPriceInput).toHaveValue(null);
  });

  it("has accessible table label", () => {
    render(<MarketTable />);
    expect(
      screen.getByRole("table", { name: "Property market data table" })
    ).toBeInTheDocument();
  });
});

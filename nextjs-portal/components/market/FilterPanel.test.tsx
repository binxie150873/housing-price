import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { FilterPanel } from "./FilterPanel";
import { StatisticsFilters } from "@/lib/api/market-client";

describe("FilterPanel", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    filters: {} as StatisticsFilters,
    onFiltersChange: vi.fn(),
  };

  it("renders with region role and accessible label", () => {
    render(<FilterPanel {...defaultProps} />);
    const region = screen.getByRole("region", { name: /dashboard filters/i });
    expect(region).toBeInTheDocument();
  });

  it("renders price range inputs with correct min/max", () => {
    render(<FilterPanel {...defaultProps} />);
    const minInput = screen.getByLabelText("Minimum price");
    const maxInput = screen.getByLabelText("Maximum price");
    expect(minInput).toHaveAttribute("min", "0");
    expect(minInput).toHaveAttribute("max", "10000000");
    expect(maxInput).toHaveAttribute("min", "0");
    expect(maxInput).toHaveAttribute("max", "10000000");
  });

  it("renders bedrooms range inputs", () => {
    render(<FilterPanel {...defaultProps} />);
    const minInput = screen.getByLabelText("Minimum bedrooms");
    const maxInput = screen.getByLabelText("Maximum bedrooms");
    expect(minInput).toHaveAttribute("min", "0");
    expect(minInput).toHaveAttribute("max", "20");
    expect(maxInput).toHaveAttribute("min", "0");
    expect(maxInput).toHaveAttribute("max", "20");
  });

  it("renders year built range inputs", () => {
    render(<FilterPanel {...defaultProps} />);
    const minYear = screen.getByLabelText("Minimum year built");
    const maxYear = screen.getByLabelText("Maximum year built");
    expect(minYear).toHaveAttribute("min", "1800");
    expect(maxYear).toHaveAttribute("min", "1800");
  });

  it("calls onFiltersChange when price min changes", () => {
    const onFiltersChange = vi.fn();
    render(<FilterPanel filters={{}} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByLabelText("Minimum price"), {
      target: { value: "100000" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ price_min: 100000 });
  });

  it("calls onFiltersChange when bedrooms min changes", () => {
    const onFiltersChange = vi.fn();
    render(<FilterPanel filters={{}} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByLabelText("Minimum bedrooms"), {
      target: { value: "2" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ bedrooms_min: 2 });
  });

  it("calls onFiltersChange when year min changes", () => {
    const onFiltersChange = vi.fn();
    render(<FilterPanel filters={{}} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByLabelText("Minimum year built"), {
      target: { value: "2000" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ year_min: 2000 });
  });

  it("shows clear all button when filters are active", () => {
    render(
      <FilterPanel
        filters={{ price_min: 50000 }}
        onFiltersChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
  });

  it("does not show clear all button when no filters are active", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
  });

  it("calls onFiltersChange with empty object when clear all is clicked", () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterPanel
        filters={{ price_min: 50000, bedrooms_min: 2 }}
        onFiltersChange={onFiltersChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onFiltersChange).toHaveBeenCalledWith({});
  });
});

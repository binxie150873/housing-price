import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SkeletonLoader } from "./SkeletonLoader";

describe("SkeletonLoader", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with role=status and aria-live=polite", () => {
    render(<SkeletonLoader />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-label", "Loading content");
  });

  it("renders a screen-reader-only loading text", () => {
    render(<SkeletonLoader />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the specified number of skeleton items", () => {
    const { container } = render(<SkeletonLoader variant="table-row" count={5} />);
    const rows = container.querySelectorAll(".animate-pulse");
    expect(rows).toHaveLength(5);
  });

  it("renders card variant with expected structure", () => {
    const { container } = render(<SkeletonLoader variant="card" />);
    const card = container.querySelector(".animate-pulse.rounded-lg");
    expect(card).toBeInTheDocument();
  });

  it("renders chart variant with expected height", () => {
    const { container } = render(<SkeletonLoader variant="chart" height="300px" />);
    const chart = container.querySelector(".animate-pulse");
    expect(chart).toHaveStyle({ height: "300px" });
  });

  it("applies custom className", () => {
    const { container } = render(<SkeletonLoader className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});

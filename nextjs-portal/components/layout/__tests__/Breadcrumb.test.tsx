import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Breadcrumb } from "../Breadcrumb";

// Mock next/navigation
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Breadcrumb", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing on the root path", () => {
    mockPathname.mockReturnValue("/");
    const { container } = render(<Breadcrumb />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders a single level for /estimator", () => {
    mockPathname.mockReturnValue("/estimator");
    render(<Breadcrumb />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Estimator")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("renders two levels for /estimator/history", () => {
    mockPathname.mockReturnValue("/estimator/history");
    render(<Breadcrumb />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Estimator")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("renders at most 3 levels even for deeper paths", () => {
    mockPathname.mockReturnValue("/estimator/result/abc123/details");
    render(<Breadcrumb />);

    const items = screen.getAllByRole("listitem");
    // Home + 3 segments = 4 list items max
    expect(items.length).toBeLessThanOrEqual(4);
    // Should not render "details" (4th segment)
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
  });

  it("marks the last breadcrumb with aria-current='page'", () => {
    mockPathname.mockReturnValue("/market");
    render(<Breadcrumb />);

    const current = screen.getByText("Market");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("capitalizes segment labels and replaces hyphens with spaces", () => {
    mockPathname.mockReturnValue("/estimator/my-history");
    render(<Breadcrumb />);

    expect(screen.getByText("My History")).toBeInTheDocument();
  });
});

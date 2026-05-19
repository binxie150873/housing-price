import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AppSwitcher } from "../AppSwitcher";
import { usePortalStore } from "@/lib/store";

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

describe("AppSwitcher", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
    usePortalStore.setState({ activeApp: "home" });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all three navigation tabs", () => {
    render(<AppSwitcher />);

    expect(screen.getByRole("tab", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Estimator" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Market" })).toBeInTheDocument();
  });

  it("marks Home as active on root path", () => {
    mockPathname.mockReturnValue("/");
    render(<AppSwitcher />);

    const homeTab = screen.getByRole("tab", { name: "Home" });
    expect(homeTab).toHaveAttribute("aria-selected", "true");
    expect(homeTab).toHaveAttribute("aria-current", "page");
  });

  it("marks Estimator as active on /estimator paths", () => {
    mockPathname.mockReturnValue("/estimator/history");
    render(<AppSwitcher />);

    const estimatorTab = screen.getByRole("tab", { name: "Estimator" });
    expect(estimatorTab).toHaveAttribute("aria-selected", "true");

    const homeTab = screen.getByRole("tab", { name: "Home" });
    expect(homeTab).toHaveAttribute("aria-selected", "false");
  });

  it("marks Market as active on /market paths", () => {
    mockPathname.mockReturnValue("/market/dashboard");
    render(<AppSwitcher />);

    const marketTab = screen.getByRole("tab", { name: "Market" });
    expect(marketTab).toHaveAttribute("aria-selected", "true");
  });

  it("renders correct href for each tab", () => {
    render(<AppSwitcher />);

    expect(screen.getByRole("tab", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("tab", { name: "Estimator" })).toHaveAttribute("href", "/estimator");
    expect(screen.getByRole("tab", { name: "Market" })).toHaveAttribute("href", "/market");
  });

  it("has keyboard-accessible navigation (tablist role)", () => {
    render(<AppSwitcher />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("provides application switcher aria-label", () => {
    render(<AppSwitcher />);
    expect(
      screen.getByRole("navigation", { name: "Application switcher" })
    ).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TopNav } from "../TopNav";
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

describe("TopNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
    // Reset Zustand store state
    usePortalStore.setState({ isMobileMenuOpen: false, activeApp: "home" });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the brand name", () => {
    render(<TopNav />);
    expect(screen.getByText("Property Portal")).toBeInTheDocument();
  });

  it("renders with role='banner' for accessibility", () => {
    render(<TopNav />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the hamburger menu button for mobile", () => {
    render(<TopNav />);
    const menuButton = screen.getByLabelText("Open menu");
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles mobile menu on hamburger click", () => {
    render(<TopNav />);
    const menuButton = screen.getByLabelText("Open menu");

    fireEvent.click(menuButton);

    // After click, the button label should change
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
    expect(screen.getByLabelText("Close menu")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("shows mobile menu content when open", () => {
    // Render with menu initially closed, then toggle it
    render(<TopNav />);

    // Click to open
    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);

    // After clicking, the store state should be toggled
    // (mobile menu overlay is now rendered by the separate MobileMenu component)
    expect(usePortalStore.getState().isMobileMenuOpen).toBe(true);
  });

  it("has minimum touch target size for hamburger button", () => {
    render(<TopNav />);
    const menuButton = screen.getByLabelText("Open menu");
    // Check that the button has min-w and min-h classes for 44px touch target
    expect(menuButton.className).toContain("min-w-[44px]");
    expect(menuButton.className).toContain("min-h-[44px]");
  });
});

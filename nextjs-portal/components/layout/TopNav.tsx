"use client";

import { AppSwitcher } from "./AppSwitcher";
import { Breadcrumb } from "./Breadcrumb";
import { usePortalStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

/**
 * TopNav - Fixed-position top navigation bar.
 * Contains the AppSwitcher for tab-style navigation and Breadcrumb for path display.
 * Includes a hamburger menu button for mobile viewports (< 768px).
 */
export function TopNav() {
  const isMobileMenuOpen = usePortalStore((s) => s.isMobileMenuOpen);
  const toggleMobileMenu = usePortalStore((s) => s.toggleMobileMenu);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo / Brand */}
        <span className="mr-4 text-lg font-semibold whitespace-nowrap">
          Property Portal
        </span>

        {/* Desktop AppSwitcher */}
        <div className="hidden md:flex flex-1 items-center">
          <AppSwitcher />
        </div>

        {/* Mobile hamburger button - visible only on viewports < 768px */}
        <button
          type="button"
          className={cn(
            "ml-auto md:hidden inline-flex items-center justify-center rounded-md p-2",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "min-w-[44px] min-h-[44px]"
          )}
          onClick={toggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Breadcrumb row - desktop only */}
      <div className="container mx-auto px-4 pb-2 hidden md:block">
        <Breadcrumb />
      </div>
    </header>
  );
}

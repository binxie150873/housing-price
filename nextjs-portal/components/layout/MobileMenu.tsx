"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortalStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Home, Building, BarChart3, X } from "lucide-react";
import { useEffect } from "react";

const navItems = [
  { id: "home" as const, label: "Home", href: "/", icon: Home },
  {
    id: "estimator" as const,
    label: "Property Value Estimator",
    href: "/estimator",
    icon: Building,
  },
  {
    id: "market" as const,
    label: "Property Market Analysis",
    href: "/market",
    icon: BarChart3,
  },
];

/**
 * MobileMenu - Overlay navigation menu for viewports < 768px.
 * Triggered by the hamburger button in TopNav.
 * Provides full-screen overlay with navigation links and close button.
 * All interactive elements have minimum 44×44px touch targets.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const isMobileMenuOpen = usePortalStore((s) => s.isMobileMenuOpen);
  const setMobileMenuOpen = usePortalStore((s) => s.setMobileMenuOpen);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  // Close menu on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen, setMobileMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  if (!isMobileMenuOpen) return null;

  return (
    <div
      id="mobile-menu"
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Menu panel */}
      <nav
        className="relative z-10 flex flex-col h-full bg-background border-r shadow-lg w-[280px] max-w-[80vw]"
        aria-label="Mobile navigation"
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <span className="text-lg font-semibold">Menu</span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "inline-flex items-center justify-center rounded-md p-2",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "min-w-[44px] min-h-[44px]"
            )}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <ul className="flex-1 px-2 py-4 space-y-1" role="list">
          {navItems.map((item) => {
            const isActive =
              item.id === "home"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "min-h-[44px]",
                    isActive
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

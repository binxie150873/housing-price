"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePortalStore } from "@/lib/store";
import { useEffect } from "react";

const apps = [
  { id: "home" as const, label: "Home", href: "/" },
  { id: "estimator" as const, label: "Estimator", href: "/estimator" },
  { id: "market" as const, label: "Market", href: "/market" },
];

export function AppSwitcher() {
  const pathname = usePathname();
  const setActiveApp = usePortalStore((s) => s.setActiveApp);

  useEffect(() => {
    if (pathname.startsWith("/estimator")) {
      setActiveApp("estimator");
    } else if (pathname.startsWith("/market")) {
      setActiveApp("market");
    } else {
      setActiveApp("home");
    }
  }, [pathname, setActiveApp]);

  return (
    <nav aria-label="Application switcher" role="navigation">
      <ul className="flex items-center gap-1" role="tablist">
        {apps.map((app) => {
          const isActive =
            app.id === "home"
              ? pathname === "/"
              : pathname.startsWith(app.href);

          return (
            <li key={app.id} role="presentation">
              <Link
                href={app.href}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "min-h-[44px] min-w-[44px] justify-center",
                  isActive
                    ? "text-primary border-b-2 border-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {app.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

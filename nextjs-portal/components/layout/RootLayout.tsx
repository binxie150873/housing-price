import { Suspense } from "react";
import { TopNav } from "./TopNav";
import { MobileMenu } from "./MobileMenu";
import { Footer } from "./Footer";

/**
 * RootLayout - Server Component that wraps the application content
 * with the navigation shell (TopNav, MobileMenu, Footer) and provides
 * consistent page structure.
 *
 * Note: The Providers wrapper (QueryClientProvider, etc.) is applied in app/layout.tsx.
 * This component handles the visual layout shell: TopNav + main content area + Footer.
 */
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <MobileMenu />
      {/* Spacer to offset fixed header height */}
      <div className="pt-[4.5rem] md:pt-[5.5rem] flex-1 flex flex-col max-w-full overflow-x-hidden">
        {children}
      </div>
      <Suspense
        fallback={
          <footer className="border-t bg-muted/30">
            <div className="container mx-auto px-4 py-3 text-xs text-muted-foreground text-center">
              Loading status...
            </div>
          </footer>
        }
      >
        <Footer />
      </Suspense>
    </>
  );
}

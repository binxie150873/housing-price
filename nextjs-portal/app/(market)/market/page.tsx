"use client";

import { useState, useCallback } from "react";
import { Download, FileText } from "lucide-react";
import { useMarketStatistics } from "@/lib/hooks/use-market";
import { StatisticsFilters } from "@/lib/api/market-client";
import { FilterPanel } from "@/components/market/FilterPanel";
import { SquareFootagePriceChart } from "@/components/market/SquareFootagePriceChart";
import { YearBuiltPieChart } from "@/components/market/YearBuiltPieChart";
import { DistanceSchoolBarChart } from "@/components/market/DistanceSchoolBarChart";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import type { MarketStatistics } from "@/lib/types";

/**
 * Market Analysis Dashboard page.
 * Displays a responsive grid of chart widgets with filter controls.
 * Charts update within 500ms of filter change completing API call.
 */
export default function MarketPage() {
  const [filters, setFilters] = useState<StatisticsFilters>({});

  const {
    data: statistics,
    isLoading,
    isError,
    error,
    refetch,
  } = useMarketStatistics(filters);

  const handleFiltersChange = useCallback((newFilters: StatisticsFilters) => {
    setFilters(newFilters);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (!statistics) return;
    const csv = buildCsv(statistics);
    downloadFile(csv, "market-analysis.csv", "text/csv");
  }, [statistics]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Property Market Analysis
          </h1>
          <p className="mt-2 text-muted-foreground">
            Explore market trends, statistics, and distributions.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleExportCsv}
            disabled={isLoading || !statistics}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
            aria-label="Export data as CSV"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isLoading || !statistics}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
            aria-label="Export charts as PDF"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            PDF
          </button>
        </div>
      </div>

      {/* Dashboard layout: sidebar filters + chart grid */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter Panel - sidebar on desktop, full-width on mobile */}
        <aside className="w-full md:w-72 shrink-0 print:hidden">
          <FilterPanel filters={filters} onFiltersChange={handleFiltersChange} />
        </aside>

        {/* Chart Grid */}
        <main className="flex-1 min-w-0">
          {isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <div className="space-y-6">
              {/* Line Chart - full width */}
              <div>
                <ChartCard title="Square Footage vs Price">
                  {isLoading ? (
                    <SkeletonLoader variant="chart" height="300px" />
                  ) : (
                    <div className="h-[300px]">
                      <SquareFootagePriceChart
                        data={statistics?.squareFootageVsPrice ?? []}
                      />
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Pie Chart + Clustered Bar Chart - side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <ChartCard title="Average Price by Year Built (Decade)">
                    {isLoading ? (
                      <SkeletonLoader variant="chart" height="300px" />
                    ) : (
                      <div className="h-[300px]">
                        <YearBuiltPieChart
                          data={statistics?.yearBuiltVsPrice ?? []}
                        />
                      </div>
                    )}
                  </ChartCard>
                </div>

                <div>
                  <ChartCard title="Distance & School Rating vs Price">
                    {isLoading ? (
                      <SkeletonLoader variant="chart" height="300px" />
                    ) : (
                      <div className="h-[300px]">
                        <DistanceSchoolBarChart
                          data={
                            statistics?.distanceSchoolVsPrice ?? {
                              byDistance: [],
                              bySchoolRating: [],
                            }
                          }
                        />
                      </div>
                    )}
                  </ChartCard>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Chart card wrapper with title and consistent styling.
 */
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Error state with retry button.
 * Displayed when the Market Backend returns an error or fails to respond within 5s.
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <svg
        className="h-12 w-12 text-destructive mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Failed to load dashboard data
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {error?.message || "The market service is unavailable. Please try again."}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-[44px]"
        aria-label="Retry loading dashboard data"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Retry
      </button>
    </div>
  );
}

// --- Export helper functions ---

function buildCsv(stats: MarketStatistics): string {
  const lines: string[] = [];

  // Section 1: Square Footage vs Price
  lines.push("# Square Footage vs Price");
  lines.push("square_footage,price");
  for (const point of stats.squareFootageVsPrice) {
    lines.push(`${point.squareFootage},${point.price}`);
  }

  lines.push("");

  // Section 2: Year Built vs Price (by Decade)
  lines.push("# Year Built vs Average Price");
  lines.push("decade,avg_price,count");
  for (const seg of stats.yearBuiltVsPrice) {
    lines.push(`${seg.decade},${seg.avgPrice},${seg.count}`);
  }

  lines.push("");

  // Section 3: Distance to City Center vs Price
  lines.push("# Distance to City Center vs Average Price");
  lines.push("distance,avg_price,count");
  for (const d of stats.distanceSchoolVsPrice.byDistance) {
    lines.push(`${d.value},${d.avgPrice},${d.count}`);
  }

  lines.push("");

  // Section 4: School Rating vs Price
  lines.push("# School Rating vs Average Price");
  lines.push("school_rating,avg_price,count");
  for (const s of stats.distanceSchoolVsPrice.bySchoolRating) {
    lines.push(`${s.value},${s.avgPrice},${s.count}`);
  }

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

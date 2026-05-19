"use client";

import { MarketTable } from "@/components/market/MarketTable";

/**
 * Market Data page - displays paginated property data with sorting,
 * filtering, and export capabilities.
 *
 * Route: /market/data
 */
export default function MarketDataPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Market Data</h1>
        <p className="mt-2 text-muted-foreground">
          Browse, filter, and export property market data. Sort by any column
          and export filtered results as CSV or PDF.
        </p>
      </div>

      <MarketTable />
    </div>
  );
}

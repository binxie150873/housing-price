"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, DollarSign, RefreshCw } from "lucide-react";
import { DataTable, type ColumnConfig, type SortConfig, type PaginationConfig } from "@/components/shared/DataTable";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import type { HistoryItem, PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

interface HistoryFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
}

interface HistoryTableProps {
  className?: string;
}

/**
 * HistoryTable displays a paginated, searchable, filterable table of past estimations.
 * Uses the shared DataTable component for rendering.
 * Navigates to /estimator/result/[id] on row click.
 */
export function HistoryTable({ className }: HistoryTableProps) {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<HistoryItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortConfig>({ field: "created_at", direction: "desc" });
  const [filters, setFilters] = useState<HistoryFilters>({
    search: "",
    dateFrom: "",
    dateTo: "",
    priceMin: "",
    priceMax: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input (500ms, minimum 2 chars)
  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (value.length >= 2 || value.length === 0) {
        setDebouncedSearch(value);
        setPage(1);
      }
    }, 500);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Apply date/price filters immediately
  const handleFilterChange = useCallback((field: keyof HistoryFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  // Fetch history data
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));

      if (debouncedSearch.length >= 2) {
        params.set("search", debouncedSearch);
      }
      if (filters.dateFrom) {
        params.set("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set("date_to", filters.dateTo);
      }
      if (filters.priceMin) {
        params.set("price_min", filters.priceMin);
      }
      if (filters.priceMax) {
        params.set("price_max", filters.priceMax);
      }

      const response = await fetch(`/api/v1/estimator/history?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const result: PaginatedResponse<HistoryItem> = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.dateFrom, filters.dateTo, filters.priceMin, filters.priceMax]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRowClick = useCallback(
    (item: HistoryItem) => {
      router.push(`/estimator/result/${item.id}`);
    },
    [router]
  );

  const handleRetry = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  const columns: ColumnConfig<HistoryItem>[] = [
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      className: "w-[140px]",
      render: (row) => formatDate(row.created_at),
    },
    {
      key: "predicted_price",
      header: "Predicted Price",
      sortable: true,
      className: "w-[140px]",
      render: (row) => formatCurrency(row.predicted_price),
    },
    {
      key: "square_footage",
      header: "Sq. Footage",
      sortable: true,
      className: "w-[120px]",
      render: (row) => row.square_footage.toLocaleString(),
    },
    {
      key: "bedrooms",
      header: "Bedrooms",
      sortable: true,
      className: "w-[100px]",
    },
    {
      key: "bathrooms",
      header: "Bathrooms",
      sortable: true,
      className: "w-[100px]",
    },
    {
      key: "year_built",
      header: "Year Built",
      sortable: true,
      className: "w-[100px]",
    },
    {
      key: "school_rating",
      header: "School Rating",
      sortable: true,
      className: "w-[110px]",
      render: (row) => row.school_rating.toFixed(1),
    },
    {
      key: "feature_importance",
      header: "Top Feature",
      sortable: false,
      className: "w-[150px]",
      render: (row) => {
        if (!row.feature_importance || !Array.isArray(row.feature_importance) || row.feature_importance.length === 0) {
          return "—";
        }
        const sorted = [...row.feature_importance].sort((a, b) => b.importance - a.importance);
        const top = sorted[0];
        const name = top.feature.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `${name} ($${Math.round(top.importance).toLocaleString()})`;
      },
    },
  ];

  const pagination: PaginationConfig = {
    page,
    pageSize: PAGE_SIZE,
    total: data?.total ?? 0,
  };

  // Loading state - skeleton matching table layout
  if (loading && !data) {
    return (
      <div className={cn("space-y-4", className)}>
        <FilterBar
          filters={filters}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
        />
        <SkeletonLoader variant="table-row" count={10} />
      </div>
    );
  }

  // Error state with retry
  if (error && !data) {
    return (
      <div className={cn("space-y-4", className)}>
        <FilterBar
          filters={filters}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
        />
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive font-medium" role="alert">
            {error}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The history service is temporarily unavailable.
          </p>
          <button
            onClick={handleRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  const isEmpty = data && data.items.length === 0;

  return (
    <div className={cn("space-y-4", className)}>
      <FilterBar
        filters={filters}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
      />

      {loading && (
        <div aria-live="polite" className="sr-only">
          Loading history data...
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No results found matching your current search or filter criteria.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or perform a new estimation.
          </p>
        </div>
      ) : (
        <div className={cn(loading && "opacity-60 pointer-events-none")}>
          <DataTable<HistoryItem>
            columns={columns}
            data={data?.items ?? []}
            pagination={pagination}
            sorting={sorting}
            onPageChange={setPage}
            onSort={setSorting}
            getRowKey={(row) => row.id}
            ariaLabel="Estimation history table"
            onRowClick={handleRowClick}
          />
        </div>
      )}

      {error && data && (
        <div className="text-sm text-destructive text-center" role="alert">
          {error}{" "}
          <button
            onClick={handleRetry}
            className="underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// --- Filter Bar Sub-component ---

interface FilterBarProps {
  filters: HistoryFilters;
  onSearchChange: (value: string) => void;
  onFilterChange: (field: keyof HistoryFilters, value: string) => void;
}

function FilterBar({ filters, onSearchChange, onFilterChange }: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search by neighborhood, style, or price... (min 2 chars)"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
          aria-label="Search estimation history"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <label htmlFor="date-from" className="sr-only">
              Start date
            </label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
              aria-label="Filter from date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <label htmlFor="date-to" className="sr-only">
              End date
            </label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
              aria-label="Filter to date"
            />
          </div>
        </div>

        {/* Price range */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <label htmlFor="price-min" className="sr-only">
              Minimum price
            </label>
            <input
              id="price-min"
              type="number"
              placeholder="Min price"
              value={filters.priceMin}
              onChange={(e) => onFilterChange("priceMin", e.target.value)}
              className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
              aria-label="Minimum price filter"
              min={0}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <label htmlFor="price-max" className="sr-only">
              Maximum price
            </label>
            <input
              id="price-max"
              type="number"
              placeholder="Max price"
              value={filters.priceMax}
              onChange={(e) => onFilterChange("priceMax", e.target.value)}
              className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
              aria-label="Maximum price filter"
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Utility functions ---

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

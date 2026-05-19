"use client";

import { useState, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DataTable,
  type ColumnConfig,
  type SortConfig,
  type PaginationConfig,
} from "@/components/shared";
import { SkeletonLoader } from "@/components/shared";
import { usePropertyData } from "@/lib/hooks/use-market";
import type { PropertyData } from "@/lib/types";
import type { PropertyDataParams } from "@/lib/api/market-client";
import { ExportButton } from "./ExportButton";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Market data table with sorting, filtering, pagination, and export buttons.
 * Uses the shared DataTable component for rendering.
 */
export function MarketTable() {
  // Filter state
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const [bedroomsMax, setBedroomsMax] = useState("");
  const [bathroomsMin, setBathroomsMin] = useState("");
  const [bathroomsMax, setBathroomsMax] = useState("");
  const [yearBuiltMin, setYearBuiltMin] = useState("");
  const [yearBuiltMax, setYearBuiltMax] = useState("");
  const [squareFootageMin, setSquareFootageMin] = useState("");
  const [squareFootageMax, setSquareFootageMax] = useState("");

  // Pagination and sorting state
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortConfig>({
    field: "price",
    direction: "desc",
  });

  // Build query params
  const queryParams: PropertyDataParams = useMemo(
    () => ({
      page,
      page_size: DEFAULT_PAGE_SIZE,
      price_min: priceMin ? Number(priceMin) : undefined,
      price_max: priceMax ? Number(priceMax) : undefined,
      bedrooms_min: bedroomsMin ? Number(bedroomsMin) : undefined,
      bedrooms_max: bedroomsMax ? Number(bedroomsMax) : undefined,
      bathrooms_min: bathroomsMin ? Number(bathroomsMin) : undefined,
      bathrooms_max: bathroomsMax ? Number(bathroomsMax) : undefined,
      year_built_min: yearBuiltMin ? Number(yearBuiltMin) : undefined,
      year_built_max: yearBuiltMax ? Number(yearBuiltMax) : undefined,
      square_footage_min: squareFootageMin ? Number(squareFootageMin) : undefined,
      square_footage_max: squareFootageMax ? Number(squareFootageMax) : undefined,
      sort_by: sorting.field,
      sort_order: sorting.direction,
    }),
    [page, priceMin, priceMax, bedroomsMin, bedroomsMax, bathroomsMin, bathroomsMax, yearBuiltMin, yearBuiltMax, squareFootageMin, squareFootageMax, sorting]
  );

  const { data, isLoading, isError, error } = usePropertyData(queryParams);

  // Build filters for export
  const exportFilters = useMemo(
    () => ({
      price_min: priceMin ? Number(priceMin) : undefined,
      price_max: priceMax ? Number(priceMax) : undefined,
      bedrooms_min: bedroomsMin ? Number(bedroomsMin) : undefined,
      bedrooms_max: bedroomsMax ? Number(bedroomsMax) : undefined,
      bathrooms_min: bathroomsMin ? Number(bathroomsMin) : undefined,
      bathrooms_max: bathroomsMax ? Number(bathroomsMax) : undefined,
      year_built_min: yearBuiltMin ? Number(yearBuiltMin) : undefined,
      year_built_max: yearBuiltMax ? Number(yearBuiltMax) : undefined,
      square_footage_min: squareFootageMin ? Number(squareFootageMin) : undefined,
      square_footage_max: squareFootageMax ? Number(squareFootageMax) : undefined,
    }),
    [priceMin, priceMax, bedroomsMin, bedroomsMax, bathroomsMin, bathroomsMax, yearBuiltMin, yearBuiltMax, squareFootageMin, squareFootageMax]
  );

  // Column configuration
  const columns: ColumnConfig<PropertyData>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        sortable: true,
        className: "min-w-[60px]",
      },
      {
        key: "square_footage",
        header: "Sq Ft",
        sortable: true,
        className: "min-w-[90px]",
        render: (row) =>
          row.square_footage != null
            ? row.square_footage.toLocaleString()
            : "—",
      },
      {
        key: "bedrooms",
        header: "Beds",
        sortable: true,
        className: "min-w-[60px]",
      },
      {
        key: "bathrooms",
        header: "Baths",
        sortable: true,
        className: "min-w-[60px]",
      },
      {
        key: "year_built",
        header: "Year Built",
        sortable: true,
        className: "min-w-[100px]",
      },
      {
        key: "lot_size",
        header: "Lot Size",
        sortable: true,
        className: "min-w-[90px]",
        render: (row) =>
          row.lot_size != null ? row.lot_size.toLocaleString() : "—",
      },
      {
        key: "school_rating",
        header: "School Rating",
        sortable: true,
        className: "min-w-[100px]",
      },
      {
        key: "price",
        header: "Price",
        sortable: true,
        className: "min-w-[110px]",
        render: (row) =>
          row.price != null
            ? `$${row.price.toLocaleString()}`
            : "—",
      },
    ],
    []
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSort = useCallback((sort: SortConfig) => {
    setSorting(sort);
    setPage(1); // Reset to first page on sort change
  }, []);

  const handleClearFilters = useCallback(() => {
    setPriceMin("");
    setPriceMax("");
    setBedroomsMin("");
    setBedroomsMax("");
    setBathroomsMin("");
    setBathroomsMax("");
    setYearBuiltMin("");
    setYearBuiltMax("");
    setSquareFootageMin("");
    setSquareFootageMax("");
    setPage(1);
  }, []);

  const hasActiveFilters =
    priceMin || priceMax || bedroomsMin || bedroomsMax || bathroomsMin || bathroomsMax || yearBuiltMin || yearBuiltMax || squareFootageMin || squareFootageMax;

  const pagination: PaginationConfig = {
    page: data?.page ?? page,
    pageSize: data?.page_size ?? DEFAULT_PAGE_SIZE,
    total: data?.total ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label="Clear all filters"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FilterInput
            label="Min Price"
            value={priceMin}
            onChange={(v) => {
              setPriceMin(v);
              setPage(1);
            }}
            placeholder="0"
            type="number"
          />
          <FilterInput
            label="Max Price"
            value={priceMax}
            onChange={(v) => {
              setPriceMax(v);
              setPage(1);
            }}
            placeholder="500000"
            type="number"
          />
          <FilterInput
            label="Bedrooms (min)"
            value={bedroomsMin}
            onChange={(v) => {
              setBedroomsMin(v);
              setPage(1);
            }}
            placeholder="1"
            type="number"
          />
          <FilterInput
            label="Bedrooms (max)"
            value={bedroomsMax}
            onChange={(v) => {
              setBedroomsMax(v);
              setPage(1);
            }}
            placeholder="5"
            type="number"
          />
          <FilterInput
            label="Bathrooms (min)"
            value={bathroomsMin}
            onChange={(v) => {
              setBathroomsMin(v);
              setPage(1);
            }}
            placeholder="1"
            type="number"
          />
          <FilterInput
            label="Bathrooms (max)"
            value={bathroomsMax}
            onChange={(v) => {
              setBathroomsMax(v);
              setPage(1);
            }}
            placeholder="4"
            type="number"
          />
          <FilterInput
            label="Year Built (min)"
            value={yearBuiltMin}
            onChange={(v) => {
              setYearBuiltMin(v);
              setPage(1);
            }}
            placeholder="1900"
            type="number"
          />
          <FilterInput
            label="Year Built (max)"
            value={yearBuiltMax}
            onChange={(v) => {
              setYearBuiltMax(v);
              setPage(1);
            }}
            placeholder="2024"
            type="number"
          />
          <FilterInput
            label="Sq Ft (min)"
            value={squareFootageMin}
            onChange={(v) => {
              setSquareFootageMin(v);
              setPage(1);
            }}
            placeholder="500"
            type="number"
          />
          <FilterInput
            label="Sq Ft (max)"
            value={squareFootageMax}
            onChange={(v) => {
              setSquareFootageMax(v);
              setPage(1);
            }}
            placeholder="5000"
            type="number"
          />
        </div>
      </div>

      {/* Export buttons and record count */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data ? (
            <>
              {data.total.toLocaleString()} record{data.total !== 1 ? "s" : ""}{" "}
              found
            </>
          ) : isLoading ? (
            "Loading..."
          ) : (
            "—"
          )}
        </p>

        <div className="flex items-center gap-2">
          <ExportButton
            format="csv"
            filters={exportFilters}
            totalRecords={data?.total ?? 0}
            disabled={isLoading || isError}
          />
          <ExportButton
            format="pdf"
            filters={exportFilters}
            totalRecords={data?.total ?? 0}
            disabled={isLoading || isError}
          />
        </div>
      </div>

      {/* Table or loading/error state */}
      {isLoading ? (
        <SkeletonLoader variant="table-row" count={10} />
      ) : isError ? (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center"
          role="alert"
        >
          <p className="text-sm text-destructive">
            Failed to load market data: {error?.message ?? "Unknown error"}
          </p>
        </div>
      ) : (
        <DataTable<PropertyData>
          columns={columns}
          data={data?.items ?? []}
          pagination={pagination}
          sorting={sorting}
          onPageChange={handlePageChange}
          onSort={handleSort}
          getRowKey={(row) => row.id}
          ariaLabel="Property market data table"
        />
      )}
    </div>
  );
}

// --- Filter Input sub-component ---

interface FilterInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: FilterInputProps) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "min-h-[44px]"
        )}
      />
    </div>
  );
}

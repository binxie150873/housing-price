"use client";

import { useCallback } from "react";
import { StatisticsFilters } from "@/lib/api/market-client";

const CURRENT_YEAR = new Date().getFullYear();

interface FilterPanelProps {
  filters: StatisticsFilters;
  onFiltersChange: (filters: StatisticsFilters) => void;
}

/**
 * FilterPanel provides range filters for the market dashboard:
 * square_footage, bedrooms, bathrooms, year_built, lot_size,
 * distance_to_city_center, school_rating.
 */
export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const update = useCallback(
    (field: keyof StatisticsFilters, value: string) => {
      const num = value === "" ? undefined : Number(value);
      onFiltersChange({ ...filters, [field]: num });
    },
    [filters, onFiltersChange]
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters = Object.values(filters).some((v) => v != null);

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-4"
      role="region"
      aria-label="Dashboard filters"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Square Footage Range */}
      <RangeFilter
        label="Square Footage"
        minValue={filters.square_footage_min}
        maxValue={filters.square_footage_max}
        onMinChange={(v) => update("square_footage_min", v)}
        onMaxChange={(v) => update("square_footage_max", v)}
        minPlaceholder="500"
        maxPlaceholder="5000"
        min={0}
      />

      {/* Bedrooms Range */}
      <RangeFilter
        label="Bedrooms"
        minValue={filters.bedrooms_min}
        maxValue={filters.bedrooms_max}
        onMinChange={(v) => update("bedrooms_min", v)}
        onMaxChange={(v) => update("bedrooms_max", v)}
        minPlaceholder="1"
        maxPlaceholder="5"
        min={0}
        max={10}
      />

      {/* Bathrooms Range */}
      <RangeFilter
        label="Bathrooms"
        minValue={filters.bathrooms_min}
        maxValue={filters.bathrooms_max}
        onMinChange={(v) => update("bathrooms_min", v)}
        onMaxChange={(v) => update("bathrooms_max", v)}
        minPlaceholder="1"
        maxPlaceholder="4"
        min={0}
        max={10}
        step="0.5"
      />

      {/* Year Built Range */}
      <RangeFilter
        label="Year Built"
        minValue={filters.year_min}
        maxValue={filters.year_max}
        onMinChange={(v) => update("year_min", v)}
        onMaxChange={(v) => update("year_max", v)}
        minPlaceholder="1970"
        maxPlaceholder={String(CURRENT_YEAR)}
        min={1800}
        max={CURRENT_YEAR}
      />

      {/* Lot Size Range */}
      <RangeFilter
        label="Lot Size (sq ft)"
        minValue={filters.lot_size_min}
        maxValue={filters.lot_size_max}
        onMinChange={(v) => update("lot_size_min", v)}
        onMaxChange={(v) => update("lot_size_max", v)}
        minPlaceholder="3000"
        maxPlaceholder="15000"
        min={0}
      />

      {/* Distance to City Center (max only) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Max Distance to City (mi)
        </label>
        <input
          type="number"
          min={0}
          step="0.5"
          placeholder="e.g. 8"
          value={filters.distance_max ?? ""}
          onChange={(e) => update("distance_max", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
          aria-label="Maximum distance to city center"
        />
      </div>

      {/* School Rating (min only) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Min School Rating
        </label>
        <input
          type="number"
          min={0}
          max={10}
          step="0.1"
          placeholder="e.g. 7"
          value={filters.school_rating_min ?? ""}
          onChange={(e) => update("school_rating_min", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
          aria-label="Minimum school rating"
        />
      </div>
    </div>
  );
}

/** Reusable range filter with min/max inputs */
function RangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  min,
  max,
  step,
}: {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={minPlaceholder}
          value={minValue ?? ""}
          onChange={(e) => onMinChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
          aria-label={`Minimum ${label.toLowerCase()}`}
        />
        <span className="text-muted-foreground text-sm">–</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={maxPlaceholder}
          value={maxValue ?? ""}
          onChange={(e) => onMaxChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
          aria-label={`Maximum ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
}

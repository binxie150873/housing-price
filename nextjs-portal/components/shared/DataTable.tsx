"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnConfig<T> {
  /** Unique key for the column, typically a key of T */
  key: string;
  /** Display header label */
  header: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom cell renderer */
  render?: (row: T) => React.ReactNode;
  /** Column width class */
  className?: string;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

interface DataTableProps<T> {
  /** Column configuration */
  columns: ColumnConfig<T>[];
  /** Row data */
  data: T[];
  /** Pagination state */
  pagination: PaginationConfig;
  /** Current sort state */
  sorting?: SortConfig;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when sort changes */
  onSort?: (sort: SortConfig) => void;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Unique key extractor for rows */
  getRowKey: (row: T) => string | number;
  /** Additional table class */
  className?: string;
  /** Accessible label for the table */
  ariaLabel?: string;
}

/**
 * Reusable data table with pagination, sorting, and column configuration.
 * Uses TypeScript generics for type-safe row data.
 */
export function DataTable<T>({
  columns,
  data,
  pagination,
  sorting,
  onPageChange,
  onSort,
  onRowClick,
  getRowKey,
  className,
  ariaLabel = "Data table",
}: DataTableProps<T>) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const startRecord = (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total
  );

  function handleSort(field: string) {
    if (!onSort) return;
    if (sorting?.field === field) {
      onSort({
        field,
        direction: sorting.direction === "asc" ? "desc" : "asc",
      });
    } else {
      onSort({ field, direction: "asc" });
    }
  }

  function getSortIcon(columnKey: string) {
    if (sorting?.field !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
    return sorting.direction === "asc" ? (
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-4 w-4" aria-hidden="true" />
    );
  }

  function getSortAriaLabel(column: ColumnConfig<T>) {
    if (!column.sortable) return undefined;
    if (sorting?.field !== column.key) {
      return `Sort by ${column.header}`;
    }
    return `Sort by ${column.header}, currently ${sorting.direction === "asc" ? "ascending" : "descending"}`;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-x-auto rounded-md border border-border">
        <table
          className="w-full text-sm"
          aria-label={ariaLabel}
          role="table"
        >
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    column.sortable && "cursor-pointer select-none",
                    column.className
                  )}
                  onClick={
                    column.sortable ? () => handleSort(column.key) : undefined
                  }
                  onKeyDown={
                    column.sortable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSort(column.key);
                          }
                        }
                      : undefined
                  }
                  tabIndex={column.sortable ? 0 : undefined}
                  aria-sort={
                    sorting?.field === column.key
                      ? sorting.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable
                        ? "none"
                        : undefined
                  }
                  aria-label={getSortAriaLabel(column)}
                  role="columnheader"
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable && getSortIcon(column.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  aria-label={onRowClick ? "View details" : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3", column.className)}
                    >
                      {column.render
                        ? column.render(row)
                        : String(
                            (row as Record<string, unknown>)[column.key] ?? ""
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {startRecord} to {endRecord} of {pagination.total} results
          </p>

          <nav aria-label="Table pagination" className="flex items-center gap-1">
            <PaginationButton
              onClick={() => onPageChange(1)}
              disabled={pagination.page <= 1}
              ariaLabel="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </PaginationButton>

            <PaginationButton
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              ariaLabel="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </PaginationButton>

            <span className="px-3 text-sm text-foreground" aria-current="page">
              Page {pagination.page} of {totalPages}
            </span>

            <PaginationButton
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              ariaLabel="Go to next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </PaginationButton>

            <PaginationButton
              onClick={() => onPageChange(totalPages)}
              disabled={pagination.page >= totalPages}
              ariaLabel="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </PaginationButton>
          </nav>
        </div>
      )}
    </div>
  );
}

interface PaginationButtonProps {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

function PaginationButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: PaginationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input text-sm",
        "h-8 w-8 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      {children}
    </button>
  );
}

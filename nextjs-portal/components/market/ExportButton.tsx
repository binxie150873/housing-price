"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTriggerExport, useExportStatus } from "@/lib/hooks/use-market";
import { useToastStore } from "@/lib/toast-store";
import type { ExportRequest } from "@/lib/api/market-client";

interface ExportButtonProps {
  /** Export format */
  format: "csv" | "pdf";
  /** Current filters to apply to the export */
  filters?: ExportRequest["filters"];
  /** Whether the dataset has zero records (disables export) */
  disabled?: boolean;
  /** Total record count for truncation warning */
  totalRecords?: number;
  /** Additional class names */
  className?: string;
}

const MAX_EXPORT_ROWS = 50_000;

/**
 * Export button that triggers CSV or PDF export via the Market Backend.
 * - Displays progress indicator during export generation
 * - Disables button to prevent duplicate requests
 * - Handles errors by re-enabling button and showing error message
 * - Shows message for zero-record state
 * - Shows truncation warning when > 50,000 rows
 */
export function ExportButton({
  format,
  filters,
  disabled = false,
  totalRecords = 0,
  className,
}: ExportButtonProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const triggerExportMutation = useTriggerExport({
    onSuccess: (data) => {
      setActiveJobId(data.job_id);
    },
    onError: (error) => {
      setIsExporting(false);
      addToast({
        type: "error",
        message: `Export failed: ${error.message}`,
        recoveryAction: "Try again",
        onRecover: () => handleExport(),
      });
    },
  });

  const { data: exportStatus } = useExportStatus(activeJobId ?? "", {
    enabled: !!activeJobId,
  });

  // Handle export status changes
  useEffect(() => {
    if (!exportStatus || !activeJobId) return;

    if (exportStatus.status === "completed") {
      setIsExporting(false);
      setActiveJobId(null);

      // Trigger download
      if (exportStatus.download_url) {
        window.open(exportStatus.download_url, "_blank");
      }

      // Show truncation warning if applicable
      if (exportStatus.truncated) {
        addToast({
          type: "success",
          message: `Export completed. Data was truncated to ${MAX_EXPORT_ROWS.toLocaleString()} rows.`,
        });
      } else {
        addToast({
          type: "success",
          message: `${format.toUpperCase()} export completed successfully.`,
        });
      }
    }

    if (exportStatus.status === "failed") {
      setIsExporting(false);
      setActiveJobId(null);
      addToast({
        type: "error",
        message: exportStatus.error_message ?? "Export generation failed.",
        recoveryAction: "Try again",
        onRecover: () => handleExport(),
      });
    }
  }, [exportStatus, activeJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = useCallback(() => {
    // Zero-record check
    if (totalRecords === 0) {
      addToast({
        type: "error",
        message: "No data available for export. Adjust your filters.",
      });
      return;
    }

    setIsExporting(true);
    triggerExportMutation.mutate({
      format,
      filters,
    });
  }, [format, filters, totalRecords, addToast, triggerExportMutation]);

  const isDisabled = disabled || isExporting || totalRecords === 0;

  const Icon = format === "csv" ? Download : FileText;
  const label = format === "csv" ? "Export CSV" : "Export PDF";

  return (
    <div className="relative inline-flex flex-col items-start">
      <button
        onClick={handleExport}
        disabled={isDisabled}
        aria-label={
          isExporting
            ? `Generating ${format.toUpperCase()} export...`
            : label
        }
        aria-busy={isExporting}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "min-h-[44px] min-w-[44px]",
          className
        )}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isExporting ? "Exporting..." : label}</span>
      </button>

      {/* Truncation warning */}
      {totalRecords > MAX_EXPORT_ROWS && !isExporting && (
        <p
          className="mt-1 text-xs text-amber-600"
          role="status"
          aria-live="polite"
        >
          Dataset exceeds {MAX_EXPORT_ROWS.toLocaleString()} rows. Export will
          be truncated.
        </p>
      )}
    </div>
  );
}

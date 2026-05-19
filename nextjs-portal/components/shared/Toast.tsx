"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastItem } from "@/lib/toast-store";

/**
 * Toast notification system.
 * - Success: auto-dismiss after 5 seconds
 * - Error: persistent until dismissed, max 120 chars, includes recovery action
 * - Uses ARIA live region with role="alert" (assertive for errors)
 */
export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="assertive"
      aria-atomic="false"
      aria-relevant="additions removals"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastNotification key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastNotificationProps {
  toast: ToastItem;
}

function ToastNotification({ toast }: ToastNotificationProps) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    if (toast.type === "success") {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.type, removeToast]);

  const isError = toast.type === "error";

  return (
    <div
      role="alert"
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all",
        isError
          ? "border-destructive/50 bg-destructive/10 text-destructive-foreground"
          : "border-border bg-background text-foreground"
      )}
    >
      {isError ? (
        <AlertCircle
          className="h-5 w-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
      ) : (
        <CheckCircle
          className="h-5 w-5 shrink-0 text-green-600"
          aria-hidden="true"
        />
      )}

      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{toast.message}</p>
        {isError && toast.recoveryAction && (
          <button
            onClick={() => {
              toast.onRecover?.();
              removeToast(toast.id);
            }}
            className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            {toast.recoveryAction}
          </button>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-sm p-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 inline-flex items-center justify-center"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

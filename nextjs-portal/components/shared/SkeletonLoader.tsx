import { cn } from "@/lib/utils";

export type SkeletonVariant = "card" | "table-row" | "chart" | "text" | "custom";

interface SkeletonLoaderProps {
  /** Shape variant matching target component dimensions */
  variant?: SkeletonVariant;
  /** Number of skeleton items to render */
  count?: number;
  /** Custom width (CSS value) */
  width?: string;
  /** Custom height (CSS value) */
  height?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton placeholder matching target component dimensions.
 * Uses animate-pulse for loading indication.
 * Implements ARIA live region with polite politeness for loading states.
 */
export function SkeletonLoader({
  variant = "text",
  count = 1,
  width,
  height,
  className,
}: SkeletonLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem
          key={i}
          variant={variant}
          width={width}
          height={height}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface SkeletonItemProps {
  variant: SkeletonVariant;
  width?: string;
  height?: string;
}

function SkeletonItem({ variant, width, height }: SkeletonItemProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  switch (variant) {
    case "card":
      return (
        <div
          className="animate-pulse rounded-lg border border-border bg-muted/50 p-4 space-y-3"
          style={style}
        >
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-20 w-full rounded bg-muted" />
        </div>
      );

    case "table-row":
      return (
        <div
          className="animate-pulse flex items-center gap-4 border-b border-border py-3 px-2"
          style={style}
        >
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      );

    case "chart":
      return (
        <div
          className="animate-pulse rounded-lg border border-border bg-muted/50 p-4"
          style={{ height: height || "200px", ...style }}
        >
          <div className="h-4 w-1/3 rounded bg-muted mb-4" />
          <div className="flex items-end gap-2 h-[calc(100%-2rem)]">
            <div className="h-3/4 w-8 rounded bg-muted" />
            <div className="h-1/2 w-8 rounded bg-muted" />
            <div className="h-full w-8 rounded bg-muted" />
            <div className="h-2/3 w-8 rounded bg-muted" />
            <div className="h-1/3 w-8 rounded bg-muted" />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="animate-pulse space-y-2" style={style}>
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>
      );

    case "custom":
      return (
        <div
          className="animate-pulse rounded bg-muted"
          style={{ width: width || "100%", height: height || "40px", ...style }}
        />
      );

    default:
      return (
        <div
          className="animate-pulse h-4 w-full rounded bg-muted"
          style={style}
        />
      );
  }
}

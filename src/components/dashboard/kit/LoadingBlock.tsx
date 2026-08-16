/**
 * Change skeleton shape here (rows, cards, or kanban columns).
 * Use while Convex data is still loading.
 */
import { Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";

export interface LoadingBlockProps {
  rows?: number;
  className?: string;
  /** Also show a fake page title skeleton */
  withHeader?: boolean;
  label?: string;
}

export function LoadingBlock({
  rows = 3,
  className,
  withHeader = false,
  label = "Loading",
}: LoadingBlockProps) {
  return (
    <div className={className} aria-busy="true" aria-label={label}>
      {withHeader && (
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function MetricCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
      aria-busy="true"
      aria-label="Loading metrics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading board">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[280px] min-w-[280px] space-y-3">
            <Skeleton className="h-5 w-24 rounded" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-[72px] rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

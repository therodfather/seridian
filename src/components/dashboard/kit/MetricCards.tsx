/**
 * Change KPI labels, values, or colors here.
 * Pass an array of cards — the grid layout stays the same.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { MetricCardsSkeleton } from "./LoadingBlock";

export interface MetricCardItem {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** Tailwind text color for the value, e.g. "text-emerald-400" */
  valueClassName?: string;
}

export interface MetricCardsProps {
  items: MetricCardItem[];
  loading?: boolean;
  className?: string;
}

export function MetricCards({ items, loading, className }: MetricCardsProps) {
  if (loading) {
    return <MetricCardsSkeleton count={items.length || 4} className={className} />;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="space-y-1 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4"
        >
          <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {item.label}
            {item.icon}
          </span>
          <p
            className={cn(
              "text-2xl font-extrabold tabular-nums text-white",
              item.valueClassName,
            )}
          >
            {item.value}
          </p>
          {item.hint && (
            <p className="text-[11px] text-slate-500">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

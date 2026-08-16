/**
 * Change the empty-message title, help text, or button here.
 * Shown when a list has nothing to show yet.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "○",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] py-16 text-center",
        className,
      )}
    >
      {typeof icon === "string" ? (
        <span className="mb-3 text-3xl text-slate-600" aria-hidden="true">
          {icon}
        </span>
      ) : (
        <div className="mb-3 text-slate-500" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-600">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

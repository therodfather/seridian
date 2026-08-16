/**
 * Change the section headline or help text here.
 * One section = one job on the page.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface PageSectionProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  action,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {(title || action) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-white">{title}</h2>
            )}
            {description && (
              <div className="mt-0.5 text-xs text-slate-500">{description}</div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

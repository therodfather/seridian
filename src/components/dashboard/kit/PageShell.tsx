/**
 * Change the page title, help text, or top-right button here.
 * Wrap every dashboard page in PageShell so spacing stays the same.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface PageShellProps {
  /** Big heading at the top of the page */
  title: string;
  /** One short sentence under the title */
  description?: ReactNode;
  /** Optional icon or badge next to the title */
  badge?: ReactNode;
  /** Optional left icon (e.g. PhoneCall) */
  icon?: ReactNode;
  /** Primary button(s) on the right */
  action?: ReactNode;
  /** Extra content under the title row (search bars, tabs, etc.) */
  toolbar?: ReactNode;
  /** Main page body (optional if you only need the header row) */
  children?: ReactNode;
  className?: string;
  /** Drop the bottom border under the header */
  bare?: boolean;
}

export function PageShell({
  title,
  description,
  badge,
  icon,
  action,
  toolbar,
  children,
  className,
  bare = false,
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <header
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          !bare && "border-b border-white/[0.08] pb-4",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/30">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
              {badge}
            </div>
            {description && (
              <div className="mt-0.5 text-xs text-slate-400">{description}</div>
            )}
          </div>
        </div>
        {action && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
            {action}
          </div>
        )}
      </header>
      {toolbar}
      {children}
    </div>
  );
}

/**
 * Put search + filter controls as children.
 * They wrap nicely on phones automatically.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface ToolbarProps {
  children: ReactNode;
  /** Extra buttons on the right (view toggles, etc.) */
  end?: ReactNode;
  className?: string;
}

export function Toolbar({ children, end, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {children}
      </div>
      {end && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2 md:border-t-0 md:pt-0">
          {end}
        </div>
      )}
    </div>
  );
}

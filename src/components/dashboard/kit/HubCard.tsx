/**
 * Link card for hub pages (Business, Knowledge).
 * One purpose: jump to a nested area without putting it in the sidebar.
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface HubCardProps {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}

export function HubCard({
  href,
  title,
  description,
  icon,
  className,
}: HubCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 transition-all",
        "hover:border-cyan-500/30 hover:bg-[#0e162a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seridian-500",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400"
          aria-hidden="true"
        />
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </Link>
  );
}

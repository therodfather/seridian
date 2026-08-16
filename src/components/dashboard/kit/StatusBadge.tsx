/**
 * Change badge colors or labels here.
 * Small status pill for draft / live / active / etc.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const TONES = {
  neutral: "border-white/10 bg-white/[0.04] text-slate-400",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
} as const;

export type StatusBadgeTone = keyof typeof TONES;

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

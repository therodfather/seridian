/**
 * Change step labels here (or pass them as props).
 * Shows “1 → 2 → 3” for create / setup / publish journeys.
 * For form wizards, prefer MultiStepForm which already uses this.
 */
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface FlowStepItem {
  id: string;
  label: string;
  description?: string;
}

export interface FlowStepsProps {
  steps: FlowStepItem[];
  /** Zero-based current step */
  current: number;
  /** Allow clicking earlier steps to jump back */
  onStepChange?: (index: number) => void;
  className?: string;
}

export function FlowSteps({
  steps,
  current,
  onStepChange,
  className,
}: FlowStepsProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn("flex flex-wrap items-center gap-1 sm:gap-2", className)}
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = Boolean(onStepChange) && i <= current;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!clickable}
            onClick={() => onStepChange?.(i)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              active && "bg-cyan-500/15 text-cyan-400",
              done && !active && "text-emerald-400",
              !done && !active && "text-slate-500",
              clickable && "hover:text-slate-200",
              !clickable && "cursor-default",
            )}
          >
            {done ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
            )}
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        );
      })}
    </nav>
  );
}

export interface PageFlowProps {
  steps: FlowStepItem[];
  current: number;
  onStepChange?: (index: number) => void;
  /** Optional next / back / cancel row */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Full guided flow: step list + body + optional footer buttons */
export function PageFlow({
  steps,
  current,
  onStepChange,
  footer,
  children,
  className,
}: PageFlowProps) {
  const step = steps[current];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <FlowSteps steps={steps} current={current} onStepChange={onStepChange} />
      {step?.description && (
        <p className="text-xs text-slate-500">{step.description}</p>
      )}
      <div className="min-h-[200px]">{children}</div>
      {footer && (
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}

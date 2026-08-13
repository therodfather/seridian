"use client";

import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Progress } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";

type Deal = Doc<"deals">;

const stageConfig: Record<Deal["stage"], { color: string; label: string }> = {
  lead: {
    color: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    label: "Lead",
  },
  proposal: {
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    label: "Proposal",
  },
  negotiation: {
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    label: "Negotiation",
  },
  closed_won: {
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    label: "Won",
  },
  closed_lost: {
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    label: "Lost",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface DealCardProps {
  deal: Deal;
  clientName?: string;
  onClick?: (dealId: Id<"deals">) => void;
}

export function DealCard({ deal, clientName, onClick }: DealCardProps) {
  const stage = stageConfig[deal.stage];

  return (
    <button
      type="button"
      onClick={() => onClick?.(deal._id)}
      className={cn(
        "group w-full text-left rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-3",
        "transition-all duration-150",
        "hover:border-cyan-500/30 hover:bg-[#0e162a]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-200 leading-snug line-clamp-2 group-hover:text-white">
          {deal.name}
        </h4>
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-[10px] px-1.5 py-0",
            stage.color
          )}
        >
          {stage.label}
        </Badge>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-sm font-semibold text-white tabular-nums">
          {formatCurrency(deal.value)}
        </span>
        {clientName && (
          <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[11px] font-medium text-cyan-400">
            {clientName}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Probability</span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {deal.probability}%
          </span>
        </div>
        <Progress
          value={deal.probability}
          className="h-1.5 bg-white/5"
        />
      </div>

      {deal.expectedCloseDate && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <span aria-hidden="true">◷</span>
          <span>
            Close:{" "}
            {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}
    </button>
  );
}

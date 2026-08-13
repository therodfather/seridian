"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { DealCard } from "./DealCard";
import { Button, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";

type Deal = Doc<"deals">;
type Stage = Deal["stage"];

const columns: { key: Stage; label: string; headerColor: string }[] = [
  {
    key: "lead",
    label: "Lead",
    headerColor: "border-t-slate-500/40",
  },
  {
    key: "proposal",
    label: "Proposal",
    headerColor: "border-t-blue-500/60",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    headerColor: "border-t-yellow-500/60",
  },
  {
    key: "closed_won",
    label: "Closed Won",
    headerColor: "border-t-green-500/60",
  },
  {
    key: "closed_lost",
    label: "Closed Lost",
    headerColor: "border-t-red-500/60",
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface PipelineBoardProps {
  onDealClick?: (dealId: Id<"deals">) => void;
  onAddDeal?: () => void;
  deals?: Deal[];
  clientMap?: Map<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function PipelineBoard({
  onDealClick,
  onAddDeal,
  deals: dealsProp,
  clientMap: clientMapProp,
  emptyTitle = "No deals in the pipeline",
  emptyDescription = "Create a deal to start tracking opportunities by stage.",
}: PipelineBoardProps) {
  const queriedDeals = useQuery(api.deals.list, dealsProp === undefined ? {} : "skip");
  const queriedClients = useQuery(api.clients.list, clientMapProp === undefined ? {} : "skip");

  const deals = dealsProp ?? queriedDeals;
  const clientMap = useMemo(
    () =>
      clientMapProp ??
      new Map<string, string>((queriedClients ?? []).map((c) => [c._id, c.name])),
    [clientMapProp, queriedClients],
  );

  const dealsByStage = (stage: Stage): Deal[] => {
    if (!deals) return [];
    return deals.filter((d) => d.stage === stage);
  };

  if (deals !== undefined && deals.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          onAddDeal ? (
            <Button type="button" size="sm" onClick={onAddDeal}>
              + Add Deal
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex min-h-[20rem] h-[calc(100vh-28rem)] gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {columns.map((column) => {
        const columnDeals = dealsByStage(column.key);

        return (
          <div
            key={column.key}
            className="flex w-[260px] min-w-[260px] sm:w-[280px] sm:min-w-[280px] flex-col"
          >
            <div
              className={cn(
                "flex items-center justify-between border-t-2 bg-transparent px-1 pb-3 pt-3",
                column.headerColor,
              )}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-slate-400">{column.label}</h2>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/5 px-1.5 text-[11px] font-medium text-slate-500 tabular-nums">
                  {deals ? columnDeals.length : "—"}
                </span>
              </div>
              {deals && columnDeals.length > 0 && (
                <span className="text-[11px] text-slate-600 tabular-nums">
                  {formatCurrency(columnDeals.reduce((s, d) => s + d.value, 0))}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-lg pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5">
              {deals === undefined ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[88px] rounded-lg" />
                  ))}
                </div>
              ) : columnDeals.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-xs text-slate-600">
                  No deals
                </div>
              ) : (
                columnDeals.map((deal) => (
                  <DealCard
                    key={deal._id}
                    deal={deal}
                    clientName={
                      deal.clientId
                        ? clientMap.get(deal.clientId) ?? undefined
                        : undefined
                    }
                    onClick={onDealClick}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

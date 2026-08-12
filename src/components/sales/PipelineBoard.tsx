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
}

export function PipelineBoard({ onDealClick, onAddDeal }: PipelineBoardProps) {
  const deals = useQuery(api.deals.list, {});
  const clients = useQuery(api.clients.list, {});

  const clientMap = useMemo(
    () => new Map<string, string>((clients ?? []).map((c) => [c._id, c.name])),
    [clients]
  );

  const dealsByStage = (stage: Stage): Deal[] => {
    if (!deals) return [];
    return deals.filter((d) => d.stage === stage);
  };

  const totalPipeline = useMemo(() => {
    if (!deals) return 0;
    return deals
      .filter((d) => d.stage !== "closed_lost")
      .reduce((sum, d) => sum + d.value, 0);
  }, [deals]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Sales Pipeline</h2>
          <p className="text-sm text-slate-500">
            {deals === undefined
              ? "Loading..."
              : `${deals.length} deal${deals.length !== 1 ? "s" : ""} \u00B7 ${formatCurrency(totalPipeline)} total`}
          </p>
        </div>
        {onAddDeal && (
          <Button type="button" size="sm" onClick={onAddDeal} className="self-start">
            + Add Deal
          </Button>
        )}
      </div>

      {deals !== undefined && deals.length === 0 ? (
        <EmptyState
          title="No deals in the pipeline"
          description="Create a deal to start tracking opportunities by stage."
          action={
            onAddDeal ? (
              <Button type="button" size="sm" onClick={onAddDeal}>
                + Add Deal
              </Button>
            ) : undefined
          }
        />
      ) : (
      <div className="flex h-[calc(100vh-14rem)] sm:h-[calc(100vh-12rem)] gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
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
                  column.headerColor
                )}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-slate-400">
                    {column.label}
                  </h3>
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
      )}
    </div>
  );
}
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Progress } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

type Deal = Doc<"deals">;

const stageConfig: Record<
  Deal["stage"],
  { color: string; label: string }
> = {
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
    color: "bg-green-500/15 text-green-400 border-green-500/20",
    label: "Won",
  },
  closed_lost: {
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    label: "Lost",
  },
};

const stages: Deal["stage"][] = [
  "lead",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface DealDetailProps {
  dealId: Id<"deals">;
  onBack: () => void;
  onEdit?: (dealId: Id<"deals">) => void;
}

export function DealDetail({ dealId, onBack, onEdit }: DealDetailProps) {
  const deal = useQuery(api.deals.get, { dealId });
  const client = useQuery(
    api.clients.get,
    deal?.clientId ? { clientId: deal.clientId } : "skip",
  );
  const updateDeal = useMutation(api.deals.update);
  const removeDeal = useMutation(api.deals.remove);

  if (deal === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
      </div>
    );
  }

  if (deal === null) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-8 text-center">
          <p className="text-sm text-slate-500">Deal not found.</p>
        </div>
      </div>
    );
  }

  // deal is now narrowed to Doc<"deals">
  const resolvedDeal = deal;
  const stage = stageConfig[resolvedDeal.stage];

  async function handleStageChange(newStage: Deal["stage"]) {
    try {
      await updateDeal({ dealId: resolvedDeal._id, stage: newStage });
      toastMutationSuccess("Stage updated");
    } catch (error) {
      toastMutationError(error, "Failed to update stage");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    try {
      await removeDeal({ dealId: resolvedDeal._id });
      toastMutationSuccess("Deal deleted");
      onBack();
    } catch (error) {
      toastMutationError(error, "Failed to delete deal");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="-ml-2 text-slate-400 hover:text-white"
            >
              ← Back
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="truncate text-lg font-semibold text-white">
              {resolvedDeal.name}
            </h1>
            <Badge
              variant="secondary"
              className={cn("shrink-0 text-[10px]", stage.color)}
            >
              {stage.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(resolvedDeal._id)}
            >
              Edit
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Deal Value" value={formatCurrency(resolvedDeal.value)} />
        <StatCard label="Probability" value={`${resolvedDeal.probability}%`}>
          <Progress value={resolvedDeal.probability} className="mt-2 h-1.5 bg-white/5" />
        </StatCard>
        <StatCard
          label="Weighted Value"
          value={formatCurrency(resolvedDeal.value * (resolvedDeal.probability / 100))}
        />
      </div>

      {/* Stage stepper */}
      <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-4">
        <h3 className="mb-3 text-xs font-medium text-slate-400">Pipeline Stage</h3>
        <div className="flex items-center gap-1">
          {stages.map((s, i) => {
            const cfg = stageConfig[s];
            const isActive = s === resolvedDeal.stage;
            return (
              <div key={s} className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleStageChange(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    isActive
                      ? cfg.color
                      : "text-slate-600 hover:bg-white/5 hover:text-slate-400",
                  )}
                >
                  {cfg.label}
                </button>
                {i < stages.length - 1 && (
                  <span className="mx-1 text-slate-700">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailCard title="Client">
          {client ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">{client.name}</p>
              <p className="text-xs text-slate-500">{client.company}</p>
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="text-xs text-seridian-400 hover:underline"
                >
                  {client.email}
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600">No client</p>
          )}
        </DetailCard>

        <DetailCard title="Timeline">
          <div className="space-y-1.5">
            <DetailRow
              label="Expected Close"
              value={
                resolvedDeal.expectedCloseDate
                  ? new Date(resolvedDeal.expectedCloseDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            {resolvedDeal.contactEmail && (
              <DetailRow label="Contact" value={resolvedDeal.contactEmail} />
            )}
          </div>
        </DetailCard>
      </div>

      {/* Notes */}
      {resolvedDeal.notes && (
        <DetailCard title="Notes">
          <p className="whitespace-pre-wrap text-sm text-slate-300">
            {resolvedDeal.notes}
          </p>
        </DetailCard>
      )}
    </div>
  );
}

/* --- Small sub-components --- */

function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
        {value}
      </p>
      {children}
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-4">
      <h3 className="mb-2 text-xs font-medium text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-300">{value}</span>
    </div>
  );
}

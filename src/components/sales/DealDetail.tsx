"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Progress, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ArrowLeft, Briefcase, Calendar, Mail } from "lucide-react";

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
      <div className="space-y-6 p-1">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  if (deal === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Deal not found.</p>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back to Pipeline
        </Button>
      </div>
    );
  }

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
    <div className="space-y-6 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white -ml-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Back to Pipeline
        </Button>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(resolvedDeal._id)}
              className="text-slate-300 hover:text-white"
            >
              Edit
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <div className="flex flex-wrap items-center gap-1">
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailCard title="Client">
          {client ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">{client.name}</p>
              <p className="text-xs text-slate-500">{client.company}</p>
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                >
                  <Mail className="w-3 h-3" aria-hidden="true" />
                  {client.email}
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600">No client linked</p>
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
              icon={<Calendar className="w-3 h-3 text-slate-500" aria-hidden="true" />}
            />
            {resolvedDeal.contactEmail && (
              <DetailRow label="Contact" value={resolvedDeal.contactEmail} />
            )}
          </div>
        </DetailCard>
      </div>

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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
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
    <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-xs text-slate-300">{value}</span>
    </div>
  );
}

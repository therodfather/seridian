"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@bytecats/ui-kit";
import { PipelineBoard } from "@/components/sales/PipelineBoard";
import { DealDetail } from "@/components/sales/DealDetail";
import { DealForm } from "@/components/sales/DealForm";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SalesPage() {
  return <SalesPageContent />;
}

/* ------------------------------------------------------------------ */
/*  Main content (after auth)                                          */
/* ------------------------------------------------------------------ */

function SalesPageContent() {
  /* -- Convex data -- */
  const deals = useQuery(api.deals.list, {});
  const clients = useQuery(api.clients.list, {});
  const updateDeal = useMutation(api.deals.update);

  /* -- Local state -- */
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<Id<"deals"> | null>(null);
  const [viewingDealId, setViewingDealId] = useState<Id<"deals"> | null>(null);

  const editingDeal = useQuery(
    api.deals.get,
    editingDealId ? { dealId: editingDealId } : "skip",
  );

  /* -- Derived data -- */
  const clientMap = useMemo(
    () =>
      new Map<string, string>(
        (clients ?? []).map((c) => [c._id, c.name]),
      ),
    [clients],
  );

  const stats = useMemo(() => {
    if (!deals) return null;
    const active = deals.filter((d) => d.stage !== "closed_lost");
    const total = active.reduce((s, d) => s + d.value, 0);
    const weighted = active.reduce(
      (s, d) => s + d.value * (d.probability / 100),
      0,
    );
    const byStage = {
      lead: deals.filter((d) => d.stage === "lead"),
      proposal: deals.filter((d) => d.stage === "proposal"),
      negotiation: deals.filter((d) => d.stage === "negotiation"),
      closed_won: deals.filter((d) => d.stage === "closed_won"),
      closed_lost: deals.filter((d) => d.stage === "closed_lost"),
    };
    return { total, weighted, count: deals.length, byStage };
  }, [deals]);

  /* -- Handlers -- */
  function handleAddDeal() {
    setEditingDealId(null);
    setDealFormOpen(true);
  }

  function handleDealClick(dealId: Id<"deals">) {
    setViewingDealId(dealId);
  }

  function handleEditDeal(dealId: Id<"deals">) {
    setEditingDealId(dealId);
    setDealFormOpen(true);
  }

  function handleDealFormSuccess() {
    setDealFormOpen(false);
    setEditingDealId(null);
  }

  /* -- Detail view -- */
  if (viewingDealId) {
    return (
      <div className="flex flex-col gap-4">
        <DealDetail
          dealId={viewingDealId}
          onBack={() => setViewingDealId(null)}
          onEdit={handleEditDeal}
        />

        {/* Edit dialog while viewing */}
        <Dialog open={dealFormOpen} onOpenChange={setDealFormOpen}>
          <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Deal</DialogTitle>
            </DialogHeader>
            {editingDeal !== undefined ? (
              <DealForm
                deal={editingDeal ?? undefined}
                onSuccess={handleDealFormSuccess}
                onCancel={() => setDealFormOpen(false)}
              />
            ) : (
              <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* -- Board view -- */
  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Pipeline board */}
      <div className="flex-1">
        <PipelineBoard
          onDealClick={handleDealClick}
          onAddDeal={handleAddDeal}
        />
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dealFormOpen} onOpenChange={setDealFormOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDealId ? "Edit Deal" : "New Deal"}
            </DialogTitle>
          </DialogHeader>
          {editingDealId === null || editingDeal !== undefined ? (
            <DealForm
              deal={editingDeal ?? undefined}
              onSuccess={handleDealFormSuccess}
              onCancel={() => setDealFormOpen(false)}
            />
          ) : (
            <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats bar                                                          */
/* ------------------------------------------------------------------ */

type StageKey = "lead" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

interface PipelineStats {
  total: number;
  weighted: number;
  count: number;
  byStage: Record<StageKey, { value: number }[]>;
}

const stageMeta: Record<StageKey, { label: string; dot: string }> = {
  lead: { label: "Lead", dot: "bg-slate-400" },
  proposal: { label: "Proposal", dot: "bg-blue-400" },
  negotiation: { label: "Negotiation", dot: "bg-yellow-400" },
  closed_won: { label: "Won", dot: "bg-green-400" },
  closed_lost: { label: "Lost", dot: "bg-red-400" },
};

function StatsBar({ stats }: { stats: PipelineStats | null }) {
  if (!stats) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[60px] flex-1 rounded-lg" />
        ))}
      </div>
    );
  }

  const stageStages: StageKey[] = [
    "lead",
    "proposal",
    "negotiation",
    "closed_won",
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Pipeline" value={formatCurrency(stats.total)} />
      <StatCard label="Weighted Value" value={formatCurrency(stats.weighted)} />
      <StatCard label="Active Deals" value={String(stats.count)} />
      <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-3">
        <p className="text-[11px] text-slate-500">By Stage</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {stageStages.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${stageMeta[s].dot}`}
                aria-hidden="true"
              />
              <span className="text-[11px] text-slate-400 tabular-nums">
                {stats.byStage[s].length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}

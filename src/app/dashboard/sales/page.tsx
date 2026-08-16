"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
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
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  DollarSign,
  TrendingUp,
  Award,
  BarChart3,
  Briefcase,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { PipelineBoard } from "@/components/sales/PipelineBoard";
import { DealDetail } from "@/components/sales/DealDetail";
import { DealForm } from "@/components/sales/DealForm";
import { PageShell, StatusBadge } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";

type StageKey = "lead" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
type ViewMode = "board" | "table";
type SortKey = "value_desc" | "name_asc" | "prob_desc";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const stageMeta: Record<StageKey, { label: string; dot: string; color: string }> = {
  lead: { label: "Lead", dot: "bg-slate-400", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  proposal: { label: "Proposal", dot: "bg-blue-400", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  negotiation: { label: "Negotiation", dot: "bg-yellow-400", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  closed_won: { label: "Closed Won", dot: "bg-emerald-400", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed_lost: { label: "Closed Lost", dot: "bg-red-400", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function SalesPage() {
  return <SalesPageContent />;
}

function SalesPageContent() {
  /* Convex queries & mutations */
  const deals = useQuery(api.deals.list, {});
  const clients = useQuery(api.clients.list, {});

  /* Local State */
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<Id<"deals"> | null>(null);
  const [viewingDealId, setViewingDealId] = useState<Id<"deals"> | null>(null);

  /* View & Filtering State */
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [minValueFilter, setMinValueFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortKey>("value_desc");

  const editingDeal = useQuery(
    api.deals.get,
    editingDealId ? { dealId: editingDealId } : "skip"
  );

  const clientMap = useMemo(
    () =>
      new Map<string, string>(
        (clients ?? []).map((c) => [c._id, c.name])
      ),
    [clients]
  );

  /* Filtered Deals */
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((deal) => {
      const matchesStage = selectedStage === "all" || deal.stage === selectedStage;
      const matchesValue = deal.value >= minValueFilter;
      const clientName = deal.clientId ? clientMap.get(deal.clientId) ?? "" : "";
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        deal.name.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        (deal.contactEmail && deal.contactEmail.toLowerCase().includes(q)) ||
        (deal.notes && deal.notes.toLowerCase().includes(q));

      return matchesStage && matchesValue && matchesSearch;
    });
  }, [deals, selectedStage, minValueFilter, searchQuery, clientMap]);

  /* Sorted Deals for Table View */
  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];
    if (sortBy === "value_desc") return list.sort((a, b) => b.value - a.value);
    if (sortBy === "name_asc") return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "prob_desc") return list.sort((a, b) => b.probability - a.probability);
    return list;
  }, [filteredDeals, sortBy]);

  /* Key Performance Metrics */
  const stats = useMemo(() => {
    if (!deals) return null;
    const active = deals.filter((d) => d.stage !== "closed_lost");
    const won = deals.filter((d) => d.stage === "closed_won");
    const totalActiveValue = active.reduce((s, d) => s + d.value, 0);
    const totalWonValue = won.reduce((s, d) => s + d.value, 0);
    const weighted = active.reduce(
      (s, d) => s + d.value * (d.probability / 100),
      0
    );
    const avgDealSize = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length) : 0;
    const winRate = deals.length > 0 ? Math.round((won.length / deals.length) * 100) : 0;

    const byStage = {
      lead: deals.filter((d) => d.stage === "lead"),
      proposal: deals.filter((d) => d.stage === "proposal"),
      negotiation: deals.filter((d) => d.stage === "negotiation"),
      closed_won: deals.filter((d) => d.stage === "closed_won"),
      closed_lost: deals.filter((d) => d.stage === "closed_lost"),
    };

    return {
      totalActiveValue,
      totalWonValue,
      weighted,
      count: deals.length,
      activeCount: active.length,
      wonCount: won.length,
      avgDealSize,
      winRate,
      byStage,
    };
  }, [deals]);

  /* Handlers */
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

  /* Detail View */
  if (viewingDealId) {
    return (
      <div className="flex flex-col gap-4">
        <DealDetail
          dealId={viewingDealId}
          onBack={() => setViewingDealId(null)}
          onEdit={handleEditDeal}
        />

        <Dialog open={dealFormOpen} onOpenChange={setDealFormOpen}>
          <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white font-bold">Edit Deal Opportunity</DialogTitle>
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

  return (
    <PageShell
      title="Sales Pipeline"
      description="Track deal stages, forecast weighted revenue, manage client opportunities, and analyze conversion metrics."
      badge={
        <StatusBadge tone="success">
          {stats ? `${stats.activeCount} Active Deals` : "Loading..."}
        </StatusBadge>
      }
      action={
        <Button
          size="sm"
          onClick={handleAddDeal}
          className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Opportunity
        </Button>
      }
    >
      {/* KPI Metrics Dashboard Bar */}
      <ExecutiveKpiBar stats={stats} />

      {/* Interactive Controls & Filters Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-3.5">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals, clients, or emails..."
              aria-label="Search deals"
              className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
            />
          </div>

          {/* Value Preset Filter */}
          <div className="hidden sm:flex items-center gap-1">
            {[
              { label: "All Values", value: 0 },
              { label: "> $10K", value: 10000 },
              { label: "> $50K", value: 50000 },
              { label: "> $100K", value: 100000 },
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setMinValueFilter(preset.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                  minValueFilter === preset.value
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side controls: View mode switcher & Stage selection */}
        <div className="flex items-center gap-3">
          {/* Stage Dropdown Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            aria-label="Filter by stage"
            className="rounded-lg border border-white/[0.08] bg-[#070b14] px-2.5 py-1.5 text-xs text-slate-300 focus:border-cyan-500/40 focus:outline-none"
          >
            <option value="all">All Stages</option>
            <option value="lead">Lead</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#070b14] p-1">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              aria-label="Board view"
              aria-pressed={viewMode === "board"}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                viewMode === "board"
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                viewMode === "table"
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "board" ? (
        <div className="flex-1">
          <PipelineBoard
            deals={deals === undefined ? undefined : filteredDeals}
            clientMap={clientMap}
            onDealClick={handleDealClick}
            onAddDeal={handleAddDeal}
            emptyTitle={
              searchQuery || selectedStage !== "all" || minValueFilter > 0
                ? "No deals match filters"
                : "No deals in the pipeline"
            }
            emptyDescription={
              searchQuery || selectedStage !== "all" || minValueFilter > 0
                ? "Try adjusting search, stage, or value filters."
                : "Create a deal to start tracking opportunities by stage."
            }
          />
        </div>
      ) : (
        /* Table / List View */
        <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#080d1a]">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-cyan-400" />
              <span>Matching Opportunities ({sortedDeals.length})</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sort deals"
                className="bg-[#070b14] border border-white/10 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="value_desc">Highest Value</option>
                <option value="name_asc">Deal Name (A-Z)</option>
                <option value="prob_desc">Probability</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#070b14] text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Deal Name</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="px-4 py-3 font-semibold text-right">Deal Value</th>
                  <th className="px-4 py-3 font-semibold text-right">Probability</th>
                  <th className="px-4 py-3 font-semibold">Expected Close</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {deals === undefined ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-8 w-full rounded" />
                      </td>
                    </tr>
                  ))
                ) : sortedDeals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      {deals.length === 0
                        ? "No deals in the pipeline yet."
                        : "No deals match your active filters or search query."}
                    </td>
                  </tr>
                ) : (
                  sortedDeals.map((deal) => {
                    const clientName = deal.clientId ? clientMap.get(deal.clientId) : "Unassigned";
                    const stage = stageMeta[deal.stage];
                    return (
                      <tr
                        key={deal._id}
                        onClick={() => handleDealClick(deal._id)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          <div className="truncate max-w-xs">{deal.name}</div>
                          {deal.contactEmail && (
                            <div className="text-[11px] text-slate-500 truncate">{deal.contactEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-medium">
                            {clientName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border", stage.color)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", stage.dot)} />
                            {stage.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white font-mono">
                          {formatCurrency(deal.value)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-mono">
                          {deal.probability}%
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {deal.expectedCloseDate
                            ? new Date(deal.expectedCloseDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDealClick(deal._id);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 text-xs gap-1"
                          >
                            Inspect <ExternalLink className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dealFormOpen} onOpenChange={setDealFormOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">
              {editingDealId ? "Edit Opportunity" : "New Sales Opportunity"}
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
    </PageShell>
  );
}

/* Executive KPI Bar Component */
interface PipelineStats {
  totalActiveValue: number;
  totalWonValue: number;
  weighted: number;
  count: number;
  activeCount: number;
  wonCount: number;
  avgDealSize: number;
  winRate: number;
  byStage: Record<StageKey, { value: number }[]>;
}

function ExecutiveKpiBar({ stats }: { stats: PipelineStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 transition-all hover:border-emerald-500/30">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Pipeline
          </p>
          <DollarSign className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-1 text-xl font-bold text-white tabular-nums tracking-tight">
          {formatCurrency(stats.totalActiveValue)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Across {stats.activeCount} active opportunities
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 transition-all hover:border-cyan-500/30">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Weighted Forecast
          </p>
          <TrendingUp className="h-4 w-4 text-cyan-400" />
        </div>
        <p className="mt-1 text-xl font-bold text-white tabular-nums tracking-tight">
          {formatCurrency(stats.weighted)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Probability adjusted revenue projection
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 transition-all hover:border-purple-500/30">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Won Revenue
          </p>
          <Award className="h-4 w-4 text-purple-400" />
        </div>
        <p className="mt-1 text-xl font-bold text-emerald-400 tabular-nums tracking-tight">
          {formatCurrency(stats.totalWonValue)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {stats.wonCount} closed deals ({stats.winRate}% win rate)
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4 transition-all hover:border-amber-500/30">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Average Deal Size
          </p>
          <BarChart3 className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-1 text-xl font-bold text-white tabular-nums tracking-tight">
          {formatCurrency(stats.avgDealSize)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Total tracked deals: {stats.count}
        </p>
      </div>
    </div>
  );
}


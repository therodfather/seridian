"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import {
  FileText,
  DollarSign,
  Send,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Edit,
  Eye,
  Clock,
  Building2,
} from "lucide-react";

type Proposal = Doc<"proposals">;

const STATUS_CONFIG: Record<
  Proposal["status"],
  { color: string; label: string }
> = {
  draft: {
    color: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    label: "Draft",
  },
  sent: {
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/10",
    label: "Sent",
  },
  accepted: {
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10",
    label: "Accepted",
  },
  rejected: {
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    label: "Rejected",
  },
  expired: {
    color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    label: "Expired",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ProposalListProps {
  onEdit?: (proposalId: Id<"proposals">) => void;
  onView?: (proposalId: Id<"proposals">) => void;
  onAdd?: () => void;
}

function ProposalRow({
  proposal,
  clientName,
  onEdit,
  onView,
}: {
  proposal: Proposal;
  clientName?: string;
  onEdit?: (id: Id<"proposals">) => void;
  onView?: (id: Id<"proposals">) => void;
}) {
  const status = STATUS_CONFIG[proposal.status];
  const sendProposal = useMutation(api.proposals.send);
  const acceptProposal = useMutation(api.proposals.accept);
  const rejectProposal = useMutation(api.proposals.reject);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleSend(e: React.MouseEvent) {
    e.stopPropagation();
    setLoadingAction("send");
    try {
      await sendProposal({ proposalId: proposal._id });
      toastMutationSuccess("Proposal sent successfully");
    } catch (err) {
      toastMutationError(err, "Failed to send proposal");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAccept(e: React.MouseEvent) {
    e.stopPropagation();
    setLoadingAction("accept");
    try {
      await acceptProposal({ proposalId: proposal._id });
      toastMutationSuccess("Proposal accepted!");
    } catch (err) {
      toastMutationError(err, "Failed to accept proposal");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject(e: React.MouseEvent) {
    e.stopPropagation();
    setLoadingAction("reject");
    try {
      await rejectProposal({ proposalId: proposal._id });
      toastMutationSuccess("Proposal rejected");
    } catch (err) {
      toastMutationError(err, "Failed to reject proposal");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-4",
        "transition-all duration-200",
        "hover:border-cyan-500/30 hover:bg-[#0e162a] hover:shadow-lg hover:shadow-cyan-950/20",
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
          <FileText className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onView?.(proposal._id)}
              className="truncate text-base font-semibold text-white hover:text-cyan-400 transition-colors text-left"
            >
              {proposal.title}
            </button>
            <Badge
              variant="secondary"
              className={cn("shrink-0 text-[10px] px-2 py-0.5 border font-semibold", status.color)}
            >
              {status.label}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {clientName && (
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {clientName}
              </span>
            )}
            <span className="text-slate-500">Created: {formatDate(proposal.createdAt)}</span>
            {proposal.validUntil && (
              <span className="text-amber-400/80">· Valid until {formatDate(proposal.validUntil)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 border-t border-white/[0.06] pt-3 sm:border-t-0 sm:pt-0 shrink-0">
        {proposal.value !== undefined && (
          <div className="text-left sm:text-right pr-2">
            <p className="text-base font-bold text-white tabular-nums">
              {formatCurrency(proposal.value)}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Value</p>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {proposal.status === "draft" && (
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={loadingAction === "send"}
              className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-xs h-8 px-2.5"
            >
              <Send className="w-3 h-3 mr-1" />
              {loadingAction === "send" ? "Sending..." : "Send"}
            </Button>
          )}

          {proposal.status === "sent" && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleAccept}
                disabled={loadingAction === "accept"}
                className="h-8 border border-emerald-500/20 bg-emerald-500/10 px-2 text-xs text-emerald-400 hover:bg-emerald-500/20"
              >
                <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-400" />
                {loadingAction === "accept" ? "Accepting..." : "Accept"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleReject}
                disabled={loadingAction === "reject"}
                className="h-8 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <XCircle className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onView?.(proposal._id)}
            className="h-8 px-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <Eye className="mr-1 h-3.5 w-3.5 text-cyan-400" /> View
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(proposal._id)}
            aria-label="Edit proposal"
            className="h-8 shrink-0 px-2.5 text-xs text-slate-400 opacity-100 hover:bg-white/5 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Edit className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProposalList({ onEdit, onView, onAdd }: ProposalListProps) {
  const proposals = useQuery(api.proposals.list, {});
  const clients = useQuery(api.clients.list, {});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    if (clients) {
      for (const c of clients) {
        map.set(c._id, c.name);
      }
    }
    return map;
  }, [clients]);

  const metrics = useMemo(() => {
    if (!proposals) return { total: 0, pipelineVal: 0, acceptedVal: 0, draftCount: 0, sentCount: 0 };
    let pipelineVal = 0;
    let acceptedVal = 0;
    let draftCount = 0;
    let sentCount = 0;

    for (const p of proposals) {
      if (p.status === "draft") draftCount++;
      if (p.status === "sent") sentCount++;
      if (p.status === "accepted") {
        acceptedVal += p.value ?? 0;
      }
      if (p.status === "draft" || p.status === "sent") {
        pipelineVal += p.value ?? 0;
      }
    }

    return { total: proposals.length, pipelineVal, acceptedVal, draftCount, sentCount };
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    if (!proposals) return null;
    return proposals
      .filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const clientName = p.clientId ? clientMap.get(p.clientId)?.toLowerCase() : "";
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchClient = clientName?.includes(q);
          const matchContent = p.content?.toLowerCase().includes(q);
          if (!matchTitle && !matchClient && !matchContent) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "highest_value") {
          return (b.value ?? 0) - (a.value ?? 0);
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        return b.createdAt - a.createdAt;
      });
  }, [proposals, search, statusFilter, sortBy, clientMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Proposals</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, track, and manage commercial proposals, quote statuses, and accepted client values.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-lg shadow-cyan-500/10 gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> New Proposal
        </Button>
      </div>

      {/* KPI Metrics Summary Bar */}
      {proposals === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Active Proposals <FileText className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-white tabular-nums">{metrics.total}</p>
            <p className="text-[11px] text-slate-500">{metrics.draftCount} drafts · {metrics.sentCount} sent</p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Pending Pipeline <DollarSign className="w-4 h-4 text-blue-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-blue-400 tabular-nums">{formatCurrency(metrics.pipelineVal)}</p>
            <p className="text-[11px] text-slate-500">Draft & Sent proposal value</p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Accepted Revenue <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-emerald-400 tabular-nums">{formatCurrency(metrics.acceptedVal)}</p>
            <p className="text-[11px] text-slate-500">Closed winning proposals</p>
          </div>
          <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Awaiting Client <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
            </span>
            <p className="text-2xl font-extrabold text-amber-400 tabular-nums">{metrics.sentCount}</p>
            <p className="text-[11px] text-slate-500">Outbound pending decision</p>
          </div>
        </div>
      )}

      {/* Filters & Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#0c1222]/80">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals by title, client name, or terms..."
            aria-label="Search proposals"
            className="pl-9 h-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              aria-label="Filter by status"
              className="h-9 w-[130px] border-white/10 bg-white/5 text-xs text-slate-300"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/10">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger
              aria-label="Sort proposals"
              className="h-9 w-[140px] border-white/10 bg-white/5 text-xs text-slate-300"
            >
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/10">
              <SelectItem value="newest">Sort: Newest First</SelectItem>
              <SelectItem value="highest_value">Sort: Highest Value</SelectItem>
              <SelectItem value="title">Sort: Title (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Proposal List */}
      {filteredProposals === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredProposals.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== "all" ? "No proposals match criteria" : "No proposals yet"}
          description={
            search || statusFilter !== "all"
              ? "Try modifying search queries or status filters."
              : "Create your first proposal to track outbound deals and contract quotes."
          }
          action={
            <Button
              type="button"
              size="sm"
              onClick={onAdd}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              + New Proposal
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal) => (
            <ProposalRow
              key={proposal._id}
              proposal={proposal}
              clientName={proposal.clientId ? clientMap.get(proposal.clientId) : undefined}
              onEdit={onEdit}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}


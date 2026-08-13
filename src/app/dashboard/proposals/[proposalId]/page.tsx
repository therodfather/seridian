"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Badge,
  Button,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { isConvexId } from "@/lib/convexId";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
} from "lucide-react";

const STATUS_CONFIG = {
  draft: { color: "bg-slate-500/15 text-slate-400 border-slate-500/20", label: "Draft" },
  sent: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Sent" },
  accepted: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Accepted" },
  rejected: { color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Rejected" },
  expired: { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Expired" },
} as const;

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

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = use(params);
  const validProposalId = isConvexId(proposalId);
  const proposal = useQuery(
    api.proposals.get,
    validProposalId ? { proposalId: proposalId as Id<"proposals"> } : "skip",
  );
  const client = useQuery(
    api.clients.get,
    proposal?.clientId ? { clientId: proposal.clientId } : "skip",
  );

  const sendProposal = useMutation(api.proposals.send);
  const acceptProposal = useMutation(api.proposals.accept);
  const rejectProposal = useMutation(api.proposals.reject);

  const [editOpen, setEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleSend() {
    if (!validProposalId) return;
    setActionLoading("send");
    try {
      await sendProposal({ proposalId: proposalId as Id<"proposals"> });
      toastMutationSuccess("Proposal sent to client");
    } catch (error) {
      toastMutationError(error, "Failed to send proposal");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept() {
    if (!validProposalId) return;
    setActionLoading("accept");
    try {
      await acceptProposal({ proposalId: proposalId as Id<"proposals"> });
      toastMutationSuccess("Proposal accepted!");
    } catch (error) {
      toastMutationError(error, "Failed to accept proposal");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!validProposalId) return;
    setActionLoading("reject");
    try {
      await rejectProposal({ proposalId: proposalId as Id<"proposals"> });
      toastMutationSuccess("Proposal rejected");
    } catch (error) {
      toastMutationError(error, "Failed to reject proposal");
    } finally {
      setActionLoading(null);
    }
  }

  if (!validProposalId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Invalid proposal link.</p>
        <Link href="/dashboard/proposals" className="text-cyan-400 hover:underline">
          Back to Proposals
        </Link>
      </div>
    );
  }

  if (proposal === undefined) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (proposal === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Proposal not found.</p>
        <Link href="/dashboard/proposals" className="text-cyan-400 hover:underline">
          Back to Proposals
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[proposal.status];

  // Lifecycle Steps
  const steps = [
    { key: "draft", label: "Draft Proposal" },
    { key: "sent", label: "Sent to Client" },
    {
      key:
        proposal.status === "rejected"
          ? "rejected"
          : proposal.status === "expired"
            ? "expired"
            : "accepted",
      label:
        proposal.status === "rejected"
          ? "Proposal Rejected"
          : proposal.status === "expired"
            ? "Proposal Expired"
            : "Proposal Accepted",
    },
  ];

  const getStepStatus = (stepKey: string) => {
    if (proposal.status === stepKey) return "active";
    if (proposal.status === "accepted" && (stepKey === "draft" || stepKey === "sent")) return "completed";
    if (proposal.status === "sent" && stepKey === "draft") return "completed";
    if (proposal.status === "rejected" && (stepKey === "draft" || stepKey === "sent")) return "completed";
    if (proposal.status === "expired" && (stepKey === "draft" || stepKey === "sent")) return "completed";
    return "pending";
  };

  return (
    <div className="space-y-6 p-1">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/proposals"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-cyan-500/20 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to Proposals
        </Link>
        <Button
          type="button"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/10"
        >
          <Edit className="w-3.5 h-3.5 mr-1" /> Edit Proposal
        </Button>
      </div>

      {/* Main Proposal Card Banner */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-cyan-400" aria-hidden="true" />
                {proposal.title}
              </h1>
              <Badge variant="secondary" className={cn("text-xs px-2.5 py-0.5 border font-semibold", status.color)}>
                {status.label}
              </Badge>
            </div>

            {client && (
              <Link
                href={`/dashboard/clients/${client._id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/10 text-[10px] font-bold text-cyan-400 uppercase border border-cyan-500/20">
                  {client.name.charAt(0)}
                </div>
                <span className="font-semibold text-white">{client.name}</span>
                <span className="text-slate-500">({client.company})</span>
                <ExternalLink className="w-3 h-3 text-slate-500 ml-1" />
              </Link>
            )}
          </div>

          {proposal.value !== undefined && (
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-left md:text-right shrink-0">
              <p className="text-2xl font-extrabold text-white tabular-nums">
                {formatCurrency(proposal.value)}
              </p>
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Proposal Value</p>
            </div>
          )}
        </div>

        {/* Workflow Lifecycle Stepper */}
        <div className="pt-4 border-t border-white/[0.06] space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Proposal Workflow Status:</p>
          <div className="grid grid-cols-3 gap-2">
            {steps.map((st, idx) => {
              const state = getStepStatus(st.key);
              return (
                <div
                  key={st.key}
                  className={cn(
                    "p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all",
                    state === "completed"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : state === "active"
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/30"
                      : "bg-white/[0.02] border-white/[0.06] text-slate-500"
                  )}
                >
                  <span className="truncate">{idx + 1}. {st.label}</span>
                  {state === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />}
                  {state === "active" && <Clock className="w-4 h-4 text-cyan-400 animate-pulse shrink-0 ml-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-white/[0.06]">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Created Date</p>
              <p className="text-xs font-semibold text-slate-200">{formatDate(proposal.createdAt)}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Last Modified</p>
              <p className="text-xs font-semibold text-slate-200">{formatDate(proposal.updatedAt)}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Valid Until</p>
              <p className="text-xs font-semibold text-slate-200">
                {proposal.validUntil ? formatDate(proposal.validUntil) : "No Expiration"}
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Quick Actions Bar */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
          {proposal.status === "draft" && (
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={actionLoading === "send"}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs px-4"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              {actionLoading === "send" ? "Sending Proposal..." : "Send Proposal to Client"}
            </Button>
          )}

          {proposal.status === "sent" && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleAccept}
                disabled={actionLoading === "accept"}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs px-4"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                {actionLoading === "accept" ? "Accepting..." : "Mark Accepted"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleReject}
                disabled={actionLoading === "reject"}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs px-4 border border-red-500/20"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                {actionLoading === "reject" ? "Rejecting..." : "Mark Rejected"}
              </Button>
            </>
          )}
        </div>

        {(proposal.sentAt || proposal.acceptedAt) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {proposal.sentAt && (
              <p className="rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-1.5 text-blue-400">
                Sent on {formatDate(proposal.sentAt)}
              </p>
            )}
            {proposal.acceptedAt && (
              <p className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 text-emerald-400">
                Accepted on {formatDate(proposal.acceptedAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Proposal Body Document View */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" aria-hidden="true" /> Proposal Body & Specifications
        </h2>
        <div className="whitespace-pre-wrap rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 text-sm leading-relaxed text-slate-200">
          {proposal.content || "No detailed content provided."}
        </div>
      </div>

      {/* Notes Section */}
      {proposal.notes && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Internal Notes & Context</h2>
          <div className="whitespace-pre-wrap rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-xs leading-relaxed text-slate-400">
            {proposal.notes}
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Proposal</DialogTitle>
          </DialogHeader>
          <ProposalForm
            proposal={proposal}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


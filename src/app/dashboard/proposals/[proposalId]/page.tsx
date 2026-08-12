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

const STATUS_CONFIG = {
  draft: { color: "bg-slate-500/15 text-slate-400 border-slate-500/20", label: "Draft" },
  sent: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Sent" },
  accepted: { color: "bg-green-500/15 text-green-400 border-green-500/20", label: "Accepted" },
  rejected: { color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Rejected" },
  expired: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Expired" },
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
      toastMutationSuccess("Proposal sent");
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
      toastMutationSuccess("Proposal accepted");
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

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-seridian-500/20 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </a>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-white">{proposal.title}</h1>
              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.color)}>
                {status.label}
              </Badge>
            </div>
            {client && (
              <a
                href={`/dashboard/clients/${client._id}`}
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-seridian-400 transition-colors"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-seridian-500/10 text-[10px] font-semibold text-seridian-400 uppercase">
                  {client.name.charAt(0)}
                </span>
                {client.name}
                <span className="text-slate-600">· {client.company}</span>
              </a>
            )}
          </div>
          {proposal.value !== undefined && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatCurrency(proposal.value)}
              </p>
              <p className="text-[11px] text-slate-500">Proposal Value</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Created</p>
            <p className="mt-1 text-sm text-slate-300">{formatDate(proposal.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Last Updated</p>
            <p className="mt-1 text-sm text-slate-300">{formatDate(proposal.updatedAt)}</p>
          </div>
          {proposal.validUntil && (
            <div className="rounded-lg bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Valid Until</p>
              <p className="mt-1 text-sm text-slate-300">{formatDate(proposal.validUntil)}</p>
            </div>
          )}
        </div>

        {proposal.sentAt && (
          <div className="mt-4 rounded-lg bg-blue-500/5 border border-blue-500/10 px-4 py-2.5">
            <p className="text-xs text-blue-400">
              Sent on {formatDate(proposal.sentAt)}
            </p>
          </div>
        )}

        {proposal.acceptedAt && (
          <div className="mt-2 rounded-lg bg-green-500/5 border border-green-500/10 px-4 py-2.5">
            <p className="text-xs text-green-400">
              Accepted on {formatDate(proposal.acceptedAt)}
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2">
          {proposal.status === "draft" && (
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={actionLoading === "send"}
            >
              {actionLoading === "send" ? "Sending..." : "Send Proposal"}
            </Button>
          )}
          {proposal.status === "sent" && (
            <>
              <Button
                type="button"
                size="sm"
                className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 hover:text-green-300"
                onClick={handleAccept}
                disabled={actionLoading === "accept"}
              >
                {actionLoading === "accept" ? "Accepting..." : "Accept"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={handleReject}
                disabled={actionLoading === "reject"}
              >
                {actionLoading === "reject" ? "Rejecting..." : "Reject"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Content</h2>
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-4 text-sm leading-relaxed text-slate-300">
          {proposal.content}
        </div>
      </div>

      {proposal.notes && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Notes</h2>
          <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-4 text-sm leading-relaxed text-slate-400">
            {proposal.notes}
          </div>
        </div>
      )}

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

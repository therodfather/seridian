"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ROUTES } from "@/lib/routes";

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
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    label: "Sent",
  },
  accepted: {
    color: "bg-green-500/15 text-green-400 border-green-500/20",
    label: "Accepted",
  },
  rejected: {
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    label: "Rejected",
  },
  expired: {
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
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

interface ProposalCardProps {
  proposalId: Id<"proposals">;
  onBack?: () => void;
  onEdit?: (proposalId: Id<"proposals">) => void;
  onCreated?: (contractId: Id<"contracts">) => void;
}

export function ProposalCard({ proposalId, onBack, onEdit, onCreated }: ProposalCardProps) {
  const router = useRouter();
  const proposal = useQuery(api.proposals.get, { proposalId });
  const clients = useQuery(api.clients.list, {});
  const sendProposal = useMutation(api.proposals.send);
  const acceptProposal = useMutation(api.proposals.accept);
  const rejectProposal = useMutation(api.proposals.reject);
  const createFromProposal = useMutation(api.contracts.createFromProposal);
  const [creatingContract, setCreatingContract] = useState(false);

  const clientName = proposal?.clientId
    ? clients?.find((c) => c._id === proposal.clientId)?.name
    : undefined;

  if (proposal === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-white/[0.03]" />
        <div className="h-64 animate-pulse rounded-lg bg-white/[0.02]" />
      </div>
    );
  }

  if (proposal === null) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-sm text-slate-600">
        Proposal not found.
      </div>
    );
  }

  const status = STATUS_CONFIG[proposal.status];

  async function handleSend() {
    try {
      await sendProposal({ proposalId });
      toastMutationSuccess("Proposal sent");
    } catch (error) {
      toastMutationError(error, "Failed to send proposal");
    }
  }

  async function handleAccept() {
    try {
      await acceptProposal({ proposalId });
      toastMutationSuccess("Proposal accepted");
    } catch (error) {
      toastMutationError(error, "Failed to accept proposal");
    }
  }

  async function handleReject() {
    try {
      await rejectProposal({ proposalId });
      toastMutationSuccess("Proposal rejected");
    } catch (error) {
      toastMutationError(error, "Failed to reject proposal");
    }
  }

  async function handleCreateContract() {
    try {
      setCreatingContract(true);
      const contractId = await createFromProposal({ proposalId });
      toastMutationSuccess("Contract ready");
      if (onCreated) {
        onCreated(contractId);
      } else {
        router.push(ROUTES.dashboard.contracts);
      }
    } catch (error) {
      toastMutationError(error, "Failed to create contract");
    } finally {
      setCreatingContract(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-400"
          >
            ← Back
          </Button>
        )}
        <div className="flex-1 min-w-0" />
        {proposal.status === "draft" && (
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
          >
            Send Proposal
          </Button>
        )}
        {proposal.status === "sent" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-green-400 hover:text-green-300"
              onClick={handleAccept}
            >
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={handleReject}
            >
              Reject
            </Button>
          </>
        )}
        {proposal.status === "accepted" && proposal.clientId && (
          <Button
            type="button"
            size="sm"
            disabled={creatingContract}
            onClick={handleCreateContract}
          >
            {creatingContract ? "Creating…" : "Create contract"}
          </Button>
        )}
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(proposalId)}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                {proposal.title}
              </h2>
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", status.color)}
              >
                {status.label}
              </Badge>
            </div>
            {clientName && (
              <p className="mt-1 text-sm text-slate-500">
                Client:{" "}
                <span className="text-slate-300">{clientName}</span>
              </p>
            )}
          </div>
          {proposal.value !== undefined && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {formatCurrency(proposal.value)}
              </p>
              <p className="text-[11px] text-slate-500">Proposal Value</p>
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-lg bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Created
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {formatDate(proposal.createdAt)}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Last Updated
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {formatDate(proposal.updatedAt)}
            </p>
          </div>
          {proposal.validUntil && (
            <div className="rounded-lg bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Valid Until
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {formatDate(proposal.validUntil)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Content
          </h3>
          <div className="mt-4 sm:mt-6 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-3 sm:p-4 text-sm leading-relaxed text-slate-300">
            {proposal.content}
          </div>
        </div>

        {proposal.notes && (
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </h3>
            <div className="mt-4 sm:mt-6 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-3 sm:p-4 text-sm leading-relaxed text-slate-400">
              {proposal.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

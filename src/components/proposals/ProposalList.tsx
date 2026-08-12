"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";

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

  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3",
        "transition-all duration-150",
        "hover:border-seridian-500/20 hover:bg-[#0c1222]"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-seridian-500/10 text-sm font-semibold text-seridian-400 uppercase">
        {proposal.title.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onView?.(proposal._id)}
            className="truncate text-sm font-medium text-slate-200 hover:text-white text-left"
          >
            {proposal.title}
          </button>
          <Badge
            variant="secondary"
            className={cn("shrink-0 text-[10px] px-1.5 py-0", status.color)}
          >
            {status.label}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {clientName ?? "No client"}
          {proposal.value !== undefined && (
            <span className="ml-1.5 text-slate-600">
              · {formatCurrency(proposal.value)}
            </span>
          )}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-4 sm:flex">
        {proposal.value !== undefined && (
          <div className="text-right">
            <p className="text-sm font-semibold text-white tabular-nums">
              {formatCurrency(proposal.value)}
            </p>
          </div>
        )}

        <div className="hidden text-right md:block">
          <p className="text-xs text-slate-500">{formatDate(proposal.createdAt)}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-slate-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onEdit?.(proposal._id)}
        >
          Edit
        </Button>
      </div>
    </div>
  );
}

export function ProposalList({ onEdit, onView, onAdd }: ProposalListProps) {
  const proposals = useQuery(api.proposals.list, {});
  const clients = useQuery(api.clients.list, {});

  const clientMap = new Map<string, string>();
  if (clients) {
    for (const c of clients) {
      clientMap.set(c._id, c.name);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Proposals</h2>
          <p className="text-sm text-slate-500">
            {proposals === undefined
              ? "Loading..."
              : `${proposals.length} proposal${proposals.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAdd} className="self-start">
          + New Proposal
        </Button>
      </div>

      {proposals === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[60px] rounded-lg" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          description="Create your first proposal to track outbound deals."
          action={
            <Button type="button" size="sm" onClick={onAdd}>
              + New Proposal
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {proposals.map((proposal) => (
            <ProposalRow
              key={proposal._id}
              proposal={proposal}
              clientName={
                proposal.clientId
                  ? clientMap.get(proposal.clientId)
                  : undefined
              }
              onEdit={onEdit}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button, Skeleton } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";

type Contract = Doc<"contracts">;

const STATUS_CONFIG: Record<
  Contract["status"],
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
  signed: {
    color: "bg-green-500/15 text-green-400 border-green-500/20",
    label: "Signed",
  },
  active: {
    color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    label: "Active",
  },
  completed: {
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    label: "Completed",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateString(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ContractListProps {
  onEdit?: (contractId: Id<"contracts">) => void;
  onView?: (contractId: Id<"contracts">) => void;
  onAdd?: () => void;
}

function ContractRow({
  contract,
  clientName,
  onEdit,
  onView,
}: {
  contract: Contract;
  clientName?: string;
  onEdit?: (id: Id<"contracts">) => void;
  onView?: (id: Id<"contracts">) => void;
}) {
  const sendForSignature = useMutation(api.contracts.sendForSignature);
  const status = STATUS_CONFIG[contract.status];
  const canSend = contract.status === "draft" || contract.status === "sent";

  async function handleSend() {
    try {
      const result = await sendForSignature({ contractId: contract._id });
      await navigator.clipboard.writeText(
        `${window.location.origin}/sign/${result.signToken}`,
      );
      toastMutationSuccess("Signing link copied");
    } catch (error) {
      toastMutationError(error, "Failed to send for signature");
    }
  }

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3 sm:flex-row sm:items-center sm:gap-4",
        "transition-all duration-150",
        "hover:border-seridian-500/20 hover:bg-[#0c1222]",
      )}
    >
      <button
        type="button"
        aria-label={`View ${contract.name}`}
        onClick={() => onView?.(contract._id)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-seridian-500/10 text-sm font-semibold text-seridian-400 uppercase">
          {contract.name.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-200 hover:text-white">
              {contract.name}
            </span>
            <Badge
              variant="secondary"
              className={cn("shrink-0 text-[10px] px-1.5 py-0", status.color)}
            >
              {status.label}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {clientName ?? "No client"}
            <span className="ml-1.5 text-slate-600">
              · {formatCurrency(contract.value)}
            </span>
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-white tabular-nums">
            {formatCurrency(contract.value)}
          </p>
        </div>

        <div className="min-w-0 flex-1 text-left sm:flex-none sm:text-right">
          <p className="text-xs text-slate-500">
            {formatDateString(contract.startDate)}
            {contract.endDate ? ` – ${formatDateString(contract.endDate)}` : ""}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-slate-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => onEdit?.(contract._id)}
        >
          Edit
        </Button>
        {canSend && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-cyan-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            onClick={handleSend}
          >
            Send for signature
          </Button>
        )}
      </div>
    </div>
  );
}

export function ContractList({ onEdit, onView, onAdd }: ContractListProps) {
  const contracts = useQuery(api.contracts.list, {});
  const clients = useQuery(api.clients.list, {});

  const clientMap = new Map<string, string>();
  if (clients) {
    for (const c of clients) {
      clientMap.set(c._id, c.name);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Contracts</h2>
          <p className="text-sm text-slate-500">
            {contracts === undefined
              ? "Loading..."
              : `${contracts.length} contract${contracts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onAdd} className="self-start">
          + New Contract
        </Button>
      </div>

      {contracts === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[60px] rounded-lg" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          description="Turn an accepted proposal into a contract, or create one."
          action={
            <Button type="button" size="sm" onClick={onAdd}>
              + New Contract
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <ContractRow
              key={contract._id}
              contract={contract}
              clientName={clientMap.get(contract.clientId)}
              onEdit={onEdit}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}

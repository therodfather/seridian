"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Badge, Button } from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

interface ContractCardProps {
  contractId: Id<"contracts">;
  onBack?: () => void;
  onEdit?: (contractId: Id<"contracts">) => void;
}

export function ContractCard({ contractId, onBack, onEdit }: ContractCardProps) {
  const contract = useQuery(api.contracts.get, { contractId });
  const clients = useQuery(api.clients.list, {});
  const sendForSignature = useMutation(api.contracts.sendForSignature);
  const activateContract = useMutation(api.contracts.activate);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const clientName = contract
    ? clients?.find((c) => c._id === contract.clientId)?.name
    : undefined;

  if (contract === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-white/[0.03]" />
        <div className="h-64 animate-pulse rounded-lg bg-white/[0.02]" />
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-sm text-slate-600">
        Contract not found.
      </div>
    );
  }

  const status = STATUS_CONFIG[contract.status];
  const signToken = contract.signToken;
  const signingUrl = signToken ? `${origin}/sign/${signToken}` : undefined;

  async function copySigningLink(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`);
    toastMutationSuccess("Signing link copied");
  }

  async function handleSend() {
    try {
      const result = await sendForSignature({ contractId });
      await copySigningLink(result.signToken);
    } catch (error) {
      toastMutationError(error, "Failed to send for signature");
    }
  }

  async function handleCopyLink() {
    if (!signToken) return;
    try {
      await copySigningLink(signToken);
    } catch (error) {
      toastMutationError(error, "Failed to copy signing link");
    }
  }

  async function handleActivate() {
    try {
      await activateContract({ contractId });
      toastMutationSuccess("Contract activated");
    } catch (error) {
      toastMutationError(error, "Failed to activate contract");
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
        <div className="min-w-0 flex-1" />
        {contract.status === "draft" && (
          <Button type="button" size="sm" onClick={handleSend}>
            Send for signature
          </Button>
        )}
        {signToken && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
          >
            Copy link
          </Button>
        )}
        {contract.status === "signed" && (
          <Button type="button" size="sm" onClick={handleActivate}>
            Activate
          </Button>
        )}
        {onEdit && contract.status === "draft" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(contractId)}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                {contract.name}
              </h2>
              <Badge
                variant="secondary"
                className={cn("px-1.5 py-0 text-[10px]", status.color)}
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
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xl font-bold text-white tabular-nums sm:text-2xl">
              {formatCurrency(contract.value)}
            </p>
            <p className="text-[11px] text-slate-500">Contract Value</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-lg bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              Start
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {formatDateString(contract.startDate)}
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-3">
            <p className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              End
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {contract.endDate ? formatDateString(contract.endDate) : "Open"}
            </p>
          </div>
          {contract.sentAt && (
            <div className="rounded-lg bg-white/[0.02] p-3">
              <p className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                Sent
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {formatDate(contract.sentAt)}
              </p>
            </div>
          )}
        </div>

        {contract.status === "sent" && signingUrl && (
          <div className="mt-4 rounded-lg border border-blue-500/10 bg-blue-500/5 px-4 py-2.5">
            <p className="text-xs text-blue-400">Signing URL</p>
            <p className="mt-1 break-all text-sm text-slate-300">{signingUrl}</p>
          </div>
        )}

        {contract.body && (
          <div className="mt-6">
            <h3 className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              Statement of Work
            </h3>
            <div className="mt-4 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-3 text-sm leading-relaxed text-slate-300 sm:mt-6 sm:p-4">
              {contract.body}
            </div>
          </div>
        )}

        {contract.notes && (
          <div className="mt-6">
            <h3 className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              Notes
            </h3>
            <div className="mt-4 whitespace-pre-wrap rounded-lg bg-white/[0.02] p-3 text-sm leading-relaxed text-slate-400 sm:mt-6 sm:p-4">
              {contract.notes}
            </div>
          </div>
        )}

        {(contract.status === "signed" ||
          contract.status === "active" ||
          contract.status === "completed" ||
          contract.signedAt) && (
          <div className="mt-6 rounded-lg border border-green-500/10 bg-green-500/5 p-4">
            <h3 className="text-xs font-medium tracking-wider text-green-400 uppercase">
              Signature
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {contract.signerName ?? "Signed"}
              {contract.signerTitle ? ` · ${contract.signerTitle}` : ""}
            </p>
            {contract.signedAt && (
              <p className="mt-1 text-xs text-slate-500">
                Signed {formatDate(contract.signedAt)}
              </p>
            )}
            {contract.signatureText && (
              <p className="mt-3 font-serif text-lg text-white italic">
                {contract.signatureText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

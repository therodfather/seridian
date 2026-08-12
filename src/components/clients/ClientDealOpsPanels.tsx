"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Badge, Button, Skeleton, TabsContent } from "@bytecats/ui-kit";
import { FileManager } from "@/components/files/FileManager";
import { entityHref } from "@/lib/dashboardNav";
import { ROUTES } from "@/lib/routes";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface ClientDealOpsPanelsProps {
  clientId: Id<"clients">;
}

export function ClientDealOpsPanels({ clientId }: ClientDealOpsPanelsProps) {
  const proposals = useQuery(api.proposals.getByClient, { clientId });
  const contracts = useQuery(api.contracts.list, { clientId });

  return (
    <>
      <TabsContent value="files" className="space-y-4 pt-4">
        <FileManager clientId={clientId} />
      </TabsContent>

      <TabsContent value="proposals" className="space-y-4 pt-4">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            asChild
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
          >
            <Link href={ROUTES.dashboard.proposals}>New proposal</Link>
          </Button>
        </div>
        {proposals === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-xs text-slate-500">
            No proposals for this client yet.
          </div>
        ) : (
          <div className="space-y-2">
            {proposals.map((proposal) => (
              <Link
                key={proposal._id}
                href={entityHref("proposals", proposal._id)}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3 transition-colors hover:border-white/[0.1] hover:bg-[#0c1222]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{proposal.title}</p>
                  <p className="text-xs text-slate-500 capitalize">{proposal.status.replace(/_/g, " ")}</p>
                </div>
                {proposal.value !== undefined && (
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                    {formatCurrency(proposal.value)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="contracts" className="space-y-4 pt-4">
        {contracts === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-xs text-slate-500">
            No contracts for this client yet.
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((contract) => (
              <Link
                key={contract._id}
                href={entityHref("contracts", contract._id)}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 px-4 py-3 transition-colors hover:border-white/[0.1] hover:bg-[#0c1222]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{contract.name}</p>
                  <Badge
                    variant="secondary"
                    className="mt-1 text-[10px] capitalize px-1.5 py-0 bg-white/[0.04] text-slate-400 border-white/10"
                  >
                    {contract.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {formatCurrency(contract.value)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>
    </>
  );
}

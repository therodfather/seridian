"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { isConvexId } from "@/lib/convexId";
import { ROUTES } from "@/lib/routes";
import { ContractCard } from "@/components/contracts/ContractCard";
import { ContractForm } from "@/components/contracts/ContractForm";

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = use(params);
  const router = useRouter();
  const valid = isConvexId(contractId);
  const contract = useQuery(
    api.contracts.get,
    valid ? { contractId: contractId as Id<"contracts"> } : "skip",
  );
  const [editOpen, setEditOpen] = useState(false);

  if (!valid) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Invalid contract link.</p>
        <Link href={ROUTES.dashboard.contracts} className="text-cyan-400 hover:underline">
          Back to Contracts
        </Link>
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
        <p>Contract not found.</p>
        <Link href={ROUTES.dashboard.contracts} className="text-cyan-400 hover:underline">
          Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <>
      <ContractCard
        contractId={contractId as Id<"contracts">}
        onBack={() => router.push(ROUTES.dashboard.contracts)}
        onEdit={() => setEditOpen(true)}
      />
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Contract</DialogTitle>
          </DialogHeader>
          {contract ? (
            <ContractForm
              contract={contract}
              onSuccess={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          ) : (
            <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

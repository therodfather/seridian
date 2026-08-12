"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { ProposalList } from "@/components/proposals/ProposalList";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

export default function ProposalsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"proposals"> | undefined>();
  const [viewingId, setViewingId] = useState<Id<"proposals"> | undefined>();

  const editingProposal = useQuery(
    api.proposals.get,
    editingId ? { proposalId: editingId } : "skip",
  );

  function handleAdd() {
    setEditingId(undefined);
    setViewingId(undefined);
    setFormOpen(true);
  }

  function handleEdit(id: Id<"proposals">) {
    setEditingId(id);
    setViewingId(undefined);
    setFormOpen(true);
  }

  function handleView(id: Id<"proposals">) {
    setViewingId(id);
    setEditingId(undefined);
    setFormOpen(false);
  }

  function handleSuccess() {
    setFormOpen(false);
    setEditingId(undefined);
  }

  if (viewingId) {
    return (
      <DashboardGuard>
        <ProposalCard
          proposalId={viewingId}
          onBack={() => setViewingId(undefined)}
          onEdit={handleEdit}
        />
      </DashboardGuard>
    );
  }

  return (
    <DashboardGuard>
      <ProposalList onAdd={handleAdd} onEdit={handleEdit} onView={handleView} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? "Edit Proposal" : "New Proposal"}
            </DialogTitle>
          </DialogHeader>
          {editingId === undefined || editingProposal !== undefined ? (
            <ProposalForm
              proposal={editingProposal ?? undefined}
              onSuccess={handleSuccess}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
          )}
        </DialogContent>
      </Dialog>
    </DashboardGuard>
  );
}

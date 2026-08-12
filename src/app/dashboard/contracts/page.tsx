"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { ContractList } from "@/components/contracts/ContractList";
import { ContractForm } from "@/components/contracts/ContractForm";
import { ContractCard } from "@/components/contracts/ContractCard";

export default function ContractsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"contracts"> | undefined>();
  const [viewingId, setViewingId] = useState<Id<"contracts"> | undefined>();

  const editingContract = useQuery(
    api.contracts.get,
    editingId ? { contractId: editingId } : "skip",
  );

  function handleAdd() {
    setEditingId(undefined);
    setViewingId(undefined);
    setFormOpen(true);
  }

  function handleEdit(id: Id<"contracts">) {
    setEditingId(id);
    setViewingId(undefined);
    setFormOpen(true);
  }

  function handleView(id: Id<"contracts">) {
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
      <ContractCard
        contractId={viewingId}
        onBack={() => setViewingId(undefined)}
        onEdit={handleEdit}
      />
    );
  }

  return (
    <>
      <ContractList onAdd={handleAdd} onEdit={handleEdit} onView={handleView} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? "Edit Contract" : "New Contract"}
            </DialogTitle>
          </DialogHeader>
          {editingId === undefined || editingContract !== undefined ? (
            <ContractForm
              contract={editingContract ?? undefined}
              onSuccess={handleSuccess}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import { ClientList } from "@/components/clients/ClientList";
import { ClientForm } from "@/components/clients/ClientForm";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

export default function ClientsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<Id<"clients"> | undefined>();

  const editingClient = useQuery(
    api.clients.get,
    editingClientId ? { clientId: editingClientId } : "skip",
  );

  function handleAdd() {
    setEditingClientId(undefined);
    setFormOpen(true);
  }

  function handleEdit(clientId: Id<"clients">) {
    setEditingClientId(clientId);
    setFormOpen(true);
  }

  function handleSuccess() {
    setFormOpen(false);
    setEditingClientId(undefined);
  }

  return (
    <DashboardGuard>
      <ClientList onAdd={handleAdd} onEdit={handleEdit} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingClientId ? "Edit Client" : "New Client"}
            </DialogTitle>
          </DialogHeader>
          {editingClientId === undefined || editingClient !== undefined ? (
            <ClientForm
              client={editingClient ?? undefined}
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

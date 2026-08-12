"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Skeleton } from "@bytecats/ui-kit";
import { Settings, Users, UserPlus, Trash2, Mail, Shield, Clock } from "lucide-react";
import { DashboardGuard } from "@/components/dashboard/DashboardGuard";

type User = Doc<"users">;

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin: { label: "Admin", color: "bg-seridian-500/15 text-seridian-400 border-seridian-500/20", icon: Shield },
  member: { label: "Member", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Users },
};

function UserCard({ user, onEdit, onDelete }: { user: User; onEdit: (user: User) => void; onDelete: (userId: Id<"users">) => void }) {
  const statusColors: Record<string, string> = {
    online: "bg-emerald-500",
    away: "bg-amber-400",
    offline: "bg-slate-500",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0c1222]/80 p-4 transition-colors hover:border-white/[0.1]">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-seridian-500/10 text-sm font-semibold text-seridian-400">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c1222] ${statusColors[user.status]}`} aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{user.name}</span>
            <Badge variant="secondary" className="text-[10px]">{user.pubkey}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            {user.email && (
              <>
                <Mail className="h-3 w-3" aria-hidden="true" />
                <span>{user.email}</span>
                <span className="text-white/10">|</span>
              </>
            )}
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{new Date(user.lastSeen).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(user)} className="text-slate-400 hover:text-white">
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(user._id)} className="text-red-400 hover:text-red-300">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function UserForm({ user, onClose }: { user?: User; onClose: () => void }) {
  const createUser = useMutation(api.users.upsert);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [pubkey, setPubkey] = useState(user?.pubkey ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pubkey.trim()) return;
    setSaving(true);
    try {
      await createUser({
        pubkey: pubkey.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        password: password.trim() || undefined,
        status: "offline",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-md border-white/[0.08] bg-[#0c1222]">
      <DialogHeader>
        <DialogTitle className="text-white">{user ? "Edit User" : "Add User"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Pubkey *</Label>
          <Input value={pubkey} onChange={(e) => setPubkey(e.target.value)} placeholder="e.g. john" disabled={!!user} className="bg-white/5 border-white/10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="bg-white/5 border-white/10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="john@example.com" className="bg-white/5 border-white/10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Password {user && "(leave blank to keep current)"}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={user ? "••••••" : "Set password"} className="bg-white/5 border-white/10" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
          <Button type="submit" disabled={saving || !name.trim() || !pubkey.trim()} className="bg-seridian-500 text-white hover:bg-seridian-400">
            {saving ? "Saving..." : user ? "Update" : "Add User"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export default function SettingsPage() {
  const users = useQuery(api.chat.getUsers, {});
  const deleteUser = useMutation(api.users.remove);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"users"> | null>(null);

  function handleEdit(user: User) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function handleClose() {
    setFormOpen(false);
    setEditingUser(undefined);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    await deleteUser({ userId: deleteConfirmId });
    setDeleteConfirmId(null);
  }

  return (
    <DashboardGuard>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <span className="text-sm text-slate-400">{users?.length ?? 0} users</span>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)} className="bg-seridian-500 text-white hover:bg-seridian-400">
            <UserPlus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Add User
          </Button>
        </div>

        <div className="space-y-2">
          {users === undefined ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))
          ) : users.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-sm text-slate-600">
              No users yet. Add one to get started.
            </div>
          ) : (
            users.map((user) => (
              <UserCard key={user._id} user={user} onEdit={handleEdit} onDelete={setDeleteConfirmId} />
            ))
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <UserForm user={editingUser} onClose={handleClose} />
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm border-white/[0.08] bg-[#0c1222]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Are you sure you want to delete this user? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="text-slate-400">Cancel</Button>
            <Button onClick={handleConfirmDelete} className="bg-red-500 text-white hover:bg-red-400">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardGuard>
  );
}

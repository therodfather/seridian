"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button, Input, Label, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from "@bytecats/ui-kit";
import {
  Key, Shield, Lock, Check, Eye, EyeOff, Plus, Trash2, Copy, Search,
  Globe, CreditCard, Mail, Server, Smartphone, Wifi, FileText, Edit3, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Secret {
  _id: string;
  name: string;
  category: string;
  description?: string;
  maskedValue: string;
  createdAt?: number;
  updatedAt?: number;
}

const CATEGORIES = [
  { id: "api", label: "API Keys", icon: Key, color: "text-cyan-400 bg-cyan-500/10" },
  { id: "password", label: "Passwords", icon: Lock, color: "text-purple-400 bg-purple-500/10" },
  { id: "token", label: "Tokens", icon: Shield, color: "text-emerald-400 bg-emerald-500/10" },
  { id: "database", label: "Databases", icon: Server, color: "text-blue-400 bg-blue-500/10" },
  { id: "service", label: "Services", icon: Globe, color: "text-orange-400 bg-orange-500/10" },
  { id: "other", label: "Other", icon: FileText, color: "text-slate-400 bg-slate-500/10" },
] as const;

const PRESET_SECRETS = [
  { name: "GITHUB_TOKEN", category: "api", description: "GitHub Personal Access Token" },
  { name: "CONVEX_DEPLOY_KEY", category: "api", description: "Convex deployment key" },
  { name: "NETLIFY_AUTH_TOKEN", category: "token", description: "Netlify deploy token" },
  { name: "STRIPE_SECRET_KEY", category: "api", description: "Stripe payment processing" },
  { name: "SENDGRID_API_KEY", category: "api", description: "SendGrid email service" },
  { name: "AWS_ACCESS_KEY_ID", category: "api", description: "AWS access credentials" },
  { name: "DATABASE_URL", category: "database", description: "Database connection string" },
  { name: "SMTP_PASSWORD", category: "password", description: "Email server password" },
  { name: "WEBHOOK_SECRET", category: "token", description: "Webhook signing secret" },
];

export function SecretsVault({ currentUserId = "dee" }: { currentUserId?: string }) {
  const secrets = useQuery(api.secrets.listSecrets, { currentUserId });
  const setSecret = useMutation(api.secrets.setSecret);
  const deleteSecret = useMutation(api.secrets.deleteSecret);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSecret, setNewSecret] = useState({ name: "", value: "", category: "api", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Secret | null>(null);

  const filteredSecrets = useMemo(() => {
    if (!secrets) return [];
    return secrets.filter((s) => {
      if (selectedCategory !== "all" && s.category !== selectedCategory) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [secrets, selectedCategory, search]);

  const stats = useMemo(() => {
    if (!secrets) return { total: 0, configured: 0 };
    return { total: secrets.length, configured: secrets.length };
  }, [secrets]);

  async function handleSave() {
    if (!newSecret.name.trim() || !newSecret.value.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      await setSecret({
        name: newSecret.name.trim(),
        secretValue: newSecret.value.trim(),
        category: newSecret.category as any,
        description: newSecret.description.trim() || undefined,
        currentUserId,
      });
      setIsAdding(false);
      setNewSecret({ name: "", value: "", category: "api", description: "" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save secret");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(secret: Secret) {
    setDeleting(true);
    setActionError(null);
    try {
      await deleteSecret({ name: secret.name, currentUserId });
      setDeleteConfirm(null);
      setSelectedSecret(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete secret");
    } finally {
      setDeleting(false);
    }
  }

  function handleCopyValue() {
    if (selectedSecret) {
      navigator.clipboard.writeText(selectedSecret.maskedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleQuickAdd(preset: typeof PRESET_SECRETS[0]) {
    setNewSecret({ name: preset.name, value: "", category: preset.category, description: preset.description });
    setIsAdding(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-400">{stats.configured} secrets stored</span>
        </div>
        <Button size="sm" onClick={() => { setActionError(null); setIsAdding(true); }} className="bg-seridian-500 text-white hover:bg-seridian-400">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Secret
        </Button>
      </div>

      {actionError && !isAdding && !deleteConfirm && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {actionError}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search secrets..." className="h-7 pl-8 bg-white/5 border-white/10 text-xs" />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setSelectedCategory("all")} className={cn("h-7 px-2.5 rounded-md text-xs font-medium transition-colors", selectedCategory === "all" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}>All</button>
          {CATEGORIES.slice(0, 4).map((cat) => (
            <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className={cn("h-7 px-2.5 rounded-md text-xs font-medium transition-colors", selectedCategory === cat.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}>{cat.label}</button>
          ))}
        </div>
      </div>

      {/* Secrets Grid */}
      <div className="space-y-1.5">
        {secrets === undefined ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse bg-white/[0.02]" />)
        ) : filteredSecrets.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-center px-4">
            <p className="text-sm text-slate-400">
              {search ? "No matching secrets" : "No secrets yet"}
            </p>
            {!search && (
              <p className="text-[11px] text-slate-600 mt-1 max-w-sm">
                Store API keys and tokens here. Writes require an admin handle.
              </p>
            )}
            {!search && (
              <Button
                size="sm"
                onClick={() => { setActionError(null); setIsAdding(true); }}
                className="mt-3 bg-seridian-500 text-white hover:bg-seridian-400 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add first secret
              </Button>
            )}
          </div>
        ) : (
          filteredSecrets.map((secret) => {
            const cat = CATEGORIES.find((c) => c.id === secret.category) ?? CATEGORIES[5];
            const Icon = cat.icon;
            return (
              <button key={secret._id} type="button" onClick={() => { setSelectedSecret(secret); setShowValue(false); }} className={cn("group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors", selectedSecret?._id === secret._id ? "border-seridian-500/30 bg-seridian-500/5" : "border-white/[0.06] bg-[#0c1222]/60 hover:border-white/[0.1]")}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cat.color)}><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{secret.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{secret.description || cat.label}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-600">{secret.maskedValue}</span>
                  <ChevronIcon />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Add Secret Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-md border-white/[0.06] bg-[#0c1222]">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Add Secret</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Quick Add Presets */}
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">Quick Add</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SECRETS.filter((p) => !secrets?.find((s) => s.name === p.name)).slice(0, 6).map((preset) => (
                  <button key={preset.name} type="button" onClick={() => handleQuickAdd(preset)} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors">{preset.name}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Name *</Label>
              <Input value={newSecret.name} onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })} placeholder="MY_API_KEY" className="bg-white/5 border-white/10 text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Value *</Label>
              <Input type="password" value={newSecret.value} onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })} placeholder="Enter secret value" className="bg-white/5 border-white/10 text-xs font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Category</Label>
                <select value={newSecret.category} onChange={(e) => setNewSecret({ ...newSecret, category: e.target.value })} className="w-full h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-slate-300">
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Description</Label>
                <Input value={newSecret.description} onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })} placeholder="Optional" className="bg-white/5 border-white/10 text-xs" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)} disabled={saving} className="text-slate-400 text-xs">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !newSecret.name.trim() || !newSecret.value.trim()} className="bg-seridian-500 text-white hover:bg-seridian-400 text-xs">{saving ? "Saving..." : "Save Secret"}</Button>
            </div>
            {actionError && isAdding && (
              <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {actionError}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSecret} onOpenChange={(o) => !o && setSelectedSecret(null)}>
        {selectedSecret && (
          <DialogContent className="max-w-sm border-white/[0.06] bg-[#0c1222] p-4 space-y-4">
            <div className="flex items-start gap-3">
              {(() => { const cat = CATEGORIES.find((c) => c.id === selectedSecret.category) ?? CATEGORIES[5]; const Icon = cat.icon; return <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", cat.color)}><Icon className="h-5 w-5" /></div>; })()}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white font-mono">{selectedSecret.name}</h3>
                <p className="text-xs text-slate-500">{selectedSecret.description || "No description"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Value</Label>
              <div className="flex items-center gap-2">
                <Input type={showValue ? "text" : "password"} value={showValue ? selectedSecret.maskedValue : "••••••••••••••••"} readOnly className="flex-1 bg-white/5 border-white/10 text-xs font-mono" />
                <Button variant="ghost" size="sm" onClick={() => setShowValue(!showValue)} className="h-8 w-8 p-0 text-slate-400 hover:text-white">{showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="sm" onClick={handleCopyValue} className="h-8 w-8 p-0 text-slate-400 hover:text-white">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-white/[0.06]">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(selectedSecret)} className="text-red-400 hover:text-red-300 text-xs"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSecret(null)} className="text-slate-400 text-xs">Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        {deleteConfirm && (
          <DialogContent className="max-w-sm border-white/[0.06] bg-[#0c1222] p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Delete secret?</h3>
            <p className="text-xs text-slate-400">Permanently delete <span className="font-mono text-white">{deleteConfirm.name}</span>? This cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting} className="text-slate-400 text-xs">Cancel</Button>
              <Button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="bg-red-500 text-white hover:bg-red-400 text-xs">
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
            {actionError && deleteConfirm && (
              <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {actionError}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ChevronIcon() {
  return <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}

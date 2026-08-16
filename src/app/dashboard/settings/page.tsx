"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@bytecats/ui-kit";
import {
  Settings,
  Users,
  UserPlus,
  Trash2,
  Mail,
  Shield,
  Clock,
  RefreshCw,
  Bot,
  Key,
  Sliders,
  Check,
  Search,
  Bell,
  Server,
} from "lucide-react";
import { SyncDashboard } from "@/components/sync/SyncDashboard";
import { PlatformConnections } from "@/components/settings/PlatformConnections";
import { SecretsVault } from "@/components/settings/SecretsVault";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { useDashboardAuth } from "@/components/dashboard/DashboardGuard";
import { PageShell } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";

const VALID_TABS = new Set([
  "general",
  "audit",
  "users",
  "sync",
  "secrets",
  "agents",
]);

type User = Doc<"users">;

function UserCard({ user, onEdit, onDelete }: { user: User; onEdit: (user: User) => void; onDelete: (userId: Id<"users">) => void }) {
  const statusColors: Record<string, string> = {
    online: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    away: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    offline: "bg-slate-500",
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[#080d1a]/80 p-4 transition-all hover:border-cyan-500/30 hover:bg-[#0c1222] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative">
          <AvatarUpload
            pubkey={user.pubkey}
            name={user.name}
            avatarUrl={user.avatar ?? null}
            size="md"
          />
          <span className={`pointer-events-none absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#070b14] ${statusColors[user.status]}`} aria-hidden="true" />
        </div>
        <div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-100">{user.name}</span>
            <span className="truncate font-mono text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
              {user.pubkey}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
            {user.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-500" />
                {user.email}
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3 text-slate-500" />
              {new Date(user.lastSeen).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(user)} className="text-slate-400 hover:text-white hover:bg-white/5">
          Edit Profile
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(user._id)}
          aria-label={`Remove ${user.name}`}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pubkey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createUser({
        pubkey: pubkey.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        password: password.trim() || undefined,
        status: "offline",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-md border-white/[0.08] bg-[#080d1a] shadow-2xl">
      <DialogHeader>
        <DialogTitle className="text-white font-bold">{user ? "Edit User Access" : "Add Organization User"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-300">Public Key / User Handle *</Label>
          <Input value={pubkey} onChange={(e) => setPubkey(e.target.value)} placeholder="e.g. janedoe or 0x..." disabled={!!user || saving} className="bg-[#070b14] border-white/10 font-mono text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-300">Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" disabled={saving} className="bg-[#070b14] border-white/10 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-300">Email Address</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="jane@example.com" disabled={saving} className="bg-[#070b14] border-white/10 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-300">Password {user && "(leave blank to keep current)"}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={user ? "••••••••" : "Set account password"} disabled={saving} className="bg-[#070b14] border-white/10 text-xs font-mono" />
        </div>
        {error && (
          <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="text-slate-400">Cancel</Button>
          <Button type="submit" disabled={saving || !name.trim() || !pubkey.trim()} className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs">
            {saving ? "Saving User..." : user ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { user: authUser } = useDashboardAuth();
  const users = useQuery(api.chat.getUsers, {});
  const githubStats = useQuery(api.githubIngest.getGitHubStats);
  const deleteUser = useMutation(api.users.remove);
  const initialTab =
    tabParam && VALID_TABS.has(tabParam) ? tabParam : "general";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"users"> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // General Settings State Controls (session-local until org prefs are persisted)
  const [orgName, setOrgName] = useState("Seridian Digital");
  const [timezone, setTimezone] = useState("America/New_York");
  const [auditLogsEnabled, setAuditLogsEnabled] = useState(true);
  const [notifyOnSync, setNotifyOnSync] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (tabParam && VALID_TABS.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  function selectTab(id: string) {
    setActiveTab(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === "general") {
      params.delete("tab");
    } else {
      params.set("tab", id);
    }
    const qs = params.toString();
    router.replace(qs ? `/dashboard/settings?${qs}` : "/dashboard/settings", {
      scroll: false,
    });
  }

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
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser({ userId: deleteConfirmId });
      setDeleteConfirmId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete user");
    } finally {
      setDeleting(false);
    }
  }

  function handleSaveGeneralSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  }

  const filteredUsers = (users || []).filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.pubkey.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  const githubSynced =
    !!githubStats &&
    (!!githubStats.lastIssueSync ||
      !!githubStats.lastProjectSync ||
      githubStats.totalIssues > 0);

  const SETTINGS_SECTIONS = [
    { id: "general", label: "General & Org", icon: Sliders },
    { id: "audit", label: "Audit Logs", icon: Shield },
    { id: "users", label: "Team & Access", icon: Users, badge: users ? String(users.length) : undefined },
    { id: "sync", label: "Integrations & Sync", icon: RefreshCw, badge: githubSynced ? "Active" : undefined },
    { id: "secrets", label: "API Keys & Vault", icon: Key },
    { id: "agents", label: "AI Agent Studio", icon: Bot, badge: "2" },
  ];

  return (
    <PageShell
      title="Settings"
      description="Workspace preferences, team access, integrations, and secrets."
      icon={<Settings className="h-5 w-5" aria-hidden="true" />}
      action={
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#0c1222]/80 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs font-mono">
            {authUser?.name ? authUser.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate max-w-[120px]">
              {authUser?.name ?? "Administrator"}
            </p>
            <p className="text-[10px] font-mono text-cyan-400 truncate max-w-[120px]">
              {authUser?.pubkey ?? "0x...admin"}
            </p>
          </div>
        </div>
      }
    >
      {/* Mobile Horizontal Module Navigation (Shown on small screens) */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none" aria-label="Settings sections">
        {SETTINGS_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeTab === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => selectTab(sec.id)}
              aria-pressed={isActive}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                isActive
                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 border-white/[0.06] bg-[#080d1a]"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-cyan-400" : "text-slate-500")} />
              <span>{sec.label}</span>
              {sec.badge && (
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.2 rounded">
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Modern OS Split Layout (Sidebar Navigation + Main Pane) */}
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Navigation Panel (Desktop) */}
        <div className="hidden md:block space-y-1">
          <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Sections
          </div>
          {SETTINGS_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => selectTab(sec.id)}
                aria-pressed={isActive}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/30"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("h-4 w-4", isActive ? "text-cyan-400" : "text-slate-500")} />
                  <span>{sec.label}</span>
                </div>
                {sec.badge && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Infrastructure Health Status Card */}
          <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#080d1a] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-cyan-400" /> Infrastructure
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                Convex
              </span>
            </div>
            <div className="space-y-1 text-[10.5px] text-slate-500 font-mono">
              <div className="flex justify-between gap-2">
                <span>GitHub sync:</span>
                <span className={githubSynced ? "text-emerald-400" : "text-slate-400"}>
                  {githubStats === undefined
                    ? "…"
                    : githubSynced
                      ? "Data present"
                      : "Not synced"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Pane */}
        <div className="min-w-0">
          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <form onSubmit={handleSaveGeneralSettings} className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-6 space-y-6">
                <div className="border-b border-white/[0.08] pb-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-cyan-400" /> Organization Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Configure primary organization branding, timezones, and audit preferences.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Organization Name</Label>
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="bg-[#070b14] border-white/10 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">System Timezone</Label>
                    <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="bg-[#070b14] border-white/10 text-xs font-mono" />
                  </div>
                </div>

                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Governance & Security Switches</h3>

                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080d1a] p-3.5">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-cyan-400" /> Immutable Action Audit Logs
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Record system modification timestamps and administrative actions.</p>
                    </div>
                    <input
                      id="audit-logs-enabled"
                      type="checkbox"
                      checked={auditLogsEnabled}
                      onChange={(e) => setAuditLogsEnabled(e.target.checked)}
                      aria-label="Enable immutable action audit logs"
                      className="h-4 w-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080d1a] p-3.5">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-cyan-400" /> Live Integration Dispatch Alerts
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Receive instant dispatches on GitHub sync and agent updates.</p>
                    </div>
                    <input
                      id="notify-on-sync"
                      type="checkbox"
                      checked={notifyOnSync}
                      onChange={(e) => setNotifyOnSync(e.target.checked)}
                      aria-label="Enable integration dispatch alerts"
                      className="h-4 w-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {saveSuccess && (
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Preferences saved for this session (not persisted yet).</span>
                  </div>
                )}

                <div className="flex justify-end border-t border-white/[0.06] pt-4">
                  <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs px-4">
                    Save System Preferences
                  </Button>
                </div>
              </form>

              {/* Audit Log Viewer in Settings > General */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-6 space-y-4">
                <div className="border-b border-white/[0.08] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" /> Immutable Audit Log Viewer
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    System activity, secret updates, user revocations, and sync triggers.
                  </p>
                </div>
                <AuditLogViewer />
              </div>
            </div>
          )}

          {/* TAB AUDIT: DEDICATED AUDIT LOG MODULE */}
          {activeTab === "audit" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-400" /> Workspace Governance & Audit Logs
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Immutable record of administrative actions, secret modifications, account revocations, and sync triggers.
                </p>
              </div>
              <AuditLogViewer />
            </div>
          )}

          {/* TAB 2: TEAM & ACCESS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="search"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search members by name or handle..."
                    aria-label="Search members by name or handle"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#070b14] pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
                  />
                </div>
                <Button size="sm" onClick={() => setFormOpen(true)} className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add User Access
                </Button>
              </div>

              <div className="space-y-2">
                {users === undefined ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                ) : users.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-center p-6">
                    <Users className="h-6 w-6 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-300 font-medium">No team members yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Add a user handle to grant dashboard access for this workspace.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setFormOpen(true)}
                      className="mt-4 bg-cyan-500 text-black hover:bg-cyan-400 font-semibold text-xs"
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Add first user
                    </Button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-center p-6">
                    <Users className="h-6 w-6 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400">No members match “{userSearchQuery}”.</p>
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery("")}
                      className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <UserCard key={user._id} user={user} onEdit={handleEdit} onDelete={setDeleteConfirmId} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTEGRATIONS & SYNC */}
          {activeTab === "sync" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-6 space-y-6">
              <PlatformConnections currentUserId={authUser?.pubkey ?? "admin"} />
              <SyncDashboard />
            </div>
          )}

          {/* TAB 4: API KEYS & SECRETS VAULT */}
          {activeTab === "secrets" && (
            <SecretsVault currentUserId={authUser?.pubkey ?? "admin"} />
          )}

          {/* TAB 5: AI AGENT STUDIO */}
          {activeTab === "agents" && (
            <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-400" />
                  AI Agent Studio
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Planned orchestration agents. Status reflects product intent, not a live runtime check.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">@SeridianAI</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                      Planned
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">Executive Architect Agent</div>
                  <p className="text-xs text-slate-400 leading-relaxed">Orchestrates multi-agent subtasks, codebase queries, layout optimization, and workflow planning.</p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">@DataPulse</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                      Planned
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">Analytics & BI Agent</div>
                  <p className="text-xs text-slate-400 leading-relaxed">Monitors sales pipelines, client dossier background checks, booking rates, and team bandwidth.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <UserForm user={editingUser} onClose={handleClose} />
      </Dialog>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteConfirmId(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm border-white/[0.08] bg-[#080d1a]">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Confirm User Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Are you sure you want to revoke and delete this user? Access will be immediately removed.</p>
          {deleteError && (
            <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={deleting} className="text-slate-400">Cancel</Button>
            <Button onClick={handleConfirmDelete} disabled={deleting} className="bg-red-500 text-white hover:bg-red-400">
              {deleting ? "Revoking…" : "Confirm Revoke"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <Skeleton className="hidden md:block h-64 rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

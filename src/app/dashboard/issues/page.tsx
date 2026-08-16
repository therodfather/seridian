"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@bytecats/ui-kit";
import { IssueCard } from "@/components/kanban/IssueCard";
import { PageShell } from "@/components/dashboard/kit";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";

type Issue = Doc<"issues">;
type Status = Issue["status"];
type Priority = Issue["priority"];

/* ─── Constants ──────────────────────────────────────────────── */

const COLUMNS: { key: Status; label: string; headerColor: string }[] = [
  { key: "backlog", label: "Backlog", headerColor: "border-t-slate-500/40" },
  { key: "todo", label: "Todo", headerColor: "border-t-slate-400/60" },
  { key: "in_progress", label: "In Progress", headerColor: "border-t-yellow-500/60" },
  { key: "in_review", label: "In Review", headerColor: "border-t-blue-500/60" },
  { key: "done", label: "Done", headerColor: "border-t-green-500/60" },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  none: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function IssuesPage() {
  // Data
  const issues = useQuery(api.issues.list, {});
  const clients = useQuery(api.clients.list, {});
  const users = useQuery(api.chat.getUsers, {});
  const createIssue = useMutation(api.issues.create);
  const updateIssue = useMutation(api.issues.update);
  const removeIssue = useMutation(api.issues.remove);

  // Filters & Controls
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailIssueId, setDetailIssueId] = useState<Id<"issues"> | null>(null);

  // Create form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<Status>("todo");
  const [formPriority, setFormPriority] = useState<Priority>("medium");
  const [formClientId, setFormClientId] = useState<string>("");
  const [formLabels, setFormLabels] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Notifications
  const { addNotification } = useNotifications();

  // Detail issue data
  const detailIssue = useQuery(
    api.issues.get,
    detailIssueId ? { issueId: detailIssueId } : "skip",
  );

  // Client map
  const clientMap = useMemo(() => {
    return new Map<Id<"clients">, string>(
      (clients ?? []).map((c: Doc<"clients">) => [c._id, c.name]),
    );
  }, [clients]);

  // Metrics
  const metrics = useMemo(() => {
    if (!issues) return { total: 0, open: 0, urgentHigh: 0, done: 0 };
    let open = 0;
    let urgentHigh = 0;
    let done = 0;
    for (const item of issues) {
      if (item.status === "done") {
        done++;
      } else {
        open++;
      }
      if (item.priority === "urgent" || item.priority === "high") {
        urgentHigh++;
      }
    }
    return { total: issues.length, open, urgentHigh, done };
  }, [issues]);

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (!issues) return null;
    return issues.filter((issue) => {
      if (filterStatus !== "all" && issue.status !== filterStatus) return false;
      if (filterPriority !== "all" && issue.priority !== filterPriority) return false;
      if (filterClient !== "all") {
        if (filterClient === "_none" && issue.clientId) return false;
        if (filterClient !== "_none" && issue.clientId !== filterClient) return false;
      }
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q);
        const matchAssignee = issue.assignee?.toLowerCase().includes(q);
        const matchId = issue.identifier?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchId) return false;
      }
      return true;
    });
  }, [issues, filterStatus, filterClient, filterPriority, filterSearch]);

  // Grouped issues
  const issuesByStatus = useMemo(() => {
    if (!filteredIssues) return null;
    const grouped: Record<Status, Issue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const issue of filteredIssues) {
      grouped[issue.status].push(issue);
    }
    for (const key of Object.keys(grouped) as Status[]) {
      grouped[key].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [filteredIssues]);

  // Active filter count
  const activeFilterCount = [filterStatus, filterClient, filterPriority, filterSearch ? "search" : "all"].filter(
    (v) => v !== "all",
  ).length;

  // Handlers
  const resetCreateForm = useCallback(() => {
    setFormTitle("");
    setFormDescription("");
    setFormStatus("todo");
    setFormPriority("medium");
    setFormClientId("");
    setFormLabels("");
    setFormAssignee("");
    setFormDueDate("");
  }, []);

  const openCreateForStatus = useCallback((initialStatus?: Status) => {
    resetCreateForm();
    if (initialStatus) setFormStatus(initialStatus);
    setCreateOpen(true);
  }, [resetCreateForm]);

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim() || creating) return;
    setCreating(true);
    try {
      await createIssue({
        title: formTitle.trim(),
        description: formDescription.trim(),
        status: formStatus,
        priority: formPriority,
        clientId: (formClientId || undefined) as Id<"clients"> | undefined,
        labels: formLabels
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        assignee: formAssignee.trim() || undefined,
        dueDate: formDueDate || undefined,
      });
      resetCreateForm();
      setCreateOpen(false);
      addNotification({
        title: "Issue Created",
        message: `"${formTitle.trim()}" has been created.`,
        type: "success",
      });
    } catch (err) {
      addNotification({
        title: "Failed to Create Issue",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  }, [
    formTitle, formDescription, formStatus, formPriority,
    formClientId, formLabels, formAssignee, formDueDate,
    creating, createIssue, resetCreateForm, addNotification,
  ]);

  const handleIssueClick = useCallback((issueId: Id<"issues">) => {
    setDetailIssueId(issueId);
  }, []);

  const handleDeleteRequest = useCallback(() => {
    if (!detailIssueId) return;
    setDeleteConfirmOpen(true);
  }, [detailIssueId]);

  const handleDelete = useCallback(async () => {
    if (!detailIssueId) return;
    try {
      await removeIssue({ issueId: detailIssueId });
      setDetailIssueId(null);
      setDeleteConfirmOpen(false);
      addNotification({
        title: "Issue Deleted",
        message: "The issue has been permanently deleted.",
        type: "success",
      });
    } catch (err) {
      addNotification({
        title: "Failed to Delete Issue",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        type: "error",
      });
    }
  }, [detailIssueId, removeIssue, addNotification]);

  const clearFilters = useCallback(() => {
    setFilterSearch("");
    setFilterStatus("all");
    setFilterClient("all");
    setFilterPriority("all");
  }, []);

  return (
    <PageShell
      className="p-1"
      title="Issues"
      description="Track tasks, bugs, and client deliverables. Board and table share the same filters."
      action={
        <Button
          type="button"
          size="sm"
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-lg shadow-cyan-500/10 gap-1.5"
          onClick={() => openCreateForStatus("todo")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Issue
        </Button>
      }
    >

      {/* ── Metric Summary Cards ───────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Backlog Items</span>
          <p className="text-2xl font-extrabold text-white tabular-nums">
            {issues === undefined ? "—" : metrics.total}
          </p>
          <p className="text-[11px] text-slate-500">Tracked issues across board</p>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active In-Flight</span>
          <p className="text-2xl font-extrabold text-yellow-400 tabular-nums">
            {issues === undefined ? "—" : metrics.open}
          </p>
          <p className="text-[11px] text-slate-500">Todo, In-Progress & Review</p>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Urgent & High Priority</span>
          <p className="text-2xl font-extrabold text-rose-400 tabular-nums">
            {issues === undefined ? "—" : metrics.urgentHigh}
          </p>
          <p className="text-[11px] text-slate-500">Requires immediate attention</p>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completed Items</span>
          <p className="text-2xl font-extrabold text-emerald-400 tabular-nums">
            {issues === undefined ? "—" : metrics.done}
          </p>
          <p className="text-[11px] text-slate-500">Shipped and verified</p>
        </div>
      </div>

      {/* ── Filter & Search Control Bar ───────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0c1222]/80 p-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="search"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search by title, ID, assignee..."
              aria-label="Search issues by title, ID, or assignee"
              className="w-full h-8 pl-8 pr-3 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger aria-label="Filter by status" className="h-8 w-[130px] border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/[0.08]">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger aria-label="Filter by client" className="h-8 w-[130px] border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/[0.08]">
              <SelectItem value="all">All Clients</SelectItem>
              {(clients ?? []).map((c: Doc<"clients">) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
              <SelectItem value="_none">No Client</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger aria-label="Filter by priority" className="h-8 w-[130px] border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-[#0c1222] border-white/[0.08]">
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-cyan-400 hover:underline px-2"
            >
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 border-t border-white/[0.06] pt-2 md:pt-0 md:border-t-0 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={viewMode === "kanban"}
            onClick={() => setViewMode("kanban")}
            className={cn("h-8 px-2.5 text-xs font-medium", viewMode === "kanban" ? "bg-white/10 text-cyan-400" : "text-slate-400")}
          >
            Kanban Board
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={viewMode === "table"}
            onClick={() => setViewMode("table")}
            className={cn("h-8 px-2.5 text-xs font-medium", viewMode === "table" ? "bg-white/10 text-cyan-400" : "text-slate-400")}
          >
            Table View
          </Button>
        </div>
      </div>

      {/* ── View Presentation (Kanban or Table) ───────────── */}
      {viewMode === "kanban" ? (
        <div className="flex h-[calc(100vh-18rem)] gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => {
            const columnIssues = issuesByStatus?.[column.key] ?? [];

            return (
              <div
                key={column.key}
                className="flex w-[290px] min-w-[290px] flex-col rounded-xl border border-white/[0.06] bg-[#0c1222]/50 p-3"
              >
                <div
                  className={cn(
                    "flex items-center justify-between border-t-2 pb-3 pt-1 px-1",
                    column.headerColor,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {column.label}
                    </h3>
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/10 px-1.5 text-[11px] font-bold text-slate-300 tabular-nums">
                      {issuesByStatus === null ? "\u2014" : columnIssues.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCreateForStatus(column.key)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                    title={`Add issue to ${column.label}`}
                    aria-label={`Add issue to ${column.label}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg pt-1 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  {issuesByStatus === null ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-[72px] animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.02]"
                        />
                      ))}
                    </div>
                  ) : columnIssues.length === 0 ? (
                    <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-xs text-slate-600 space-y-1">
                      <span>No issues</span>
                      <button
                        type="button"
                        onClick={() => openCreateForStatus(column.key)}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        + Create
                      </button>
                    </div>
                  ) : (
                    columnIssues.map((issue) => (
                      <IssueCard
                        key={issue._id}
                        issue={issue}
                        clientName={
                          issue.clientId
                            ? clientMap.get(issue.clientId) ?? undefined
                            : undefined
                        }
                        onClick={handleIssueClick}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-white/[0.08] bg-[#0c1222]/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.02] border-b border-white/[0.08] text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredIssues === null ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-8 animate-pulse rounded-md bg-white/[0.04]" />
                      </td>
                    </tr>
                  ))
                ) : filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {activeFilterCount > 0 ? (
                        <div className="space-y-2">
                          <p>No issues match the current filters.</p>
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            Clear filters
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>No issues yet.</p>
                          <button
                            type="button"
                            onClick={() => openCreateForStatus("todo")}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            Create the first issue
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr
                      key={issue._id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open issue ${issue.title}`}
                      onClick={() => handleIssueClick(issue._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleIssueClick(issue._id);
                        }
                      }}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500"
                    >
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          {issue.identifier && <span className="font-mono text-[10px] text-slate-500">{issue.identifier}</span>}
                          <span>{issue.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", PRIORITY_COLORS[issue.priority])}>
                          {issue.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize">{issue.status.replace("_", " ")}</td>
                      <td className="py-3 px-4 text-cyan-400">
                        {issue.clientId ? clientMap.get(issue.clientId) ?? "—" : "—"}
                      </td>
                      <td className="py-3 px-4">{issue.assignee || "Unassigned"}</td>
                      <td className="py-3 px-4 text-slate-400">{issue.dueDate || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Issue Dialog ───────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">New Issue</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-title" className="text-xs text-slate-400">
                Title
              </Label>
              <Input
                id="create-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Issue title..."
                className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-desc" className="text-xs text-slate-400">
                Description
              </Label>
              <Textarea
                id="create-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as Status)}>
                  <SelectTrigger className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Priority</Label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                  <SelectTrigger className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Client</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-slate-300">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    <SelectItem value="_none">None</SelectItem>
                    {(clients ?? []).map((c: Doc<"clients">) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">
                  Assignee
                </Label>
                <Select value={formAssignee} onValueChange={setFormAssignee}>
                  <SelectTrigger className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-slate-300">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    <SelectItem value="_unassigned">Unassigned</SelectItem>
                    {(users ?? [
                      { _id: "dee", name: "Dee" },
                      { _id: "rod", name: "Rod" },
                    ]).map((u) => (
                      <SelectItem key={u._id} value={u.name}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-labels" className="text-xs text-slate-400">
                  Labels
                </Label>
                <Input
                  id="create-labels"
                  value={formLabels}
                  onChange={(e) => setFormLabels(e.target.value)}
                  placeholder="Comma-separated"
                  className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-due" className="text-xs text-slate-400">
                  Due Date
                </Label>
                <Input
                  id="create-due"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-white [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-seridian-600 text-white hover:bg-seridian-500"
              onClick={handleCreate}
              disabled={!formTitle.trim() || creating}
            >
              {creating ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Issue Detail Dialog ───────────────────────────── */}
      <Dialog
        open={detailIssueId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailIssueId(null);
        }}
      >
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-xl">
          {detailIssue ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-white leading-snug">
                      {detailIssue.title}
                    </DialogTitle>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          PRIORITY_COLORS[detailIssue.priority],
                        )}
                      >
                        {detailIssue.priority.toUpperCase()}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-white/10 text-slate-400"
                      >
                        {STATUS_OPTIONS.find((s) => s.value === detailIssue.status)?.label}
                      </Badge>
                      {detailIssue.clientId && clientMap.get(detailIssue.clientId) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-seridian-500/20 text-seridian-400"
                        >
                          {clientMap.get(detailIssue.clientId)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Description</Label>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {detailIssue.description || "No description"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </span>
                    <Select
                      value={detailIssue.status}
                      onValueChange={(v) => {
                        updateIssue({
                          issueId: detailIssue._id,
                          status: v as Status,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Priority
                    </span>
                    <Select
                      value={detailIssue.priority}
                      onValueChange={(v) => {
                        updateIssue({
                          issueId: detailIssue._id,
                          priority: v as Priority,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Assignee
                    </span>
                    <Select
                      value={detailIssue.assignee || "_unassigned"}
                      onValueChange={(v) => {
                        updateIssue({
                          issueId: detailIssue._id,
                          assignee: v === "_unassigned" ? undefined : v,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                        <SelectItem value="_unassigned">Unassigned</SelectItem>
                        {(users ?? [
                          { _id: "dee", name: "Dee" },
                          { _id: "rod", name: "Rod" },
                        ]).map((u) => (
                          <SelectItem key={u._id} value={u.name}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Due Date
                    </span>
                    <p className="text-sm text-slate-300">
                      {detailIssue.dueDate || "None"}
                    </p>
                  </div>
                </div>

                {detailIssue.labels.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Labels
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {detailIssue.labels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detailIssue.identifier && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Identifier
                    </span>
                    <p className="text-sm text-slate-300 font-mono">
                      {detailIssue.identifier}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteRequest}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailIssueId(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="h-48 animate-pulse rounded-lg bg-white/[0.02]" />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Issue</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this issue? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

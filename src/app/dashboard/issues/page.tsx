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
  const createIssue = useMutation(api.issues.create);
  const updateIssue = useMutation(api.issues.update);
  const removeIssue = useMutation(api.issues.remove);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

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
      return true;
    });
  }, [issues, filterStatus, filterClient, filterPriority]);

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
  const activeFilterCount = [filterStatus, filterClient, filterPriority].filter(
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
    setFilterStatus("all");
    setFilterClient("all");
    setFilterPriority("all");
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">Issues</h1>
          {issues && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/5 px-1.5 text-[11px] font-medium text-slate-500 tabular-nums">
              {filteredIssues ? filteredIssues.length : issues.length}
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-seridian-600 text-white hover:bg-seridian-500 gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Issue
        </Button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c1222]/80 p-2">
        <span className="text-xs font-medium text-slate-500 pl-1">Filters</span>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[140px] border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
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
          <SelectTrigger className="h-8 w-[140px] border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
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
          <SelectTrigger className="h-8 w-[140px] border-white/[0.08] bg-white/[0.03] text-xs text-slate-300">
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
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-1"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ── Kanban Board ──────────────────────────────────── */}
      <div className="flex h-[calc(100vh-14rem)] gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnIssues = issuesByStatus?.[column.key] ?? [];

          return (
            <div
              key={column.key}
              className="flex w-[280px] min-w-[280px] flex-col"
            >
              <div
                className={cn(
                  "flex items-center justify-between border-t-2 bg-transparent px-1 pb-3 pt-3",
                  column.headerColor,
                )}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-slate-400">
                    {column.label}
                  </h3>
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/5 px-1.5 text-[11px] font-medium text-slate-500 tabular-nums">
                    {issuesByStatus === null ? "\u2014" : columnIssues.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-lg pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5">
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
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.06] text-xs text-slate-600">
                    No issues
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
                <Label htmlFor="create-assignee" className="text-xs text-slate-400">
                  Assignee
                </Label>
                <Input
                  id="create-assignee"
                  value={formAssignee}
                  onChange={(e) => setFormAssignee(e.target.value)}
                  placeholder="Optional"
                  className="h-9 border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-slate-600"
                />
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
                    <p className="text-sm text-slate-300">
                      {detailIssue.assignee || "Unassigned"}
                    </p>
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
    </div>
  );
}

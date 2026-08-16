"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bytecats/ui-kit";
import { cn } from "@/lib/utils";
import { toastMutationError, toastMutationSuccess } from "@/lib/mutationToast";
import { ROUTES } from "@/lib/routes";
import {
  BackLink,
  EmptyState,
  LoadingBlock,
  PageShell,
  StatusBadge,
} from "@/components/dashboard/kit";

const PRIORITY_CONFIG = {
  urgent: { color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Urgent" },
  high: { color: "bg-orange-500/15 text-orange-400 border-orange-500/20", label: "High" },
  medium: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "Medium" },
  low: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Low" },
  none: { color: "bg-slate-500/15 text-slate-400 border-slate-500/20", label: "None" },
} as const;

const STATUS_CONFIG = {
  backlog: { color: "bg-slate-500/15 text-slate-400 border-slate-500/20", label: "Backlog" },
  todo: { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Todo" },
  in_progress: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", label: "In Progress" },
  in_review: { color: "bg-purple-500/15 text-purple-400 border-purple-500/20", label: "In Review" },
  done: { color: "bg-green-500/15 text-green-400 border-green-500/20", label: "Done" },
} as const;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = use(params);
  const issue = useQuery(api.issues.get, { issueId: issueId as Id<"issues"> });
  const client = useQuery(
    api.clients.get,
    issue?.clientId ? { clientId: issue.clientId } : "skip",
  );
  const clients = useQuery(api.clients.list, {});

  const updateIssue = useMutation(api.issues.update);
  const [editOpen, setEditOpen] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<string>("todo");
  const [editPriority, setEditPriority] = useState<string>("none");
  const [editClientId, setEditClientId] = useState<string>("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editLabelsText, setEditLabelsText] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit() {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditStatus(issue.status);
    setEditPriority(issue.priority);
    setEditClientId(issue.clientId ?? "");
    setEditAssignee(issue.assignee ?? "");
    setEditDueDate(issue.dueDate ?? "");
    setEditLabelsText(issue.labels.join(", "));
    setEditOpen(true);
  }

  async function handleSave() {
    if (!issue) return;
    setSaving(true);
    try {
      const labels = editLabelsText
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      await updateIssue({
        issueId: issue._id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus as "backlog" | "todo" | "in_progress" | "in_review" | "done",
        priority: editPriority as "urgent" | "high" | "medium" | "low" | "none",
        clientId: editClientId ? (editClientId as Id<"clients">) : null,
        assignee: editAssignee.trim() || undefined,
        dueDate: editDueDate || undefined,
        labels,
      });
      setEditOpen(false);
      toastMutationSuccess("Issue updated");
    } catch (err) {
      toastMutationError(err, "Failed to save issue");
    } finally {
      setSaving(false);
    }
  }

  if (issue === undefined) {
    return <LoadingBlock rows={4} withHeader label="Loading issue" />;
  }

  if (issue === null) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Issue not found"
          description="This issue may have been deleted or the link is invalid."
          action={<BackLink href={ROUTES.dashboard.issues} label="Back to Issues" />}
        />
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[issue.priority];
  const status = STATUS_CONFIG[issue.status];

  async function handleQuickStatus(newStatus: "backlog" | "todo" | "in_progress" | "in_review" | "done") {
    if (!issue) return;
    try {
      await updateIssue({
        issueId: issue._id,
        status: newStatus,
      });
      toastMutationSuccess(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (err) {
      toastMutationError(err, "Failed to update status");
    }
  }

  return (
    <PageShell
      title={issue.title}
      description="Issue details, status, and linked client context."
      badge={<StatusBadge tone={issue.status === "done" ? "success" : "info"}>{status.label}</StatusBadge>}
      action={
        <Button
          type="button"
          size="sm"
          onClick={openEdit}
          className="bg-cyan-500 text-xs font-semibold text-black hover:bg-cyan-400"
        >
          Edit Issue
        </Button>
      }
    >
      <BackLink href={ROUTES.dashboard.issues} label="Back to Issues Board" />

      {/* Main Issue Card Banner */}
      <div className="space-y-6 rounded-xl border border-white/[0.08] bg-[#0c1222]/90 p-6">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "inline-flex h-8 min-w-[32px] shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-bold tabular-nums",
              priority.color,
            )}
          >
            {issue.priority === "urgent"
              ? "!!"
              : issue.priority === "high"
                ? "!"
                : issue.priority === "medium"
                  ? "~"
                  : issue.priority === "low"
                    ? "\u2193"
                    : "\u2014"}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <Badge
              variant="secondary"
              className={cn("text-xs border px-2.5 py-0.5 font-semibold", priority.color)}
            >
              {priority.label}
            </Badge>
            {issue.identifier && (
              <p className="text-xs font-mono text-cyan-400">{issue.identifier}</p>
            )}
          </div>
        </div>

        {/* Quick Status Workflow Action Triggers */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Move Status:</span>
          {issue.status !== "backlog" && (
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickStatus("backlog")} className="text-xs border-white/10 h-7 text-slate-300">
              Backlog
            </Button>
          )}
          {issue.status !== "todo" && (
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickStatus("todo")} className="text-xs border-white/10 h-7 text-slate-300">
              To Todo
            </Button>
          )}
          {issue.status !== "in_progress" && (
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickStatus("in_progress")} className="text-xs border-yellow-500/20 bg-yellow-500/10 text-yellow-300 h-7">
              In Progress
            </Button>
          )}
          {issue.status !== "in_review" && (
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickStatus("in_review")} className="text-xs border-purple-500/20 bg-purple-500/10 text-purple-300 h-7">
              In Review
            </Button>
          )}
          {issue.status !== "done" && (
            <Button type="button" variant="outline" size="sm" onClick={() => handleQuickStatus("done")} className="text-xs border-emerald-500/20 bg-emerald-500/10 text-emerald-300 h-7">
              Mark Done
            </Button>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-white/[0.06]">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Priority Level</p>
            <Badge variant="secondary" className={cn("text-[10px] px-2 py-0.5 border font-semibold", priority.color)}>
              {priority.label}
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assignee</p>
            <p className="text-xs font-semibold text-slate-200">{issue.assignee || "Unassigned"}</p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Associated Client</p>
            {client ? (
              <Link
                href={`/dashboard/clients/${client._id}`}
                className="text-xs font-semibold text-cyan-400 hover:underline block truncate"
              >
                {client.name}
              </Link>
            ) : (
              <p className="text-xs text-slate-500">None</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Due Date</p>
            <p className="text-xs font-semibold text-slate-200">{issue.dueDate ? formatDate(issue.dueDate) : "None"}</p>
          </div>
        </div>

        {issue.labels.length > 0 && (
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Labels & Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/10"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-white/[0.06] space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Issue Description</p>
          <div className="whitespace-pre-wrap rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 text-sm leading-relaxed text-slate-200">
            {issue.description || "No description provided."}
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#0c1222] border-white/[0.08] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs text-slate-400">Title *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-seridian-500/40 focus:ring-seridian-500/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-slate-200 focus:border-seridian-500/40 focus:ring-seridian-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-slate-200 focus:border-seridian-500/40 focus:ring-seridian-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Client</Label>
                <Select value={editClientId} onValueChange={setEditClientId}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-slate-200 focus:border-seridian-500/40 focus:ring-seridian-500/20">
                    <SelectValue placeholder="No client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c1222] border-white/[0.08]">
                    {clients === undefined ? (
                      <SelectItem value="__loading" disabled>Loading...</SelectItem>
                    ) : clients.length === 0 ? (
                      <SelectItem value="__empty" disabled>No clients</SelectItem>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-assignee" className="text-xs text-slate-400">Assignee</Label>
                <Input
                  id="edit-assignee"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  placeholder="Name"
                  className="bg-white/[0.03] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-seridian-500/40 focus:ring-seridian-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-due" className="text-xs text-slate-400">Due Date</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] text-slate-200 focus:border-seridian-500/40 focus:ring-seridian-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-labels" className="text-xs text-slate-400">Labels (comma-separated)</Label>
                <Input
                  id="edit-labels"
                  value={editLabelsText}
                  onChange={(e) => setEditLabelsText(e.target.value)}
                  placeholder="frontend, urgent, bug"
                  className="bg-white/[0.03] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-seridian-500/40 focus:ring-seridian-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs text-slate-400">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                className="bg-white/[0.03] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-seridian-500/40 focus:ring-seridian-500/20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving || !editTitle.trim()}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

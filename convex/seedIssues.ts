import { mutation } from "./_generated/server";
import { v } from "convex/values";

/** Seed audit findings and roadmap action items into Convex issues table */
export const seedDashboardAuditIssues = mutation({
  args: {},
  handler: async (ctx) => {
    const auditIssues = [
      {
        title: "Audit Finding: Implement Audit Log Viewer in Settings",
        description: "Create an immutable Audit Log viewer table in Settings > General to log secret updates, user revocations, and Linear manual sync triggers.",
        status: "done" as const,
        priority: "high" as const,
        labels: ["Audit", "Settings", "Governance"],
        assignee: "Rod",
        order: 100,
      },
      {
        title: "Audit Finding: Add Drag & Drop Proposal Stage Pipeline",
        description: "Enhance /dashboard/proposals with Kanban stage columns (Draft, Sent, Accepted, Rejected) and drag-and-drop state updates.",
        status: "todo" as const,
        priority: "high" as const,
        labels: ["Audit", "Proposals", "UX"],
        assignee: "D",
        order: 101,
      },
      {
        title: "Audit Finding: Client Relationship Visual Graph Node View",
        description: "Add an interactive Mermaid/Canvas node visualization graph on client dossiers (/dashboard/clients/[clientId]) showing employee hierarchy and downstream client relationships.",
        status: "backlog" as const,
        priority: "medium" as const,
        labels: ["Audit", "Clients", "BI"],
        assignee: "Rod",
        order: 102,
      },
      {
        title: "Audit Finding: Global Notification Center Toast Dispatcher",
        description: "Wire real-time Toast dispatches across the dashboard for Linear sync completion, new bookings, and agent mention responses.",
        status: "in_progress" as const,
        priority: "high" as const,
        labels: ["Audit", "System", "Notifications"],
        assignee: "D",
        order: 103,
      },
      {
        title: "Audit Finding: Multi-File Batch Drag & Drop Uploader",
        description: "Upgrade /dashboard/files with multi-file drag-and-drop upload zone, client tagging, and MIME type preview cards.",
        status: "backlog" as const,
        priority: "medium" as const,
        labels: ["Audit", "Files", "Storage"],
        assignee: "Rod",
        order: 104,
      },
    ];

    const createdIds = [];
    for (const issue of auditIssues) {
      // Check if already exists by title
      const existing = await ctx.db
        .query("issues")
        .filter((q) => q.eq(q.field("title"), issue.title))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("issues", {
          ...issue,
          clientId: undefined,
          linearId: undefined,
          dueDate: undefined,
        });
        createdIds.push(id);
      } else if (issue.title === "Audit Finding: Implement Audit Log Viewer in Settings") {
        await ctx.db.patch(existing._id, { status: "done" });
      }
    }

    return { success: true, seededCount: createdIds.length };
  },
});

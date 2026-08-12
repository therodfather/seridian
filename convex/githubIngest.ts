import { query } from "./_generated/server";
import { v } from "convex/values";

export const getGitHubIssues = query({
  args: {
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.state) {
      return await ctx.db
        .query("githubIssues")
        .withIndex("by_state", (q) => q.eq("state", args.state!))
        .order("desc")
        .take(500);
    }
    return await ctx.db
      .query("githubIssues")
      .order("desc")
      .take(500);
  },
});

export const getGitHubProjects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("githubProjects")
      .order("desc")
      .take(100);
  },
});

export const getGitHubStats = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("githubIssues").take(500);
    const projects = await ctx.db.query("githubProjects").take(500);

    const issuesByState: Record<string, number> = {};
    for (const issue of issues) {
      issuesByState[issue.state] = (issuesByState[issue.state] ?? 0) + 1;
    }

    const projectsByState: Record<string, number> = {};
    for (const project of projects) {
      projectsByState[project.state] =
        (projectsByState[project.state] ?? 0) + 1;
    }

    let lastIssueSync: number | null = null;
    const issueMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastGitHubIssueSync"))
      .unique();
    if (issueMeta) {
      lastIssueSync = parseInt(issueMeta.value, 10);
    }

    let lastProjectSync: number | null = null;
    const projectMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastGitHubProjectSync"))
      .unique();
    if (projectMeta) {
      lastProjectSync = parseInt(projectMeta.value, 10);
    }

    let lastFullSync: number | null = null;
    const fullMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastGitHubFullSync"))
      .unique();
    if (fullMeta) {
      lastFullSync = parseInt(fullMeta.value, 10);
    }

    return {
      totalIssues: issues.length,
      totalProjects: projects.length,
      issuesByState,
      projectsByState,
      lastIssueSync,
      lastProjectSync,
      lastFullSync,
    };
  },
});

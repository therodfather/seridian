import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const getLinearTeams = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      return await ctx.db
        .query("linearTeams")
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("linearTeams").order("desc").take(500);
  },
});

export const getLinearProjects = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      return await ctx.db
        .query("linearProjects")
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("linearProjects").order("desc").take(500);
  },
});

export const getLinearLabels = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      return await ctx.db
        .query("linearLabels")
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("linearLabels").order("desc").take(500);
  },
});

export const getLinearUsers = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      return await ctx.db
        .query("linearUsers")
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("linearUsers").order("desc").take(500);
  },
});

export const getLinearStats = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").take(500);
    const teams = await ctx.db.query("linearTeams").take(500);
    const projects = await ctx.db.query("linearProjects").take(500);
    const labels = await ctx.db.query("linearLabels").take(500);
    const users = await ctx.db.query("linearUsers").take(500);

    const lastSyncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastSyncTime"))
      .unique();

    const lastIssuesSyncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastIssuesSync"))
      .unique();

    const lastTeamsSyncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastTeamsSync"))
      .unique();

    const lastProjectsSyncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastProjectsSync"))
      .unique();

    const lastLabelsSyncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastLabelsSync"))
      .unique();

    const lastUsersSyncMeta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastUsersSync"))
      .unique();

    return {
      counts: {
        issues: issues.length,
        teams: teams.length,
        projects: projects.length,
        labels: labels.length,
        users: users.length,
      },
      lastSync: {
        all: lastSyncMeta ? Number(lastSyncMeta.value) : null,
        issues: lastIssuesSyncMeta ? Number(lastIssuesSyncMeta.value) : null,
        teams: lastTeamsSyncMeta ? Number(lastTeamsSyncMeta.value) : null,
        projects: lastProjectsSyncMeta
          ? Number(lastProjectsSyncMeta.value)
          : null,
        labels: lastLabelsSyncMeta ? Number(lastLabelsSyncMeta.value) : null,
        users: lastUsersSyncMeta ? Number(lastUsersSyncMeta.value) : null,
      },
    };
  },
});

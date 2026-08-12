import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const PAGE_SIZE = 100;

type LinearStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
type LinearPriority = "urgent" | "high" | "medium" | "low" | "none";

const STATUS_MAP: Record<string, LinearStatus> = {
  backlog: "backlog",
  todo: "todo",
  "in progress": "in_progress",
  "in review": "in_review",
  done: "done",
  completed: "done",
  canceled: "done",
  cancelled: "done",
  duplicate: "done",
};

const PRIORITY_MAP: Record<number, LinearPriority> = {
  0: "none",
  1: "urgent",
  2: "high",
  3: "medium",
  4: "low",
};

function mapStatus(name: string): LinearStatus {
  return STATUS_MAP[name.toLowerCase()] ?? "todo";
}

function mapPriority(p: number): LinearPriority {
  return PRIORITY_MAP[p] ?? "none";
}

type LinearGraphQLResponse<T> = {
  data?: T;
  errors?: { message?: string }[];
};

type PaginatedField<T> = {
  pageInfo: { hasNextPage: boolean; endCursor: string };
  nodes: T[];
};

async function linearFetch<T>(
  apiKey: string,
  query: string,
  variables: Record<string, string | null> = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error("Could not reach Linear API");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Linear rejected the API key");
    }
    if (res.status === 429) {
      throw new Error("Linear rate limit reached");
    }
    throw new Error(`Linear returned HTTP ${res.status}`);
  }

  let json: LinearGraphQLResponse<T>;
  try {
    json = (await res.json()) as LinearGraphQLResponse<T>;
  } catch {
    throw new Error("Linear returned an unreadable response");
  }

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors
      .map((e) => e.message ?? "Linear error")
      .join("; ");
    throw new Error(`Linear GraphQL errors: ${msg}`);
  }

  if (!json.data) {
    throw new Error("Unexpected response structure from Linear");
  }

  return json.data;
}

async function paginateAll<T>(
  apiKey: string,
  queryStr: string,
  dataKey: string,
  variables: Record<string, string | null> = {},
): Promise<T[]> {
  const allItems: T[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const vars: Record<string, string | null> = { ...variables, after: cursor };
    const data: Record<string, PaginatedField<T> | undefined> =
      await linearFetch<Record<string, PaginatedField<T> | undefined>>(
        apiKey,
        queryStr,
        vars,
      );

    const field: PaginatedField<T> | undefined = data[dataKey];
    if (!field) {
      throw new Error(`Unexpected response structure: missing ${dataKey}`);
    }

    for (const node of field.nodes) {
      allItems.push(node);
    }

    hasNextPage = field.pageInfo.hasNextPage;
    cursor = field.pageInfo.endCursor;
  }

  return allItems;
}

type LinearIssueNode = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  state: { name: string };
  priority: number;
  assignee: { name: string } | null;
  labels: { nodes: { name: string }[] } | null;
  createdAt: string;
  updatedAt: string;
};

type MappedIssue = {
  linearId: string;
  identifier: string;
  title: string;
  description: string;
  status: LinearStatus;
  priority: LinearPriority;
  assignee: string;
  labels: string[];
  linearCreatedAt: string;
  linearUpdatedAt: string;
};

function transformIssue(node: LinearIssueNode): MappedIssue {
  return {
    linearId: node.id,
    identifier: node.identifier,
    title: node.title,
    description: node.description ?? "",
    status: mapStatus(node.state.name),
    priority: mapPriority(node.priority),
    assignee: node.assignee?.name ?? "",
    labels: node.labels?.nodes?.map((l) => l.name) ?? [],
    linearCreatedAt: node.createdAt,
    linearUpdatedAt: node.updatedAt,
  };
}

const ISSUES_QUERY = `
  query SyncLinearIssues($after: String) {
    issues(first: ${PAGE_SIZE}, after: $after, orderBy: updatedAt) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        identifier
        title
        description
        state { name }
        priority
        assignee { name }
        labels { nodes { name } }
        createdAt
        updatedAt
      }
    }
  }
`;

const ISSUES_QUERY_WITH_TEAM = `
  query SyncLinearIssues($after: String, $teamId: String!) {
    issues(
      first: ${PAGE_SIZE}
      after: $after
      orderBy: updatedAt
      filter: { team: { id: { eq: $teamId } } }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        identifier
        title
        description
        state { name }
        priority
        assignee { name }
        labels { nodes { name } }
        createdAt
        updatedAt
      }
    }
  }
`;

const TEAMS_QUERY = `
  query SyncLinearTeams($after: String) {
    teams(first: ${PAGE_SIZE}, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        key
      }
    }
  }
`;

const PROJECTS_QUERY = `
  query SyncLinearProjects($after: String) {
    projects(first: ${PAGE_SIZE}, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        description
        state
      }
    }
  }
`;

const LABELS_QUERY = `
  query SyncLinearLabels($after: String) {
    workflowStates(first: ${PAGE_SIZE}, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        color
      }
    }
  }
`;

const USERS_QUERY = `
  query SyncLinearUsers($after: String) {
    users(first: ${PAGE_SIZE}, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        email
        avatarUrl
      }
    }
  }
`;

type LinearTeamNode = { id: string; name: string; key: string };
type LinearProjectNode = {
  id: string;
  name: string;
  description: string | null;
  state: string;
};
type LinearLabelNode = { id: string; name: string; color: string | null };
type LinearUserNode = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

async function fetchLinearIssues(
  apiKey: string,
  teamId?: string,
): Promise<MappedIssue[]> {
  const queryStr = teamId ? ISSUES_QUERY_WITH_TEAM : ISSUES_QUERY;
  const variables: Record<string, string | null> = teamId
    ? { teamId }
    : {};
  const nodes = await paginateAll<LinearIssueNode>(
    apiKey,
    queryStr,
    "issues",
    variables,
  );
  return nodes.map(transformIssue);
}

async function fetchLinearTeams(apiKey: string): Promise<LinearTeamNode[]> {
  return paginateAll<LinearTeamNode>(apiKey, TEAMS_QUERY, "teams");
}

async function fetchLinearProjects(
  apiKey: string,
): Promise<LinearProjectNode[]> {
  return paginateAll<LinearProjectNode>(apiKey, PROJECTS_QUERY, "projects");
}

async function fetchLinearLabels(apiKey: string): Promise<LinearLabelNode[]> {
  return paginateAll<LinearLabelNode>(apiKey, LABELS_QUERY, "workflowStates");
}

async function fetchLinearUsers(apiKey: string): Promise<LinearUserNode[]> {
  return paginateAll<LinearUserNode>(apiKey, USERS_QUERY, "users");
}

function getApiKey(): string {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured");
  }
  return apiKey;
}

const issuePayloadValidator = v.object({
  linearId: v.string(),
  identifier: v.string(),
  title: v.string(),
  description: v.string(),
  status: v.union(
    v.literal("backlog"),
    v.literal("todo"),
    v.literal("in_progress"),
    v.literal("in_review"),
    v.literal("done"),
  ),
  priority: v.union(
    v.literal("urgent"),
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
    v.literal("none"),
  ),
  assignee: v.string(),
  labels: v.array(v.string()),
  linearCreatedAt: v.string(),
  linearUpdatedAt: v.string(),
});

export const upsertIssues = internalMutation({
  args: {
    issues: v.array(issuePayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;

    for (const issue of args.issues) {
      const existing = await ctx.db
        .query("issues")
        .withIndex("by_linearId", (q) => q.eq("linearId", issue.linearId))
        .unique();

      const now = Date.now();

      if (existing) {
        await ctx.db.patch(existing._id, {
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          priority: issue.priority,
          assignee: issue.assignee,
          labels: issue.labels,
          linearCreatedAt: issue.linearCreatedAt,
          linearUpdatedAt: issue.linearUpdatedAt,
          lastSyncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("issues", {
          linearId: issue.linearId,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          priority: issue.priority,
          assignee: issue.assignee,
          labels: issue.labels,
          linearCreatedAt: issue.linearCreatedAt,
          linearUpdatedAt: issue.linearUpdatedAt,
          lastSyncedAt: now,
          order: 0,
        });
        created++;
      }
    }

    return { created, updated, total: args.issues.length };
  },
});

const teamPayloadValidator = v.object({
  linearId: v.string(),
  name: v.string(),
  key: v.string(),
});

export const upsertTeams = internalMutation({
  args: {
    teams: v.array(teamPayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;

    for (const team of args.teams) {
      const existing = await ctx.db
        .query("linearTeams")
        .withIndex("by_linearId", (q) => q.eq("linearId", team.linearId))
        .unique();

      const now = Date.now();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: team.name,
          key: team.key,
          syncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("linearTeams", {
          linearId: team.linearId,
          name: team.name,
          key: team.key,
          syncedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: args.teams.length };
  },
});

const projectPayloadValidator = v.object({
  linearId: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  state: v.string(),
  teamId: v.optional(v.string()),
});

export const upsertProjects = internalMutation({
  args: {
    projects: v.array(projectPayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;

    for (const project of args.projects) {
      const existing = await ctx.db
        .query("linearProjects")
        .withIndex("by_linearId", (q) =>
          q.eq("linearId", project.linearId),
        )
        .unique();

      const now = Date.now();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: project.name,
          description: project.description,
          state: project.state,
          teamId: project.teamId,
          syncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("linearProjects", {
          linearId: project.linearId,
          name: project.name,
          description: project.description,
          state: project.state,
          teamId: project.teamId,
          syncedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: args.projects.length };
  },
});

const labelPayloadValidator = v.object({
  linearId: v.string(),
  name: v.string(),
  color: v.optional(v.string()),
});

export const upsertLabels = internalMutation({
  args: {
    labels: v.array(labelPayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;

    for (const label of args.labels) {
      const existing = await ctx.db
        .query("linearLabels")
        .withIndex("by_linearId", (q) => q.eq("linearId", label.linearId))
        .unique();

      const now = Date.now();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: label.name,
          color: label.color,
          syncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("linearLabels", {
          linearId: label.linearId,
          name: label.name,
          color: label.color,
          syncedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: args.labels.length };
  },
});

const userPayloadValidator = v.object({
  linearId: v.string(),
  name: v.string(),
  email: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});

export const upsertUsers = internalMutation({
  args: {
    users: v.array(userPayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;

    for (const user of args.users) {
      const existing = await ctx.db
        .query("linearUsers")
        .withIndex("by_linearId", (q) => q.eq("linearId", user.linearId))
        .unique();

      const now = Date.now();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          syncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("linearUsers", {
          linearId: user.linearId,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          syncedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: args.users.length };
  },
});

export const updateSyncMeta = internalMutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("syncMeta", {
        key: args.key,
        value: args.value,
      });
    }
  },
});

export const syncLinearIssues = action({
  args: {
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = getApiKey();
    const issues = await fetchLinearIssues(apiKey, args.teamId);
    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.linearSync.upsertIssues, { issues });
    await ctx.runMutation(internal.linearSync.updateSyncMeta, {
      key: "lastIssuesSync",
      value: Date.now().toString(),
    });
    return result;
  },
});

export const syncLinearTeams = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = getApiKey();
    const teams = await fetchLinearTeams(apiKey);
    const mapped = teams.map((t) => ({
      linearId: t.id,
      name: t.name,
      key: t.key,
    }));
    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.linearSync.upsertTeams, {
        teams: mapped,
      });
    await ctx.runMutation(internal.linearSync.updateSyncMeta, {
      key: "lastTeamsSync",
      value: Date.now().toString(),
    });
    return result;
  },
});

export const syncLinearProjects = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = getApiKey();
    const projects = await fetchLinearProjects(apiKey);
    const mapped = projects.map((p) => ({
      linearId: p.id,
      name: p.name,
      description: p.description ?? undefined,
      state: p.state,
    }));
    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.linearSync.upsertProjects, {
        projects: mapped,
      });
    await ctx.runMutation(internal.linearSync.updateSyncMeta, {
      key: "lastProjectsSync",
      value: Date.now().toString(),
    });
    return result;
  },
});

export const syncLinearLabels = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = getApiKey();
    const labels = await fetchLinearLabels(apiKey);
    const mapped = labels.map((l) => ({
      linearId: l.id,
      name: l.name,
      color: l.color ?? undefined,
    }));
    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.linearSync.upsertLabels, {
        labels: mapped,
      });
    await ctx.runMutation(internal.linearSync.updateSyncMeta, {
      key: "lastLabelsSync",
      value: Date.now().toString(),
    });
    return result;
  },
});

export const syncLinearUsers = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = getApiKey();
    const users = await fetchLinearUsers(apiKey);
    const mapped = users.map((u) => ({
      linearId: u.id,
      name: u.name,
      email: u.email ?? undefined,
      avatarUrl: u.avatarUrl ?? undefined,
    }));
    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.linearSync.upsertUsers, {
        users: mapped,
      });
    await ctx.runMutation(internal.linearSync.updateSyncMeta, {
      key: "lastUsersSync",
      value: Date.now().toString(),
    });
    return result;
  },
});

export const syncAllLinear = action({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, { created: number; updated: number; total: number }> = {};

    results.issues = await ctx.runAction(api.linearSync.syncLinearIssues, {});
    results.teams = await ctx.runAction(api.linearSync.syncLinearTeams, {});
    results.projects = await ctx.runAction(
      api.linearSync.syncLinearProjects,
      {},
    );
    results.labels = await ctx.runAction(
      api.linearSync.syncLinearLabels,
      {},
    );
    results.users = await ctx.runAction(
      api.linearSync.syncLinearUsers,
      {},
    );

    await ctx.runMutation(internal.linearSync.updateSyncMeta, {
      key: "lastSyncTime",
      value: Date.now().toString(),
    });

    return results;
  },
});

export const getLinearIssues = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getLastSyncTime = query({
  args: {},
  handler: async (ctx) => {
    const meta = await ctx.db
      .query("syncMeta")
      .withIndex("by_key", (q) => q.eq("key", "lastSyncTime"))
      .unique();
    return meta ? meta.value : null;
  },
});

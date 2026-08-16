import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: { name: string }[];
  assignee: { login: string } | null;
  project_id: number | null;
  created_at: string;
  updated_at: string;
};

function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

function extractIssueData(raw: GitHubIssue) {
  return {
    githubId: raw.id,
    number: raw.number,
    title: raw.title,
    body: raw.body ?? undefined,
    state: raw.state,
    labels: raw.labels.map((l) => l.name),
    assignee: raw.assignee?.login ?? undefined,
    projectId: raw.project_id ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

async function fetchGitHubIssues(
  token: string,
  repo: string,
): Promise<
  { githubId: number; number: number; title: string; body: string | undefined; state: string; labels: string[]; assignee: string | undefined; projectId: number | undefined; createdAt: string; updatedAt: string }[]
> {
  const allIssues: {
    githubId: number;
    number: number;
    title: string;
    body: string | undefined;
    state: string;
    labels: string[];
    assignee: string | undefined;
    projectId: number | undefined;
    createdAt: string;
    updatedAt: string;
  }[] = [];

  let url: string | null = `${GITHUB_API_URL}/repos/${repo}/issues?state=all&per_page=100`;

  while (url) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch {
      throw new Error("Could not reach GitHub API");
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("GitHub rejected the token");
      }
      if (res.status === 404) {
        throw new Error(`Repository ${repo} not found`);
      }
      if (res.status === 422) {
        throw new Error("GitHub validation error");
      }
      throw new Error(`GitHub returned HTTP ${res.status}`);
    }

    let json: GitHubIssue[];
    try {
      json = (await res.json()) as GitHubIssue[];
    } catch {
      throw new Error("GitHub returned an unreadable response");
    }

    for (const raw of json) {
      allIssues.push(extractIssueData(raw));
    }

    url = parseLinkHeader(res.headers.get("link"));
  }

  return allIssues;
}

async function fetchGitHubProjects(
  token: string,
  login: string,
): Promise<
  { githubId: string; number: number; title: string; description: string | undefined; state: string }[]
> {
  const allProjects: {
    githubId: string;
    number: number;
    title: string;
    description: string | undefined;
    state: string;
  }[] = [];

  // Classic Projects (organization.projects) was sunset by GitHub in 2024 —
  // this uses Projects v2 instead. therodfather/seridian's board is a user
  // project (github.com/users/<login>/projects/N), so `user(login)`, not
  // `organization(login)`.
  const PROJECTS_QUERY = `
    query FetchProjects($login: String!, $cursor: String) {
      user(login: $login) {
        projectsV2(first: 100, after: $cursor) {
          nodes {
            id
            number
            title
            shortDescription
            closed
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    let res: Response;
    try {
      res = await fetch(GITHUB_GRAPHQL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: PROJECTS_QUERY,
          variables: { login, cursor },
        }),
      });
    } catch {
      throw new Error("Could not reach GitHub GraphQL API");
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("GitHub rejected the token for GraphQL");
      }
      throw new Error(`GitHub GraphQL returned HTTP ${res.status}`);
    }

    let json: {
      data?: {
        user?: {
          projectsV2: {
            nodes: Array<{
              id: string;
              number: number;
              title: string;
              shortDescription: string | null;
              closed: boolean;
            }>;
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        };
      };
      errors?: { message?: string }[];
    };
    try {
      json = await res.json();
    } catch {
      throw new Error("GitHub returned an unreadable GraphQL response");
    }

    if (json.errors && json.errors.length > 0) {
      const msg = json.errors
        .map((e) => e.message ?? "GitHub error")
        .join("; ");
      throw new Error(`GitHub GraphQL errors: ${msg}`);
    }

    const projects = json.data?.user?.projectsV2;
    if (!projects) {
      throw new Error("Unexpected response structure from GitHub");
    }

    for (const node of projects.nodes) {
      allProjects.push({
        githubId: node.id,
        number: node.number,
        title: node.title,
        description: node.shortDescription ?? undefined,
        state: node.closed ? "closed" : "open",
      });
    }

    hasNextPage = projects.pageInfo.hasNextPage;
    cursor = projects.pageInfo.endCursor ?? null;
  }

  return allProjects;
}

const issuePayloadValidator = v.object({
  githubId: v.number(),
  number: v.number(),
  title: v.string(),
  body: v.optional(v.string()),
  state: v.string(),
  labels: v.array(v.string()),
  assignee: v.optional(v.string()),
  projectId: v.optional(v.number()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const upsertGitHubIssues = internalMutation({
  args: {
    issues: v.array(issuePayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;
    const now = Date.now();

    for (const issue of args.issues) {
      const existing = await ctx.db
        .query("githubIssues")
        .withIndex("by_githubId", (q) => q.eq("githubId", issue.githubId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: issue.labels,
          assignee: issue.assignee,
          projectId: issue.projectId,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          syncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("githubIssues", {
          githubId: issue.githubId,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: issue.labels,
          assignee: issue.assignee,
          projectId: issue.projectId,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          syncedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: args.issues.length };
  },
});

const projectPayloadValidator = v.object({
  githubId: v.string(),
  number: v.number(),
  title: v.string(),
  description: v.optional(v.string()),
  state: v.string(),
});

export const upsertGitHubProjects = internalMutation({
  args: {
    projects: v.array(projectPayloadValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;
    const now = Date.now();

    for (const project of args.projects) {
      const existing = await ctx.db
        .query("githubProjects")
        .withIndex("by_githubId", (q) =>
          q.eq("githubId", project.githubId),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          number: project.number,
          title: project.title,
          description: project.description,
          state: project.state,
          syncedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("githubProjects", {
          githubId: project.githubId,
          number: project.number,
          title: project.title,
          description: project.description,
          state: project.state,
          syncedAt: now,
        });
        created++;
      }
    }

    return { created, updated, total: args.projects.length };
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

export const syncGitHubIssues = action({
  args: {
    repo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not configured");
    }

    const repo = args.repo ?? process.env.GITHUB_REPO ?? "therodfather/seridian";

    const issues = await fetchGitHubIssues(token, repo);

    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.githubSync.upsertGitHubIssues, {
        issues,
      });

    await ctx.runMutation(internal.githubSync.updateSyncMeta, {
      key: "lastGitHubIssueSync",
      value: Date.now().toString(),
    });

    return result;
  },
});

export const syncGitHubProjects = action({
  args: {
    org: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not configured");
    }

    const org = args.org ?? "therodfather";

    const projects = await fetchGitHubProjects(token, org);

    const result: { created: number; updated: number; total: number } =
      await ctx.runMutation(internal.githubSync.upsertGitHubProjects, {
        projects,
      });

    await ctx.runMutation(internal.githubSync.updateSyncMeta, {
      key: "lastGitHubProjectSync",
      value: Date.now().toString(),
    });

    return result;
  },
});

type SyncResult = { created: number; updated: number; total: number };

export const syncAllGitHub = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    issues: SyncResult;
    projects: SyncResult;
  }> => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not configured");
    }

    const repo = process.env.GITHUB_REPO ?? "therodfather/seridian";
    const org = "therodfather";

    const issues = await fetchGitHubIssues(token, repo);
    const issueResult: SyncResult = await ctx.runMutation(
      internal.githubSync.upsertGitHubIssues,
      { issues },
    );

    await ctx.runMutation(internal.githubSync.updateSyncMeta, {
      key: "lastGitHubIssueSync",
      value: Date.now().toString(),
    });

    const projects = await fetchGitHubProjects(token, org);
    const projectResult: SyncResult = await ctx.runMutation(
      internal.githubSync.upsertGitHubProjects,
      { projects },
    );

    await ctx.runMutation(internal.githubSync.updateSyncMeta, {
      key: "lastGitHubProjectSync",
      value: Date.now().toString(),
    });

    await ctx.runMutation(internal.githubSync.updateSyncMeta, {
      key: "lastGitHubFullSync",
      value: Date.now().toString(),
    });

    return {
      issues: issueResult,
      projects: projectResult,
    };
  },
});

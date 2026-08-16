/**
 * Bidirectional sync between the local kanban (`issues` table) and a real
 * GitHub Projects v2 board — GitHub is ground truth. Pull overwrites local
 * title/description/status from GitHub; push creates the GitHub side (Issue
 * + Project item) the first time a local issue doesn't have one yet, then
 * keeps the item's Status field in sync with local status changes.
 *
 * Needs GITHUB_TOKEN (repo + project scope), GITHUB_REPO ("owner/repo"),
 * GITHUB_PROJECT_NUMBER — the same env vars the contact form already uses
 * (see docs/CONTACT_FORM.md), reused here rather than inventing a second
 * GitHub credential.
 */
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  findGitHubOptionIdForStatus,
  mapGitHubOptionToStatus,
  type LocalStatus,
} from "./lib/githubProjectsMapping";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function parseOwnerRepo(repo: string): { owner: string; name: string } {
  const slash = repo.indexOf("/");
  if (slash <= 0) throw new Error(`GITHUB_REPO must be "owner/repo", got "${repo}"`);
  return { owner: repo.slice(0, slash), name: repo.slice(slash + 1) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function githubGraphQL<T = any>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message?: string }[] };
  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("GitHub GraphQL returned no data");
  return json.data;
}

type ProjectMeta = {
  projectId: string;
  repositoryId: string;
  statusFieldId: string | null;
  statusOptions: Array<{ id: string; name: string }>;
};

/**
 * Fetches the project's node ID, the repo's node ID (needed to create
 * issues), and the Status single-select field's ID + option list (needed
 * to set an item's status). One GraphQL round trip, no caching — a board's
 * field config changes rarely enough that re-fetching per push is fine.
 */
async function fetchProjectMeta(
  token: string,
  owner: string,
  repoName: string,
  projectNumber: number,
): Promise<ProjectMeta> {
  type ProjectMetaResponse = {
    repository: { id: string } | null;
    user: {
      projectV2: {
        id: string;
        field: {
          id: string;
          options: Array<{ id: string; name: string }>;
        } | null;
      } | null;
    } | null;
  };
  const data: ProjectMetaResponse = await githubGraphQL<ProjectMetaResponse>(
    token,
    `
    query ProjectMeta($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) { id }
      user(login: $owner) {
        projectV2(number: $number) {
          id
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              options { id name }
            }
          }
        }
      }
    }
    `,
    { owner, repo: repoName, number: projectNumber },
  );

  if (!data.repository) throw new Error(`Repository ${owner}/${repoName} not found`);
  if (!data.user?.projectV2) {
    throw new Error(`Project v2 #${projectNumber} not found for user ${owner}`);
  }

  return {
    projectId: data.user.projectV2.id,
    repositoryId: data.repository.id,
    statusFieldId: data.user.projectV2.field?.id ?? null,
    statusOptions: data.user.projectV2.field?.options ?? [],
  };
}

type RemoteItem = {
  itemId: string;
  issueNodeId: string;
  issueNumber: number;
  title: string;
  body: string;
  status: LocalStatus;
  labels: string[];
  assignee: string | undefined;
  updatedAt: string;
};

async function fetchAllProjectItems(
  token: string,
  owner: string,
  projectNumber: number,
): Promise<RemoteItem[]> {
  const items: RemoteItem[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  type ProjectItemsResponse = {
    user: {
      projectV2: {
        items: {
          nodes: Array<{
            id: string;
            fieldValueByName: { name: string } | null;
            content:
              | {
                  id: string;
                  number: number;
                  title: string;
                  body: string;
                  updatedAt: string;
                  labels: { nodes: { name: string }[] };
                  assignees: { nodes: { login: string }[] };
                }
              | null;
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } | null;
    } | null;
  };

  while (hasNextPage) {
    const data: ProjectItemsResponse = await githubGraphQL<ProjectItemsResponse>(
      token,
      `
      query ProjectItems($owner: String!, $number: Int!, $cursor: String) {
        user(login: $owner) {
          projectV2(number: $number) {
            items(first: 100, after: $cursor) {
              nodes {
                id
                fieldValueByName(name: "Status") {
                  ... on ProjectV2ItemFieldSingleSelectValue { name }
                }
                content {
                  ... on Issue {
                    id
                    number
                    title
                    body
                    updatedAt
                    labels(first: 20) { nodes { name } }
                    assignees(first: 1) { nodes { login } }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }
      `,
      { owner, number: projectNumber, cursor },
    );

    const connection = data.user?.projectV2?.items;
    if (!connection) throw new Error("Unexpected response fetching project items");

    for (const node of connection.nodes) {
      if (!node.content) continue; // draft items with no linked Issue
      items.push({
        itemId: node.id,
        issueNodeId: node.content.id,
        issueNumber: node.content.number,
        title: node.content.title,
        body: node.content.body ?? "",
        status: mapGitHubOptionToStatus(node.fieldValueByName?.name),
        labels: node.content.labels.nodes.map((l: { name: string }) => l.name),
        assignee: node.content.assignees.nodes[0]?.login,
        updatedAt: node.content.updatedAt,
      });
    }

    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
  }

  return items;
}

const remoteItemValidator = v.object({
  itemId: v.string(),
  issueNodeId: v.string(),
  issueNumber: v.number(),
  title: v.string(),
  body: v.string(),
  status: v.union(
    v.literal("backlog"),
    v.literal("todo"),
    v.literal("in_progress"),
    v.literal("in_review"),
    v.literal("done"),
  ),
  labels: v.array(v.string()),
  assignee: v.optional(v.string()),
  updatedAt: v.string(),
});

export const upsertFromGitHub = internalMutation({
  args: { items: v.array(remoteItemValidator) },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;
    const now = Date.now();

    for (const item of args.items) {
      const existing = await ctx.db
        .query("issues")
        .withIndex("by_githubProjectItemId", (q) => q.eq("githubProjectItemId", item.itemId))
        .unique();

      const fields = {
        title: item.title,
        description: item.body,
        status: item.status,
        labels: item.labels,
        assignee: item.assignee,
        githubIssueNumber: item.issueNumber,
        githubIssueNodeId: item.issueNodeId,
        githubProjectItemId: item.itemId,
        githubUpdatedAt: item.updatedAt,
        lastSyncedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, fields);
        updated++;
      } else {
        await ctx.db.insert("issues", { ...fields, priority: "none", order: now });
        created++;
      }
    }

    return { created, updated, total: args.items.length };
  },
});

/** Pulls every item on the configured board — GitHub wins on conflict. */
export const pullFromGitHubProjects = action({
  args: {},
  returns: v.object({ created: v.number(), updated: v.number(), total: v.number() }),
  handler: async (ctx) => {
    const token = requireEnv("GITHUB_TOKEN");
    const { owner } = parseOwnerRepo(requireEnv("GITHUB_REPO"));
    const projectNumber = parseInt(requireEnv("GITHUB_PROJECT_NUMBER"), 10);

    const items = await fetchAllProjectItems(token, owner, projectNumber);
    const result: { created: number; updated: number; total: number } = await ctx.runMutation(
      internal.githubProjectsSync.upsertFromGitHub,
      { items },
    );

    await ctx.runMutation(internal.githubSync.updateSyncMeta, {
      key: "lastGitHubProjectsBoardSync",
      value: Date.now().toString(),
    });

    return result;
  },
});

export const getIssueForPush = internalQuery({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => ctx.db.get(args.issueId),
});

export const markGitHubLink = internalMutation({
  args: {
    issueId: v.id("issues"),
    githubIssueNumber: v.number(),
    githubIssueNodeId: v.string(),
    githubProjectItemId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.issueId, {
      githubIssueNumber: args.githubIssueNumber,
      githubIssueNodeId: args.githubIssueNodeId,
      githubProjectItemId: args.githubProjectItemId,
      lastSyncedAt: Date.now(),
    });
  },
});

/**
 * Pushes one local issue's current state to GitHub. If it has no GitHub
 * link yet, creates the Issue, adds it to the project, and sets Status.
 * If it's already linked, just re-sets Status (title/body edits made
 * locally are NOT pushed back — GitHub is ground truth for content, this
 * only pushes the status transition a kanban drag represents).
 *
 * Scheduled fire-and-forget from convex/issues.ts's create/update
 * mutations — failures are logged, never thrown back at the user's edit.
 */
export const pushIssueChange = internalAction({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.runQuery(internal.githubProjectsSync.getIssueForPush, {
      issueId: args.issueId,
    });
    if (!issue) return;

    const token = requireEnv("GITHUB_TOKEN");
    const { owner, name: repoName } = parseOwnerRepo(requireEnv("GITHUB_REPO"));
    const projectNumber = parseInt(requireEnv("GITHUB_PROJECT_NUMBER"), 10);
    const meta = await fetchProjectMeta(token, owner, repoName, projectNumber);

    let issueNodeId = issue.githubIssueNodeId;
    let projectItemId = issue.githubProjectItemId;

    if (!issueNodeId || !projectItemId) {
      const created = await githubGraphQL<{
        createIssue: { issue: { id: string; number: string } };
      }>(
        token,
        `
        mutation CreateIssue($repositoryId: ID!, $title: String!, $body: String!) {
          createIssue(input: { repositoryId: $repositoryId, title: $title, body: $body }) {
            issue { id number }
          }
        }
        `,
        { repositoryId: meta.repositoryId, title: issue.title, body: issue.description },
      );
      issueNodeId = created.createIssue.issue.id;

      const added = await githubGraphQL<{
        addProjectV2ItemById: { item: { id: string } };
      }>(
        token,
        `
        mutation AddItem($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item { id }
          }
        }
        `,
        { projectId: meta.projectId, contentId: issueNodeId },
      );
      projectItemId = added.addProjectV2ItemById.item.id;

      await ctx.runMutation(internal.githubProjectsSync.markGitHubLink, {
        issueId: args.issueId,
        githubIssueNumber: Number(created.createIssue.issue.number),
        githubIssueNodeId: issueNodeId,
        githubProjectItemId: projectItemId,
      });
    }

    if (!meta.statusFieldId) return; // board has no Status field configured

    const optionId = findGitHubOptionIdForStatus(issue.status, meta.statusOptions);
    if (!optionId) return; // board's Status options don't cover this status

    await githubGraphQL(
      token,
      `
      mutation SetStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(
          input: { projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }
        ) { projectV2Item { id } }
      }
      `,
      {
        projectId: meta.projectId,
        itemId: projectItemId,
        fieldId: meta.statusFieldId,
        optionId,
      },
    );
  },
});

/** Manual "sync now" button target — pushes every local issue with pending changes. */
export const pushAllPending = action({
  args: {},
  returns: v.object({ pushed: v.number() }),
  handler: async (ctx) => {
    const ids: Id<"issues">[] = await ctx.runQuery(internal.githubProjectsSync.listUnsyncedIssueIds, {});
    for (const issueId of ids) {
      await ctx.runAction(internal.githubProjectsSync.pushIssueChange, { issueId });
    }
    return { pushed: ids.length };
  },
});

export const listUnsyncedIssueIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").take(500);
    return issues.filter((i) => !i.githubProjectItemId).map((i) => i._id);
  },
});

/** For the Settings/Sync UI — no secrets, just counts. */
export const getBoardStats = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").take(500);
    const linked = issues.filter((i) => i.githubProjectItemId);
    const lastSynced = linked.reduce<number | null>(
      (max, i) => (i.lastSyncedAt && (!max || i.lastSyncedAt > max) ? i.lastSyncedAt : max),
      null,
    );
    return {
      totalIssues: issues.length,
      linkedIssues: linked.length,
      lastSyncedAt: lastSynced,
    };
  },
});

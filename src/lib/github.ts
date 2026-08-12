/**
 * GitHub REST + GraphQL helper — bun-compatible, Next 15 App Router ready.
 * Creates repository issues and adds them to a GitHub Projects v2 board.
 * Reads env vars at request time only so builds never fail on missing secrets.
 */

const GITHUB_REST = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export type CreateGitHubIssueParams = {
  title: string;
  body: string;
};

export type CreateGitHubIssueResult =
  | { ok: true; identifier: string; number: number; url: string }
  | { ok: false; error: string };

type GraphQLError = { message?: string };
type GraphQLResponse<T> = { data?: T; errors?: GraphQLError[] };

type RestIssue = {
  number?: number;
  html_url?: string;
  node_id?: string;
};

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "seridian-contact-form",
  };
}

export function parseRepo(repo: string): { owner: string; name: string } | null {
  const trimmed = repo.trim();
  const slash = trimmed.indexOf("/");
  if (slash <= 0 || slash === trimmed.length - 1) return null;
  const owner = trimmed.slice(0, slash);
  const name = trimmed.slice(slash + 1);
  if (!owner || !name) return null;
  return { owner, name };
}

async function githubGraphQL<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    return { ok: false, error: "Could not reach GitHub GraphQL" };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "GitHub rejected the token (401/403)" };
    }
    if (res.status === 429) {
      return { ok: false, error: "GitHub rate limit reached" };
    }
    return { ok: false, error: `GitHub GraphQL returned HTTP ${res.status}` };
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await res.json()) as GraphQLResponse<T>;
  } catch {
    return { ok: false, error: "GitHub GraphQL returned an unreadable response" };
  }

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message ?? "GitHub error").join("; ");
    return { ok: false, error: msg };
  }

  if (!json.data) {
    return { ok: false, error: "GitHub GraphQL returned no data" };
  }

  return { ok: true, data: json.data };
}

async function resolveProjectId(
  token: string,
  owner: string,
  projectNumber: number
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const userQuery = `
    query UserProject($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) { id }
      }
    }
  `;

  const userResult = await githubGraphQL<{ user?: { projectV2?: { id?: string } | null } | null }>(
    token,
    userQuery,
    { owner, number: projectNumber }
  );
  if (!userResult.ok) return userResult;

  const userProjectId = userResult.data.user?.projectV2?.id;
  if (userProjectId) return { ok: true, projectId: userProjectId };

  const orgQuery = `
    query OrgProject($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) { id }
      }
    }
  `;

  const orgResult = await githubGraphQL<{
    organization?: { projectV2?: { id?: string } | null } | null;
  }>(token, orgQuery, { owner, number: projectNumber });
  if (!orgResult.ok) return orgResult;

  const orgProjectId = orgResult.data.organization?.projectV2?.id;
  if (orgProjectId) return { ok: true, projectId: orgProjectId };

  return {
    ok: false,
    error: `GitHub project #${projectNumber} not found for owner ${owner}`,
  };
}

async function getProjectId(
  token: string,
  owner: string
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const directId = process.env.GITHUB_PROJECT_ID?.trim();
  if (directId) return { ok: true, projectId: directId };

  const numberRaw = process.env.GITHUB_PROJECT_NUMBER?.trim();
  if (!numberRaw) {
    return {
      ok: false,
      error: "GITHUB_PROJECT_ID or GITHUB_PROJECT_NUMBER is not configured",
    };
  }

  const projectNumber = Number.parseInt(numberRaw, 10);
  if (!Number.isFinite(projectNumber) || projectNumber < 1) {
    return { ok: false, error: "GITHUB_PROJECT_NUMBER must be a positive integer" };
  }

  return resolveProjectId(token, owner, projectNumber);
}

type StatusFieldOption = { id: string; name: string };
type StatusField = { fieldId: string; options: StatusFieldOption[] };

async function getProjectStatusField(
  token: string,
  projectId: string
): Promise<{ ok: true; field: StatusField } | { ok: false; error: string }> {
  const query = `
    query ProjectStatusField($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  const result = await githubGraphQL<{
    node?: {
      field?: { id?: string; options?: { id?: string; name?: string }[] } | null;
    } | null;
  }>(token, query, { projectId });

  if (!result.ok) return result;

  const field = result.data.node?.field;
  if (!field?.id) {
    return { ok: false, error: "Status field not found on GitHub project" };
  }

  const options: StatusFieldOption[] = (field.options ?? [])
    .filter((o): o is StatusFieldOption => Boolean(o.id && o.name))
    .map((o) => ({ id: o.id!, name: o.name! }));

  return { ok: true, field: { fieldId: field.id, options } };
}

function matchStatusOption(
  options: StatusFieldOption[],
  statusName: string
): StatusFieldOption | null {
  const normalized = statusName.trim().toLowerCase();
  return options.find((o) => o.name.trim().toLowerCase() === normalized) ?? null;
}

async function setProjectItemStatus(
  token: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const mutation = `
    mutation SetProjectItemStatus(
      $projectId: ID!
      $itemId: ID!
      $fieldId: ID!
      $optionId: String!
    ) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item { id }
      }
    }
  `;

  const result = await githubGraphQL<{
    updateProjectV2ItemFieldValue?: { projectV2Item?: { id?: string } | null } | null;
  }>(token, mutation, { projectId, itemId, fieldId, optionId });

  if (!result.ok) return result;
  if (!result.data.updateProjectV2ItemFieldValue?.projectV2Item?.id) {
    return { ok: false, error: "GitHub did not update the project item status" };
  }

  return { ok: true };
}

async function addIssueToProject(
  token: string,
  projectId: string,
  contentId: string
): Promise<{ ok: true; itemId: string } | { ok: false; error: string }> {
  const mutation = `
    mutation AddProjectItem($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `;

  const result = await githubGraphQL<{
    addProjectV2ItemById?: { item?: { id?: string } | null } | null;
  }>(token, mutation, { projectId, contentId });

  if (!result.ok) return result;

  const itemId = result.data.addProjectV2ItemById?.item?.id;
  if (!itemId) {
    return { ok: false, error: "GitHub did not add the issue to the project" };
  }

  return { ok: true, itemId };
}

async function assignProjectItemStatus(
  token: string,
  projectId: string,
  itemId: string,
  statusName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fieldResult = await getProjectStatusField(token, projectId);
  if (!fieldResult.ok) return fieldResult;

  const option = matchStatusOption(fieldResult.field.options, statusName);
  if (!option) {
    const available = fieldResult.field.options.map((o) => o.name).join(", ");
    return {
      ok: false,
      error: `Status "${statusName}" not found. Available: ${available || "(none)"}`,
    };
  }

  return setProjectItemStatus(
    token,
    projectId,
    itemId,
    fieldResult.field.fieldId,
    option.id
  );
}

/**
 * Create a GitHub issue in GITHUB_REPO and add it to the configured Projects v2 board.
 */
export async function createGitHubIssue({
  title,
  body,
}: CreateGitHubIssueParams): Promise<CreateGitHubIssueResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { ok: false, error: "GITHUB_TOKEN is not configured" };
  }

  const repoEnv = process.env.GITHUB_REPO;
  if (!repoEnv) {
    return { ok: false, error: "GITHUB_REPO is not configured" };
  }

  const repo = parseRepo(repoEnv);
  if (!repo) {
    return { ok: false, error: "GITHUB_REPO must be in owner/repo format" };
  }

  if (!title?.trim() || !body?.trim()) {
    return { ok: false, error: "title and body are required" };
  }

  let res: Response;
  try {
    res = await fetch(`${GITHUB_REST}/repos/${repo.owner}/${repo.name}/issues`, {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    });
  } catch {
    return { ok: false, error: "Could not reach GitHub" };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "GitHub rejected the token (401/403)" };
    }
    if (res.status === 404) {
      return { ok: false, error: `GitHub repository ${repo.owner}/${repo.name} not found` };
    }
    if (res.status === 422) {
      return { ok: false, error: "GitHub rejected the issue payload (422)" };
    }
    if (res.status === 429) {
      return { ok: false, error: "GitHub rate limit reached" };
    }
    return { ok: false, error: `GitHub returned HTTP ${res.status}` };
  }

  let issue: RestIssue;
  try {
    issue = (await res.json()) as RestIssue;
  } catch {
    return { ok: false, error: "GitHub returned an unreadable response" };
  }

  if (!issue.number || !issue.html_url || !issue.node_id) {
    return { ok: false, error: "GitHub did not create the issue" };
  }

  const projectResult = await getProjectId(token, repo.owner);
  if (projectResult.ok) {
    const addResult = await addIssueToProject(token, projectResult.projectId, issue.node_id);
    if (!addResult.ok) {
      console.error(
        "[github] Issue created but project add failed:",
        addResult.error,
        `(issue #${issue.number})`
      );
    } else {
      const statusName = process.env.GITHUB_PROJECT_STATUS?.trim();
      if (statusName) {
        const statusResult = await assignProjectItemStatus(
          token,
          projectResult.projectId,
          addResult.itemId,
          statusName
        );
        if (!statusResult.ok) {
          console.error(
            "[github] Issue added to project but status update failed:",
            statusResult.error,
            `(issue #${issue.number})`
          );
        }
      }
    }
  } else {
    console.error("[github] Issue created but project not configured:", projectResult.error);
  }

  return {
    ok: true,
    identifier: `#${issue.number}`,
    number: issue.number,
    url: issue.html_url,
  };
}

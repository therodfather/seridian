/**
 * Pure mapping between our local issue status enum and a GitHub Projects v2
 * board's "Status" single-select field option names. No network, no ctx —
 * safe to unit test directly.
 */

export type LocalStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

export const LOCAL_STATUS_VALUES: LocalStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

/** Preferred GitHub option name to use when we create/set a status. */
export const STATUS_TO_GITHUB_OPTION: Record<LocalStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

/**
 * GitHub boards are customizable, so match on substring/synonyms rather than
 * requiring an exact name. Falls back to "backlog" for an unrecognized or
 * missing option — matches how a freshly-created item with no Status set
 * should behave.
 */
export function mapGitHubOptionToStatus(
  optionName: string | null | undefined,
): LocalStatus {
  if (!optionName) return "backlog";
  const normalized = optionName.trim().toLowerCase();

  if (normalized.includes("progress") || normalized.includes("doing")) {
    return "in_progress";
  }
  if (normalized.includes("review")) return "in_review";
  if (
    normalized === "done" ||
    normalized.includes("complete") ||
    normalized.includes("closed")
  ) {
    return "done";
  }
  if (
    normalized === "todo" ||
    normalized === "to do" ||
    normalized.includes("ready")
  ) {
    return "todo";
  }
  return "backlog";
}

export function mapStatusToGitHubOption(status: LocalStatus): string {
  return STATUS_TO_GITHUB_OPTION[status];
}

/**
 * Given the Status field's actual option list from the board (each having
 * an id + name), find the option ID to send in a field-value mutation for
 * a local status. Matches by the same fuzzy rule as mapGitHubOptionToStatus
 * so a board with e.g. "In-Progress" instead of "In Progress" still works.
 */
export function findGitHubOptionIdForStatus(
  status: LocalStatus,
  options: Array<{ id: string; name: string }>,
): string | null {
  const exact = options.find(
    (o) => o.name.toLowerCase() === STATUS_TO_GITHUB_OPTION[status].toLowerCase(),
  );
  if (exact) return exact.id;

  const fuzzy = options.find((o) => mapGitHubOptionToStatus(o.name) === status);
  return fuzzy?.id ?? null;
}

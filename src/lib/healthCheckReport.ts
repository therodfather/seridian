/**
 * One-page Cloud Health Check report — the $999 deliverable.
 * Drafts live in localStorage only. No Convex, no new integrations.
 * Copy matches SOW Lite on /packages and the cash-collection playbook.
 */

export const HEALTH_CHECK_STORAGE_KEY = "seridian_health_check_report";

export const HEALTH_CHECK_SOW = {
  package: "Cloud & Infrastructure Health Check — $999 prepaid",
  scope:
    "architecture, security, CI/CD, monitoring, backup, cost, reliability",
  deliverable:
    "written report (Critical / High / Recommended / Doing well) + 30/60/90 plan",
  timeline: "3–5 business days after payment + read-only access",
  outOfScope: "implementing fixes (separate CI/CD or sprint)",
  access: "cloud read role, repo, staging URL",
  valid: "7 days",
} as const;

export type FindingSeverity = "critical" | "high" | "recommended" | "doingWell";

export type HealthCheckFinding = {
  id: string;
  title: string;
  detail: string;
};

export type HealthCheckDraft = {
  clientName: string;
  contactName: string;
  preparedBy: string;
  date: string;
  accessNotes: string;
  critical: HealthCheckFinding[];
  high: HealthCheckFinding[];
  recommended: HealthCheckFinding[];
  doingWell: HealthCheckFinding[];
  costSavings: string;
  plan30: string;
  plan60: string;
  plan90: string;
};

export const FINDING_SECTIONS: {
  key: FindingSeverity;
  label: string;
  marker: string;
  hint: string;
  accent: string;
}[] = [
  {
    key: "critical",
    label: "Critical",
    marker: "🔴",
    hint: "Fix now — security, data loss, or production outage risk.",
    accent: "border-red-500/30 bg-red-500/5",
  },
  {
    key: "high",
    label: "High",
    marker: "🟠",
    hint: "Fix this cycle — reliability, access, or backup gaps.",
    accent: "border-orange-500/30 bg-orange-500/5",
  },
  {
    key: "recommended",
    label: "Recommended",
    marker: "🟡",
    hint: "Worth doing — hygiene, observability, or cost.",
    accent: "border-amber-500/30 bg-amber-500/5",
  },
  {
    key: "doingWell",
    label: "Doing well",
    marker: "🟢",
    hint: "Keep these. Call out what already works.",
    accent: "border-emerald-500/30 bg-emerald-500/5",
  },
];

let findingSeq = 0;

export function createFinding(): HealthCheckFinding {
  findingSeq += 1;
  return { id: `finding-${findingSeq}`, title: "", detail: "" };
}

export function emptyHealthCheckDraft(
  today = new Date().toISOString().slice(0, 10),
): HealthCheckDraft {
  return {
    clientName: "",
    contactName: "",
    preparedBy: "",
    date: today,
    accessNotes: "",
    critical: [createFinding()],
    high: [createFinding()],
    recommended: [createFinding()],
    doingWell: [createFinding()],
    costSavings: "",
    plan30: "",
    plan60: "",
    plan90: "",
  };
}

function isFinding(value: unknown): value is HealthCheckFinding {
  if (!value || typeof value !== "object") return false;
  const row = value as HealthCheckFinding;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.detail === "string"
  );
}

function findingsOrDefault(value: unknown): HealthCheckFinding[] {
  if (!Array.isArray(value) || value.length === 0) return [createFinding()];
  const rows = value.filter(isFinding);
  return rows.length > 0 ? rows : [createFinding()];
}

export function parseHealthCheckDraft(raw: string | null): HealthCheckDraft {
  const fallback = emptyHealthCheckDraft();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<HealthCheckDraft>;
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      clientName: typeof parsed.clientName === "string" ? parsed.clientName : "",
      contactName:
        typeof parsed.contactName === "string" ? parsed.contactName : "",
      preparedBy: typeof parsed.preparedBy === "string" ? parsed.preparedBy : "",
      date: typeof parsed.date === "string" && parsed.date ? parsed.date : fallback.date,
      accessNotes:
        typeof parsed.accessNotes === "string" ? parsed.accessNotes : "",
      critical: findingsOrDefault(parsed.critical),
      high: findingsOrDefault(parsed.high),
      recommended: findingsOrDefault(parsed.recommended),
      doingWell: findingsOrDefault(parsed.doingWell),
      costSavings:
        typeof parsed.costSavings === "string" ? parsed.costSavings : "",
      plan30: typeof parsed.plan30 === "string" ? parsed.plan30 : "",
      plan60: typeof parsed.plan60 === "string" ? parsed.plan60 : "",
      plan90: typeof parsed.plan90 === "string" ? parsed.plan90 : "",
    };
  } catch {
    return fallback;
  }
}

export function loadHealthCheckDraft(): HealthCheckDraft {
  if (typeof window === "undefined") return emptyHealthCheckDraft();
  return parseHealthCheckDraft(window.localStorage.getItem(HEALTH_CHECK_STORAGE_KEY));
}

export function saveHealthCheckDraft(draft: HealthCheckDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HEALTH_CHECK_STORAGE_KEY, JSON.stringify(draft));
}

export function clearHealthCheckDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HEALTH_CHECK_STORAGE_KEY);
}

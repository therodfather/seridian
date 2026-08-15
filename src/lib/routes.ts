/**
 * Public URL path constants for App Router pages.
 *
 * Next.js route groups like `(marketing)` never appear in the URL — only use
 * these constants (or paths derived from them) in `href`, `redirect`, and
 * `router.push`. See `routes.test.ts` for the leak guard.
 */

export const ROUTES = {
  home: "/",
  packages: "/packages",
  packagesHealthCheck: "/packages#health-check",
  casestudies: "/casestudies",
  contact: "/#contact",
  services: "/#services",
  approach: "/#approach",
  expertise: "/#expertise",
  dashboard: {
    root: "/dashboard",
    issues: "/dashboard/issues",
    clients: "/dashboard/clients",
    bookings: "/dashboard/bookings",
    sales: "/dashboard/sales",
    proposals: "/dashboard/proposals",
    contracts: "/dashboard/contracts",
    ivr: "/dashboard/ivr",
    healthCheck: "/dashboard/health-check",
    wiki: "/dashboard/wiki",
    arena: "/dashboard/arena",
    brain: "/dashboard/brain",
    templates: "/dashboard/templates",
    files: "/dashboard/files",
    /** Legacy path; redirects to Settings → Integrations & Sync. */
    sync: "/dashboard/sync",
    chat: "/dashboard/chat",
    settings: "/dashboard/settings",
  },
} as const;

/** Deep-link into a Settings tab (`general` omits the query). */
export function settingsTabHref(
  tab: "general" | "audit" | "users" | "sync" | "secrets" | "agents" = "general",
): string {
  if (tab === "general") return ROUTES.dashboard.settings;
  return `${ROUTES.dashboard.settings}?tab=${tab}`;
}

export type MarketingRoute =
  | typeof ROUTES.home
  | typeof ROUTES.packages
  | typeof ROUTES.packagesHealthCheck
  | typeof ROUTES.casestudies
  | typeof ROUTES.contact
  | typeof ROUTES.services
  | typeof ROUTES.approach
  | typeof ROUTES.expertise;

export type DashboardRoute =
  (typeof ROUTES.dashboard)[keyof typeof ROUTES.dashboard];

/** Flat list of every static path we expose as a typed constant. */
export function allRouteHrefs(): string[] {
  const { dashboard, ...marketing } = ROUTES;
  return [...Object.values(marketing), ...Object.values(dashboard)];
}

/** True when a path incorrectly embeds a Next.js route-group segment. */
export function hasRouteGroupLeak(href: string): boolean {
  return /\/\([^/]+\)(?:\/|$)/.test(href);
}

export function casestudyHref(id: string): string {
  return `${ROUTES.casestudies}/${id}`;
}

export function clientHref(id: string): string {
  return `${ROUTES.dashboard.clients}/${id}`;
}

export function issueHref(id: string): string {
  return `${ROUTES.dashboard.issues}/${id}`;
}

export function proposalHref(id: string): string {
  return `${ROUTES.dashboard.proposals}/${id}`;
}

export function contractHref(id: string): string {
  return `${ROUTES.dashboard.contracts}/${id}`;
}

export function ivrFlowHref(id: string): string {
  return `${ROUTES.dashboard.ivr}/${id}`;
}

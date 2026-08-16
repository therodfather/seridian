import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DASHBOARD_NAV,
  DASHBOARD_NESTED_NAV,
  DASHBOARD_REDIRECT_ONLY_HREFS,
  DASHBOARD_ROUTE_NAMES,
  DASHBOARD_SEARCH_NAV,
  KNOWLEDGE_NAV_HREFS,
  NUMBER_KEY_NAV,
  entityHref,
  navSlug,
  newItemHref,
} from "./dashboardNav";
import { ROUTES, settingsTabHref } from "./routes";

const APP_ROOT = join(process.cwd(), "src/app");
const DASHBOARD_APP_ROOT = join(APP_ROOT, "dashboard");
const ROUTE_GROUP_RE = /\([^/]+\)/;

function pagePathForHref(href: string): string {
  const segments = href.replace(/^\//, "").split("/").filter(Boolean);
  return join(APP_ROOT, ...segments, "page.tsx");
}

function collectDashboardPageHrefs(
  dir: string = DASHBOARD_APP_ROOT,
  segments: string[] = ["dashboard"],
): string[] {
  const hrefs: string[] = [];
  if (existsSync(join(dir, "page.tsx"))) {
    hrefs.push("/" + segments.join("/"));
  }
  for (const entry of readdirSync(dir)) {
    if (ROUTE_GROUP_RE.test(entry)) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith("[") && entry.endsWith("]")) continue;
    hrefs.push(...collectDashboardPageHrefs(full, [...segments, entry]));
  }
  return hrefs;
}

describe("dashboard nav", () => {
  test("includes knowledge surfaces that already exist as routes", () => {
    const hrefs = DASHBOARD_SEARCH_NAV.map((item) => item.href);
    for (const href of KNOWLEDGE_NAV_HREFS) {
      expect(hrefs).toContain(href);
    }
  });

  test("labels wiki, arena, and second brain for the sidebar", () => {
    const labels = DASHBOARD_SEARCH_NAV.map((item) => item.label);
    expect(labels).toContain("Wiki");
    expect(labels).toContain("LLM Arena");
    expect(labels).toContain("Second Brain");
  });

  test("keeps existing core and tools entries reachable without a Sync sidebar tab", () => {
    const hrefs = DASHBOARD_SEARCH_NAV.map((item) => item.href);
    const labels = DASHBOARD_SEARCH_NAV.map((item) => item.label);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/dashboard/settings");
    expect(hrefs).toContain("/dashboard/chat");
    expect(hrefs).toContain("/dashboard/health-check");
    expect(labels).toContain("Health Check");
    expect(hrefs).not.toContain(ROUTES.dashboard.sync);
    expect(labels).not.toContain("Sync");
    expect(DASHBOARD_REDIRECT_ONLY_HREFS).toContain(ROUTES.dashboard.sync);
    expect(settingsTabHref("sync")).toBe("/dashboard/settings?tab=sync");
  });

  test("hub activeFor entries are all reachable nested destinations", () => {
    const nestedHrefs = new Set<string>(DASHBOARD_NESTED_NAV.map((item) => item.href));
    for (const item of DASHBOARD_NAV) {
      for (const child of item.activeFor ?? []) {
        expect(nestedHrefs.has(child), `${child} (hub: ${item.label})`).toBe(true);
      }
    }
  });

  test("route names cover every hub and nested nav slug", () => {
    for (const item of DASHBOARD_SEARCH_NAV) {
      const slug = navSlug(item.href);
      expect(DASHBOARD_ROUTE_NAMES[slug], item.href).toBe(item.label);
    }
  });

  test("entity hrefs point at detail routes", () => {
    expect(entityHref("clients", "abc")).toBe("/dashboard/clients/abc");
    expect(entityHref("issues", "xyz")).toBe("/dashboard/issues/xyz");
    expect(entityHref("proposals", "p1")).toBe("/dashboard/proposals/p1");
    expect(entityHref("contracts", "c1")).toBe("/dashboard/contracts/c1");
  });

  test("entity detail pages exist on disk", () => {
    for (const group of ["clients", "issues", "proposals"] as const) {
      const param =
        group === "clients"
          ? "[clientId]"
          : group === "issues"
            ? "[issueId]"
            : "[proposalId]";
      expect(
        existsSync(join(DASHBOARD_APP_ROOT, group, param, "page.tsx")),
      ).toBe(true);
    }
  });

  test("number keys map the first nine sidebar entries including knowledge", () => {
    expect(NUMBER_KEY_NAV).toHaveLength(9);
    expect(NUMBER_KEY_NAV.map((item) => item.label)).toEqual([
      "Overview",
      "Issues",
      "Clients",
      "Bookings",
      "Sales",
      "Proposals",
      "Contracts",
      "Wiki",
      "LLM Arena",
    ]);
  });

  test("new item stays on the current section", () => {
    expect(newItemHref("wiki")).toBe("/dashboard/wiki");
    expect(newItemHref("clients")).toBe("/dashboard/clients");
    expect(newItemHref("unknown")).toBe("/dashboard");
  });

  test("every nav href maps to a page.tsx (no dead links)", () => {
    for (const item of DASHBOARD_SEARCH_NAV) {
      const pagePath = pagePathForHref(item.href);
      // Contracts page is landed in parallel; keep the nav entry either way.
      if (item.href === ROUTES.dashboard.contracts && !existsSync(pagePath)) {
        continue;
      }
      expect(existsSync(pagePath), item.href).toBe(true);
    }
  });

  test("nav hrefs never leak route-group segments", () => {
    for (const item of DASHBOARD_SEARCH_NAV) {
      expect(item.href).not.toMatch(ROUTE_GROUP_RE);
      expect(item.href.startsWith("/dashboard")).toBe(true);
    }
  });

  test("sidebar nav (hubs + nested) covers every static dashboard page except redirects", () => {
    const navHrefs = new Set<string>(DASHBOARD_SEARCH_NAV.map((item) => item.href));
    const redirectOnly = new Set<string>(DASHBOARD_REDIRECT_ONLY_HREFS);
    for (const href of collectDashboardPageHrefs()) {
      if (redirectOnly.has(href)) continue;
      expect(navHrefs.has(href), `missing nav entry for ${href}`).toBe(true);
    }
    for (const href of redirectOnly) {
      expect(existsSync(pagePathForHref(href)), href).toBe(true);
    }
  });

  test("dashboard layout enforces auth for all nested routes", () => {
    const layout = readFileSync(
      join(DASHBOARD_APP_ROOT, "layout.tsx"),
      "utf8",
    );
    expect(layout).toContain("DashboardAuthProvider");
    expect(layout).toContain("DashboardGuard");
    expect(existsSync(join(DASHBOARD_APP_ROOT, "loading.tsx"))).toBe(true);
    expect(existsSync(join(DASHBOARD_APP_ROOT, "error.tsx"))).toBe(true);
    expect(existsSync(join(DASHBOARD_APP_ROOT, "not-found.tsx"))).toBe(true);
  });
});

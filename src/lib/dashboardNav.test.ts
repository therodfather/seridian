import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DASHBOARD_NAV,
  DASHBOARD_ROUTE_NAMES,
  KNOWLEDGE_NAV_HREFS,
  NUMBER_KEY_NAV,
  entityHref,
  navSlug,
  newItemHref,
} from "./dashboardNav";

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
    const hrefs = DASHBOARD_NAV.map((item) => item.href);
    for (const href of KNOWLEDGE_NAV_HREFS) {
      expect(hrefs).toContain(href);
    }
  });

  test("labels wiki, arena, and second brain for the sidebar", () => {
    const labels = DASHBOARD_NAV.map((item) => item.label);
    expect(labels).toContain("Wiki");
    expect(labels).toContain("LLM Arena");
    expect(labels).toContain("Second Brain");
  });

  test("keeps existing core and tools entries", () => {
    const hrefs = DASHBOARD_NAV.map((item) => item.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/dashboard/settings");
    expect(hrefs).toContain("/dashboard/sync");
    expect(hrefs).toContain("/dashboard/chat");
  });

  test("route names cover every nav slug", () => {
    for (const item of DASHBOARD_NAV) {
      const slug = navSlug(item.href);
      expect(DASHBOARD_ROUTE_NAMES[slug]).toBe(item.label);
    }
  });

  test("entity hrefs point at detail routes", () => {
    expect(entityHref("clients", "abc")).toBe("/dashboard/clients/abc");
    expect(entityHref("issues", "xyz")).toBe("/dashboard/issues/xyz");
    expect(entityHref("proposals", "p1")).toBe("/dashboard/proposals/p1");
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
      "Wiki",
      "LLM Arena",
      "Second Brain",
    ]);
  });

  test("new item stays on the current section", () => {
    expect(newItemHref("wiki")).toBe("/dashboard/wiki");
    expect(newItemHref("clients")).toBe("/dashboard/clients");
    expect(newItemHref("unknown")).toBe("/dashboard");
  });

  test("every nav href maps to a page.tsx (no dead links)", () => {
    for (const item of DASHBOARD_NAV) {
      expect(existsSync(pagePathForHref(item.href)), item.href).toBe(true);
    }
  });

  test("nav hrefs never leak route-group segments", () => {
    for (const item of DASHBOARD_NAV) {
      expect(item.href).not.toMatch(ROUTE_GROUP_RE);
      expect(item.href.startsWith("/dashboard")).toBe(true);
    }
  });

  test("sidebar nav covers every static dashboard page", () => {
    const navHrefs = new Set(DASHBOARD_NAV.map((item) => item.href));
    for (const href of collectDashboardPageHrefs()) {
      expect(navHrefs.has(href), `missing nav entry for ${href}`).toBe(true);
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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV,
  KNOWLEDGE_NAV_HREFS,
} from "./dashboardNav";
import {
  allRouteHrefs,
  hasRouteGroupLeak,
  ROUTES,
  settingsTabHref,
} from "./routes";

const FORBIDDEN_GROUP_RE = /\((?:marketing|dashboard)\)/;

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walkFiles(path, out);
    else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) out.push(path);
  }
  return out;
}

describe("routes", () => {
  it("exposes dashboard root and marketing packages without route groups", () => {
    expect(ROUTES.home).toBe("/");
    expect(ROUTES.packages).toBe("/packages");
    expect(ROUTES.dashboard.root).toBe("/dashboard");
    expect(ROUTES.dashboard.settings).toBe("/dashboard/settings");
    expect(ROUTES.dashboard.sync).toBe("/dashboard/sync");
    expect(settingsTabHref("sync")).toBe("/dashboard/settings?tab=sync");
    expect(settingsTabHref("general")).toBe("/dashboard/settings");
  });

  it("forbids (marketing) / (dashboard) in typed route constants", () => {
    for (const href of allRouteHrefs()) {
      expect(hasRouteGroupLeak(href), href).toBe(false);
      expect(FORBIDDEN_GROUP_RE.test(href), href).toBe(false);
    }
  });

  it("forbids route-group segments in dashboardNav hrefs", () => {
    for (const item of DASHBOARD_NAV) {
      expect(hasRouteGroupLeak(item.href), item.href).toBe(false);
      expect(FORBIDDEN_GROUP_RE.test(item.href), item.href).toBe(false);
      expect(item.href.startsWith("/dashboard")).toBe(true);
    }
    for (const href of KNOWLEDGE_NAV_HREFS) {
      expect(hasRouteGroupLeak(href), href).toBe(false);
    }
  });

  it("keeps DASHBOARD_NAV aligned with ROUTES.dashboard", () => {
    const routeSet = new Set<string>(Object.values(ROUTES.dashboard));
    for (const item of DASHBOARD_NAV) {
      expect(routeSet.has(item.href)).toBe(true);
    }
  });

  it("scans src for href/redirect leaks of (marketing) or (dashboard)", () => {
    const root = join(process.cwd(), "src");
    const offenders: string[] = [];

    for (const file of walkFiles(root)) {
      if (file.endsWith("routes.test.ts") || file.endsWith("routes.ts")) continue;
      const text = readFileSync(file, "utf8");
      const stringLeak =
        /["'`][^"'`]*\/\((?:marketing|dashboard)\)[^"'`]*/;
      if (stringLeak.test(text)) {
        offenders.push(relative(process.cwd(), file));
      }
    }

    expect(offenders).toEqual([]);
  });
});

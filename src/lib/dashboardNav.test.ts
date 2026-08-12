import { describe, expect, test } from "vitest";
import {
  DASHBOARD_NAV,
  DASHBOARD_ROUTE_NAMES,
  KNOWLEDGE_NAV_HREFS,
} from "./dashboardNav";

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
      const slug = item.href.replace("/dashboard", "").replace(/^\//, "") || "overview";
      expect(DASHBOARD_ROUTE_NAMES[slug]).toBe(item.label);
    }
  });
});

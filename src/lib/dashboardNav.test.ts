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
});

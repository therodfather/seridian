import { describe, expect, it } from "vitest";
import {
  HEALTH_CHECK_SOW,
  FINDING_SECTIONS,
  createFinding,
  emptyHealthCheckDraft,
  parseHealthCheckDraft,
} from "./healthCheckReport";

describe("healthCheckReport", () => {
  it("matches SOW Lite copy sold on /packages", () => {
    expect(HEALTH_CHECK_SOW.package).toBe(
      "Cloud & Infrastructure Health Check — $999 prepaid",
    );
    expect(HEALTH_CHECK_SOW.scope).toMatch(/architecture, security, CI\/CD/);
    expect(HEALTH_CHECK_SOW.deliverable).toBe(
      "written report (Critical / High / Recommended / Doing well) + 30/60/90 plan",
    );
    expect(HEALTH_CHECK_SOW.timeline).toMatch(/3–5 business days/);
    expect(HEALTH_CHECK_SOW.outOfScope).toMatch(/implementing fixes/);
  });

  it("covers the four severity bands plus cost and 30/60/90 keys", () => {
    expect(FINDING_SECTIONS.map((section) => section.label)).toEqual([
      "Critical",
      "High",
      "Recommended",
      "Doing well",
    ]);
    const draft = emptyHealthCheckDraft("2026-08-13");
    expect(draft.date).toBe("2026-08-13");
    expect(draft.critical).toHaveLength(1);
    expect(draft.plan30).toBe("");
    expect(draft.costSavings).toBe("");
  });

  it("round-trips a saved draft and ignores junk JSON", () => {
    const draft = emptyHealthCheckDraft("2026-08-13");
    draft.clientName = "Northwind";
    draft.critical[0].title = "Open S3 bucket";
    const restored = parseHealthCheckDraft(JSON.stringify(draft));
    expect(restored.clientName).toBe("Northwind");
    expect(restored.critical[0].title).toBe("Open S3 bucket");
    expect(parseHealthCheckDraft("not-json").clientName).toBe("");
    expect(parseHealthCheckDraft(null).high.length).toBeGreaterThan(0);
  });

  it("creates distinct finding ids", () => {
    expect(createFinding().id).not.toBe(createFinding().id);
  });
});

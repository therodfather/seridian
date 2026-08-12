import { describe, expect, test } from "vitest";
import { isConvexId } from "./convexId";

describe("isConvexId", () => {
  test("accepts plausible Convex document ids", () => {
    expect(isConvexId("jd7abc123xyz4567")).toBe(true);
    expect(isConvexId("k57d9f0e1a2b3c4d5e6f7890")).toBe(true);
  });

  test("rejects empty / short / invalid values", () => {
    expect(isConvexId(undefined)).toBe(false);
    expect(isConvexId(null)).toBe(false);
    expect(isConvexId("")).toBe(false);
    expect(isConvexId("not-an-id")).toBe(false);
    expect(isConvexId("short")).toBe(false);
    expect(isConvexId("has spaces here!!")).toBe(false);
  });
});

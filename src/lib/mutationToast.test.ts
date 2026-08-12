import { describe, expect, test } from "vitest";
import { mutationErrorMessage } from "./mutationToast";

describe("mutationErrorMessage", () => {
  test("prefers Error.message", () => {
    expect(mutationErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  test("accepts string errors", () => {
    expect(mutationErrorMessage("nope", "fallback")).toBe("nope");
  });

  test("falls back for unknown shapes", () => {
    expect(mutationErrorMessage({ code: 1 }, "fallback")).toBe("fallback");
    expect(mutationErrorMessage(null)).toBe("Something went wrong");
  });
});

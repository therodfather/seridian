import { describe, expect, test } from "vitest";
import { parseRepo } from "./github";

describe("parseRepo", () => {
  test("parses owner/name", () => {
    expect(parseRepo("therodfather/seridian")).toEqual({
      owner: "therodfather",
      name: "seridian",
    });
  });

  test("trims whitespace", () => {
    expect(parseRepo("  4cecoder/seridian  ")).toEqual({
      owner: "4cecoder",
      name: "seridian",
    });
  });

  test("rejects missing slash or empty parts", () => {
    expect(parseRepo("noslash")).toBeNull();
    expect(parseRepo("/seridian")).toBeNull();
    expect(parseRepo("owner/")).toBeNull();
    expect(parseRepo("")).toBeNull();
  });
});

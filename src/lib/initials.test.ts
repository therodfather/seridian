import { describe, expect, test } from "vitest";
import { getInitials } from "./initials";

describe("getInitials", () => {
  test("uses the first letters of each word", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
  });

  test("caps at two characters", () => {
    expect(getInitials("John Ronald Reuel Tolkien")).toBe("JR");
  });

  test("handles a single name", () => {
    expect(getInitials("Dee")).toBe("D");
  });

  test("ignores extra whitespace", () => {
    expect(getInitials("  Byte   Cats  ")).toBe("BC");
  });
});

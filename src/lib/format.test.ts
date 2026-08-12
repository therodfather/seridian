import { describe, expect, test } from "vitest";
import {
  formatBytes,
  formatCurrency,
  formatDate,
  timeAgo,
} from "./format";

describe("formatCurrency", () => {
  test("formats millions", () => {
    expect(formatCurrency(2_500_000)).toBe("$2.5M");
  });

  test("formats thousands", () => {
    expect(formatCurrency(12_000)).toBe("$12K");
  });

  test("formats small values with locale separators", () => {
    expect(formatCurrency(500)).toBe("$500");
  });
});

describe("formatBytes", () => {
  test("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("formats megabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(2.4 * 1024 * 1024 * 1024)).toBe("2.4 GB");
  });
});

describe("formatDate", () => {
  test("formats a unix timestamp in en-US", () => {
    expect(formatDate(Date.UTC(2026, 7, 12))).toMatch(/Aug 1[12], 2026/);
  });
});

describe("timeAgo", () => {
  test("returns just now for recent timestamps", () => {
    expect(timeAgo(Date.now() - 10_000)).toBe("Just now");
  });

  test("returns minutes ago", () => {
    expect(timeAgo(Date.now() - 5 * 60 * 1000)).toBe("5m ago");
  });

  test("returns yesterday for ~24h", () => {
    expect(timeAgo(Date.now() - 25 * 60 * 60 * 1000)).toBe("Yesterday");
  });
});

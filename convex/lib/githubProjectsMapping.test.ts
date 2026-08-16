import { describe, expect, it } from "vitest";
import {
  findGitHubOptionIdForStatus,
  mapGitHubOptionToStatus,
  mapStatusToGitHubOption,
} from "./githubProjectsMapping";

describe("mapGitHubOptionToStatus", () => {
  it("maps standard GitHub board option names", () => {
    expect(mapGitHubOptionToStatus("Todo")).toBe("todo");
    expect(mapGitHubOptionToStatus("In Progress")).toBe("in_progress");
    expect(mapGitHubOptionToStatus("Done")).toBe("done");
  });

  it("is case-insensitive and tolerant of board customization", () => {
    expect(mapGitHubOptionToStatus("in-progress")).toBe("in_progress");
    expect(mapGitHubOptionToStatus("DOING")).toBe("in_progress");
    expect(mapGitHubOptionToStatus("Closed")).toBe("done");
    expect(mapGitHubOptionToStatus("Ready")).toBe("todo");
    expect(mapGitHubOptionToStatus("Code Review")).toBe("in_review");
  });

  it("falls back to backlog for missing/unrecognized options", () => {
    expect(mapGitHubOptionToStatus(null)).toBe("backlog");
    expect(mapGitHubOptionToStatus(undefined)).toBe("backlog");
    expect(mapGitHubOptionToStatus("Some Custom Column")).toBe("backlog");
  });

  it("round-trips through mapStatusToGitHubOption", () => {
    for (const status of ["backlog", "todo", "in_progress", "in_review", "done"] as const) {
      const optionName = mapStatusToGitHubOption(status);
      expect(mapGitHubOptionToStatus(optionName)).toBe(status);
    }
  });
});

describe("findGitHubOptionIdForStatus", () => {
  const options = [
    { id: "opt_1", name: "Backlog" },
    { id: "opt_2", name: "Todo" },
    { id: "opt_3", name: "In Progress" },
    { id: "opt_4", name: "Done" },
  ];

  it("finds an exact match", () => {
    expect(findGitHubOptionIdForStatus("todo", options)).toBe("opt_2");
    expect(findGitHubOptionIdForStatus("done", options)).toBe("opt_4");
  });

  it("falls back to fuzzy matching when the board renamed a column", () => {
    const customOptions = [
      { id: "opt_1", name: "Not started" },
      { id: "opt_2", name: "Doing" },
      { id: "opt_3", name: "Shipped" },
    ];
    expect(findGitHubOptionIdForStatus("in_progress", customOptions)).toBe("opt_2");
  });

  it("returns null when nothing matches (e.g. board has no Status field configured yet)", () => {
    expect(findGitHubOptionIdForStatus("in_review", [{ id: "opt_1", name: "Backlog" }])).toBeNull();
  });
});

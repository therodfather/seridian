import { describe, expect, it } from "vitest";
import {
  assertValidGraph,
  defaultIvrGraph,
  isWithinBusinessHours,
  resolveEdge,
  type IvrNode,
} from "./lib/ivrGraph";

describe("ivrGraph", () => {
  it("ships a valid default graph", () => {
    const graph = defaultIvrGraph();
    expect(() => assertValidGraph(graph)).not.toThrow();
    expect(graph.entryNodeId).toBe("welcome");
  });

  it("resolves digit and timeout edges", () => {
    const graph = defaultIvrGraph();
    const menu = graph.nodes.find((n) => n.id === "menu")!;
    expect(resolveEdge(menu, "1")).toBe("transfer");
    expect(resolveEdge(menu, "no_input")).toBe("goodbye");
  });

  it("evaluates business hours in a timezone", () => {
    const node: IvrNode = {
      id: "hours",
      type: "hours",
      label: "Hours",
      timezone: "UTC",
      openHour: 9,
      closeHour: 17,
      openDays: [1, 2, 3, 4, 5],
      edges: [],
    };
    // 2024-01-01 was a Monday 12:00 UTC
    const mondayNoon = Date.UTC(2024, 0, 1, 12, 0, 0);
    expect(isWithinBusinessHours(node, mondayNoon)).toBe(true);
    const mondayNight = Date.UTC(2024, 0, 1, 20, 0, 0);
    expect(isWithinBusinessHours(node, mondayNight)).toBe(false);
  });
});

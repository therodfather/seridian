/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import {
  assertPublishableGraph,
  createBlankStep,
  defaultWorkflowGraph,
  isPublishableGraph,
  readPath,
} from "./lib/workflowGraph";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("workflowGraph", () => {
  test("rejects empty graphs for publish", () => {
    expect(isPublishableGraph(defaultWorkflowGraph())).toBe(false);
    expect(() => assertPublishableGraph(defaultWorkflowGraph())).toThrow(
      /at least one action/i,
    );
  });

  test("accepts a simple HTTP step graph", () => {
    const graph = defaultWorkflowGraph();
    const step = createBlankStep("http_request");
    step.url = "https://example.com/hook";
    graph.steps = [step];
    expect(isPublishableGraph(graph)).toBe(true);
  });

  test("readPath walks dotted keys", () => {
    expect(readPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(readPath({ a: 1 }, "missing")).toBeUndefined();
  });
});

describe("workflows CRUD", () => {
  test("admin can create, save, publish, and run", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.workflows.create, {
      currentUserId: "admin",
      name: "Webhook demo",
    });

    const step = createBlankStep("create_issue");
    step.issueTitle = "From workflow";
    step.issueDescription = "hello";

    await t.mutation(api.workflows.saveDraft, {
      currentUserId: "admin",
      workflowId: id,
      name: "Webhook demo",
      draftGraph: {
        trigger: { type: "manual" },
        steps: [step],
      },
    });

    const published = await t.mutation(api.workflows.publish, {
      currentUserId: "admin",
      workflowId: id,
    });
    expect(published.version).toBe(1);

    const runId = await t.mutation(api.workflows.runNow, {
      currentUserId: "admin",
      workflowId: id,
    });
    expect(runId).toBeTruthy();

    await t.finishAllScheduledFunctions(async () => {});

    const runs = await t.query(api.workflows.listRuns, {
      currentUserId: "admin",
      workflowId: id,
    });
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]?.status).toBe("succeeded");
  });

  test("guest cannot list workflows", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.workflows.list, { currentUserId: "guest-user" }),
    ).rejects.toThrow(/Unauthorized/i);
  });
});

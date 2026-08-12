/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("issues", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("create then list returns the issue", async () => {
    const issueId = await t.mutation(api.issues.create, {
      title: "Fix search hrefs",
      description: "Command palette should open the record",
      status: "todo",
      priority: "high",
      labels: ["dashboard"],
    });

    const listed = await t.query(api.issues.list, {});
    expect(listed.some((issue) => issue._id === issueId)).toBe(true);
    const created = listed.find((issue) => issue._id === issueId);
    expect(created).toMatchObject({
      title: "Fix search hrefs",
      status: "todo",
      priority: "high",
    });
  });

  test("list filters by status", async () => {
    await t.mutation(api.issues.create, {
      title: "Backlog item",
      description: "later",
      status: "backlog",
      priority: "low",
      labels: [],
    });
    await t.mutation(api.issues.create, {
      title: "In progress item",
      description: "now",
      status: "in_progress",
      priority: "urgent",
      labels: [],
    });

    const inProgress = await t.query(api.issues.list, { status: "in_progress" });
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].title).toBe("In progress item");
  });

  test("get returns a created issue", async () => {
    const issueId = await t.mutation(api.issues.create, {
      title: "Detail page",
      description: "open by id",
      status: "todo",
      priority: "medium",
      labels: ["nav"],
    });

    const issue = await t.query(api.issues.get, { issueId });
    expect(issue).toMatchObject({
      title: "Detail page",
      labels: ["nav"],
    });
  });
});

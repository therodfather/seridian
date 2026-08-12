/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("clients", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("create then list returns the client", async () => {
    const clientId = await t.mutation(api.clients.create, {
      name: "Ada Lovelace",
      company: "Analytical Engines",
      email: "ada@example.com",
      status: "active",
    });

    const listed = await t.query(api.clients.list, {});
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      _id: clientId,
      name: "Ada Lovelace",
      company: "Analytical Engines",
      status: "active",
    });
  });

  test("list filters by status", async () => {
    await t.mutation(api.clients.create, {
      name: "Active Co",
      company: "A",
      email: "a@example.com",
      status: "active",
    });
    await t.mutation(api.clients.create, {
      name: "Inactive Co",
      company: "B",
      email: "b@example.com",
      status: "inactive",
    });

    const active = await t.query(api.clients.list, { status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("Active Co");
  });

  test("update patches fields and get returns them", async () => {
    const clientId = await t.mutation(api.clients.create, {
      name: "Before",
      company: "Co",
      email: "before@example.com",
      status: "active",
    });

    await t.mutation(api.clients.update, {
      clientId,
      name: "After",
      status: "inactive",
    });

    const client = await t.query(api.clients.get, { clientId });
    expect(client).toMatchObject({
      name: "After",
      company: "Co",
      status: "inactive",
    });
  });

  test("remove deletes the client", async () => {
    const clientId = await t.mutation(api.clients.create, {
      name: "Gone",
      company: "Co",
      email: "gone@example.com",
      status: "active",
    });

    await t.mutation(api.clients.remove, { clientId });
    expect(await t.query(api.clients.get, { clientId })).toBeNull();
    expect(await t.query(api.clients.list, {})).toHaveLength(0);
  });
});

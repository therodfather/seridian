/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("users", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("list and get omit passwords", async () => {
    await t.mutation(api.users.upsert, {
      pubkey: "dee",
      name: "Dee",
      password: "secret",
      status: "online",
    });

    const listed = await t.query(api.users.list, {});
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty("password");
    expect(listed[0].name).toBe("Dee");

    const user = await t.query(api.users.get, { pubkey: "dee" });
    expect(user).not.toHaveProperty("password");
    expect(user?.pubkey).toBe("dee");
  });
});

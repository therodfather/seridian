/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("users functions", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("requireUser throws for unknown pubkey", async () => {
    await expect(
      t.query(internal.users.testRequireUser, { pubkey: "unknown" }),
    ).rejects.toThrow("Unauthorized: unknown user");
  });

  test("requireUser returns user for known pubkey", async () => {
    await t.mutation(api.users.upsert, {
      pubkey: "user1",
      name: "Test User",
      status: "online",
    });

    const user = await t.query(internal.users.testRequireUser, {
      pubkey: "user1",
    });
    expect(user).toMatchObject({
      pubkey: "user1",
      name: "Test User",
      status: "online",
    });
  });
});

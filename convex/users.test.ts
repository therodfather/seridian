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

  test("generateAvatarUploadUrl returns an upload URL", async () => {
    const url = await t.mutation(api.users.generateAvatarUploadUrl, {});
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  test("updateAvatar returns null for an unknown user", async () => {
    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(["avatar-bytes"]));
    });
    const result = await t.mutation(api.users.updateAvatar, {
      pubkey: "missing",
      avatarStorageId: storageId,
    });
    expect(result).toBeNull();
  });

  test("removeAvatar returns null for an unknown user", async () => {
    const result = await t.mutation(api.users.removeAvatar, {
      pubkey: "missing",
    });
    expect(result).toBeNull();
  });

  test("removeAvatar clears an existing avatar field", async () => {
    await t.mutation(api.users.upsert, {
      pubkey: "dee",
      name: "Dee",
      avatar: "https://example.com/dee.png",
      status: "offline",
    });

    const userId = await t.mutation(api.users.removeAvatar, { pubkey: "dee" });
    expect(userId).toBeDefined();

    const user = await t.query(api.users.get, { pubkey: "dee" });
    expect(user?.avatar).toBeUndefined();
  });
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("secrets vault", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("admin can save and load ciphertext via internal query", async () => {
    await t.mutation(api.secrets.setSecret, {
      name: "LINEAR_API_KEY",
      secretValue: "lin_api_test_secret_value_1234",
      category: "api",
      description: "test",
      currentUserId: "dee",
    });

    const listed = await t.query(api.secrets.listSecrets, {
      currentUserId: "dee",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("LINEAR_API_KEY");
    expect(listed[0].hasCiphertext).toBe(true);
    expect(listed[0].maskedValue).toContain("...");
    expect(JSON.stringify(listed)).not.toContain("lin_api_test_secret_value_1234");

    const value = await t.query(internal.secrets.getSecretValue, {
      name: "LINEAR_API_KEY",
    });
    expect(value).toBe("lin_api_test_secret_value_1234");

    const has = await t.query(api.secrets.hasSecret, {
      name: "LINEAR_API_KEY",
    });
    expect(has).toBe(true);
  });

  test("non-admin cannot write secrets", async () => {
    await expect(
      t.mutation(api.secrets.setSecret, {
        name: "LINEAR_API_KEY",
        secretValue: "lin_api_x",
        category: "api",
        currentUserId: "contractor",
      }),
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("integrations setup", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("defaults show github/netlify configured and linear not configured", async () => {
    const statuses = await t.query(api.integrations.listStatuses, {});
    expect(statuses.map((s) => s.provider)).toEqual([
      "github",
      "netlify",
      "linear",
    ]);
    expect(statuses.find((s) => s.provider === "linear")?.status).toBe(
      "not_configured",
    );
    expect(statuses.find((s) => s.provider === "github")?.status).toBe(
      "configured",
    );
  });

  test("admin multi-step: enable providers then complete Linear setup", async () => {
    await t.mutation(api.integrations.setEnabledProviders, {
      currentUserId: "therodfather",
      providers: ["github", "netlify", "linear"],
    });

    let statuses = await t.query(api.integrations.listStatuses, {});
    expect(statuses.find((s) => s.provider === "linear")?.enabled).toBe(true);
    expect(statuses.find((s) => s.provider === "linear")?.status).toBe(
      "not_configured",
    );

    const result = await t.mutation(api.integrations.completeLinearSetup, {
      currentUserId: "admin",
      apiKey: "lin_api_abcdef1234567890",
      teamId: "team-uuid-1",
    });
    expect(result.success).toBe(true);
    expect(result.maskedValue).toContain("...");

    statuses = await t.query(api.integrations.listStatuses, {});
    const linear = statuses.find((s) => s.provider === "linear");
    expect(linear?.status).toBe("connected");
    expect(linear?.hasSecret).toBe(true);
    expect(linear?.teamId).toBe("team-uuid-1");
    expect(JSON.stringify(statuses)).not.toContain("lin_api_abcdef1234567890");

    const vault = await t.query(internal.secrets.getSecretValue, {
      name: "LINEAR_API_KEY",
    });
    expect(vault).toBe("lin_api_abcdef1234567890");

    const config = await t.query(internal.integrations.getLinearConfig, {});
    expect(config?.enabled).toBe(true);
    expect(config?.teamId).toBe("team-uuid-1");
  });

  test("non-admin cannot complete Linear setup", async () => {
    await expect(
      t.mutation(api.integrations.completeLinearSetup, {
        currentUserId: "guest-user",
        apiKey: "lin_api_should_fail",
      }),
    ).rejects.toThrow(/Unauthorized/);
  });

  test("disconnect clears vault key and status", async () => {
    await t.mutation(api.integrations.completeLinearSetup, {
      currentUserId: "dee",
      apiKey: "lin_api_to_remove_9999",
    });
    await t.mutation(api.integrations.disconnectLinear, {
      currentUserId: "dee",
    });

    const statuses = await t.query(api.integrations.listStatuses, {});
    const linear = statuses.find((s) => s.provider === "linear");
    expect(linear?.status).toBe("not_configured");
    expect(linear?.hasSecret).toBe(false);

    const vault = await t.query(internal.secrets.getSecretValue, {
      name: "LINEAR_API_KEY",
    });
    expect(vault).toBeNull();
  });
});

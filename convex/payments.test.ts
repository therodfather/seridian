/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("payments", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("records a payment and matches it to a client by email", async () => {
    await t.mutation(api.clients.create, {
      name: "Ada Lovelace",
      company: "Analytical Engines",
      email: "ada@example.com",
      status: "active",
    });

    const result = await t.mutation(internal.payments.recordFromStripeEvent, {
      stripeEventId: "evt_1",
      eventType: "payment_intent.succeeded",
      stripePaymentIntentId: "pi_1",
      amount: 99900,
      currency: "usd",
      status: "succeeded",
      customerEmail: "ada@example.com",
    });
    expect(result.recorded).toBe(true);

    const payments = await t.query(api.payments.listRecent, {});
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      stripePaymentIntentId: "pi_1",
      amount: 99900,
      status: "succeeded",
    });
    expect(payments[0].clientId).toBeDefined();
  });

  test("leaves clientId unset when no client matches the email", async () => {
    await t.mutation(internal.payments.recordFromStripeEvent, {
      stripeEventId: "evt_2",
      eventType: "payment_intent.succeeded",
      stripePaymentIntentId: "pi_2",
      amount: 50000,
      currency: "usd",
      status: "succeeded",
      customerEmail: "stranger@example.com",
    });

    const payments = await t.query(api.payments.listRecent, {});
    expect(payments[0].clientId).toBeUndefined();
  });

  test("a retried event id is a no-op, not a duplicate payment", async () => {
    const args = {
      stripeEventId: "evt_3",
      eventType: "payment_intent.succeeded" as const,
      stripePaymentIntentId: "pi_3",
      amount: 12300,
      currency: "usd",
      status: "succeeded" as const,
    };
    const first = await t.mutation(internal.payments.recordFromStripeEvent, args);
    const second = await t.mutation(internal.payments.recordFromStripeEvent, args);

    expect(first.recorded).toBe(true);
    expect(second.recorded).toBe(false);

    const payments = await t.query(api.payments.listRecent, {});
    expect(payments).toHaveLength(1);
  });
});

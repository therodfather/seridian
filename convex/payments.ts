import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

const PAYMENT_STATUS = v.union(
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("refunded"),
);

// Called by the Stripe webhook handler in http.ts. Idempotent per Stripe
// event id — a retried delivery for an event we've already recorded is a
// no-op rather than a duplicate payment.
export const recordFromStripeEvent = internalMutation({
  args: {
    stripeEventId: v.string(),
    eventType: v.string(),
    stripePaymentIntentId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: PAYMENT_STATUS,
    description: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    proposalId: v.optional(v.id("proposals")),
    contractId: v.optional(v.id("contracts")),
  },
  handler: async (ctx, args) => {
    const alreadyProcessed = await ctx.db
      .query("stripeEvents")
      .withIndex("by_stripeEventId", (q) =>
        q.eq("stripeEventId", args.stripeEventId),
      )
      .unique();
    if (alreadyProcessed) {
      return { recorded: false, reason: "duplicate_event" as const };
    }
    await ctx.db.insert("stripeEvents", {
      stripeEventId: args.stripeEventId,
      type: args.eventType,
      receivedAt: Date.now(),
    });

    let clientId = undefined;
    if (args.customerEmail) {
      const match = await ctx.db
        .query("clients")
        .withIndex("by_email", (q) => q.eq("email", args.customerEmail!))
        .unique();
      clientId = match?._id;
    }

    const existingPayment = await ctx.db
      .query("payments")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
      )
      .unique();

    if (existingPayment) {
      await ctx.db.patch(existingPayment._id, {
        status: args.status,
        clientId: clientId ?? existingPayment.clientId,
      });
      return { recorded: true, paymentId: existingPayment._id };
    }

    const paymentId = await ctx.db.insert("payments", {
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeCustomerId: args.stripeCustomerId,
      amount: args.amount,
      currency: args.currency,
      status: args.status,
      description: args.description,
      customerEmail: args.customerEmail,
      clientId,
      proposalId: args.proposalId,
      contractId: args.contractId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "Payment Recorded",
      actor: "stripe-webhook",
      details: `${args.status} ${(args.amount / 100).toFixed(2)} ${args.currency.toUpperCase()}${clientId ? " matched to client" : " (unmatched)"}`,
      category: "payment",
      timestamp: Date.now(),
      metadata: JSON.stringify({
        stripePaymentIntentId: args.stripePaymentIntentId,
        clientId,
      }),
    });

    return { recorded: true, paymentId };
  },
});

export const listForClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(200);
  },
});

export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("payments").withIndex("by_createdAt").order("desc").take(50);
  },
});

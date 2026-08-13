import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Stripe from "stripe";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = await ctx.runQuery(
      internal.integrations.getStripeWebhookSecret,
      {},
    );
    if (!signature || !webhookSecret) {
      return new Response("Webhook not configured", { status: 500 });
    }

    const payload = await req.text();
    let event: Stripe.Event;
    try {
      // constructEventAsync uses Web Crypto (SubtleCrypto) instead of Node's
      // crypto module, which is what makes signature verification work in
      // Convex's V8 http action runtime.
      event = await Stripe.webhooks.constructEventAsync(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      return new Response(
        `Signature verification failed: ${err instanceof Error ? err.message : "unknown error"}`,
        { status: 400 },
      );
    }

    if (
      event.type !== "payment_intent.succeeded" &&
      event.type !== "payment_intent.payment_failed" &&
      event.type !== "charge.refunded"
    ) {
      return new Response(null, { status: 200 });
    }

    const object = event.data.object as Stripe.PaymentIntent | Stripe.Charge;
    const paymentIntentId =
      "payment_intent" in object && typeof object.payment_intent === "string"
        ? object.payment_intent
        : object.id;
    const status =
      event.type === "payment_intent.payment_failed"
        ? ("failed" as const)
        : event.type === "charge.refunded"
          ? ("refunded" as const)
          : ("succeeded" as const);
    const customerEmail =
      "receipt_email" in object && object.receipt_email
        ? object.receipt_email
        : undefined;
    const metadata = "metadata" in object ? object.metadata : undefined;

    await ctx.runMutation(internal.payments.recordFromStripeEvent, {
      stripeEventId: event.id,
      eventType: event.type,
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId:
        typeof object.customer === "string" ? object.customer : undefined,
      amount: object.amount,
      currency: object.currency,
      status,
      description:
        "description" in object && object.description
          ? object.description
          : undefined,
      customerEmail,
      proposalId: metadata?.proposalId
        ? (metadata.proposalId as Id<"proposals">)
        : undefined,
      contractId: metadata?.contractId
        ? (metadata.contractId as Id<"contracts">)
        : undefined,
    });

    return new Response(null, { status: 200 });
  }),
});

export default http;

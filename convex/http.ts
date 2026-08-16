import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Stripe from "stripe";
import {
  decodeClientState,
  telnyxCallAction,
  verifyTelnyxSignature,
} from "./lib/telnyxSignature";
import {
  edgeKeyFromDigits,
  executeNode,
  nextAfterSpeak,
} from "./lib/telnyxExecutor";
import { findNode, resolveEdge, type IvrGraph } from "./lib/ivrGraph";

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

http.route({
  path: "/telnyx/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.text();
    const signature =
      req.headers.get("telnyx-signature-ed25519") ??
      req.headers.get("Telnyx-Signature-Ed25519");
    const timestamp =
      req.headers.get("telnyx-timestamp") ?? req.headers.get("Telnyx-Timestamp");

    const publicKey = await ctx.runQuery(
      internal.telnyx.getPublicKeyForWebhook,
      {},
    );
    if (!publicKey) {
      return new Response("Telnyx public key not configured", { status: 500 });
    }
    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 400 });
    }

    const verified = await verifyTelnyxSignature({
      payload,
      signatureB64: signature,
      timestamp,
      publicKeyB64: publicKey,
    });
    if (!verified.ok) {
      return new Response(`Invalid signature: ${verified.reason}`, {
        status: 403,
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const root = asRecord(body);
    const data = asRecord(root?.data);
    const eventType = asString(data?.event_type);
    const eventPayload = asRecord(data?.payload);
    if (!eventType || !eventPayload) {
      return new Response(null, { status: 200 });
    }

    const callControlId = asString(eventPayload.call_control_id);
    if (!callControlId) {
      return new Response(null, { status: 200 });
    }

    const apiKey = await ctx.runQuery(internal.telnyx.getApiKeyForWebhook, {});
    if (!apiKey) {
      return new Response("Telnyx API key not configured", { status: 500 });
    }

    const fromNumber =
      asString(eventPayload.from) ?? asString(eventPayload.start_time);
    const toRaw = eventPayload.to;
    const toNumber =
      typeof toRaw === "string"
        ? toRaw
        : asString(asRecord(toRaw)?.phone_number) ??
          asString(asRecord(toRaw)?.number);

    const clientState = decodeClientState(asString(eventPayload.client_state));

    try {
      if (eventType === "call.initiated") {
        const direction = asString(eventPayload.direction);
        if (direction && direction !== "incoming") {
          return new Response(null, { status: 200 });
        }
        await telnyxCallAction(apiKey, callControlId, "answer", {});
        return new Response(null, { status: 200 });
      }

      if (eventType === "call.answered") {
        if (!toNumber) {
          return new Response(null, { status: 200 });
        }
        const published = await ctx.runQuery(internal.ivr.getPublishedByPhone, {
          phoneNumber: toNumber,
        });
        if (!published) {
          await telnyxCallAction(apiKey, callControlId, "hangup");
          return new Response(null, { status: 200 });
        }

        const result = await executeNode({
          apiKey,
          callControlId,
          flowId: published.flowId,
          versionId: published.versionId,
          graph: published.graph as IvrGraph,
          nodeId: published.graph.entryNodeId,
        });

        await ctx.runMutation(internal.ivr.upsertCallLog, {
          flowId: published.flowId,
          versionId: published.versionId,
          callControlId,
          fromNumber: asString(eventPayload.from) ?? "unknown",
          toNumber,
          status:
            result.status === "in_progress" ? "answered" : result.status,
          currentNodeId: result.currentNodeId,
          routedTo: result.routedTo,
          lastEventType: eventType,
          errorMessage: result.errorMessage,
        });
        return new Response(null, { status: 200 });
      }

      if (
        eventType === "call.speak.ended" ||
        eventType === "call.gather.ended" ||
        eventType === "call.recording.saved"
      ) {
        if (!clientState) {
          return new Response(null, { status: 200 });
        }
        const version = await ctx.runQuery(internal.ivr.getPublishedVersion, {
          versionId: clientState.versionId as Id<"ivrFlowVersions">,
        });
        if (!version) {
          return new Response(null, { status: 200 });
        }
        const graph = version.graph as IvrGraph;
        const node = findNode(graph, clientState.nodeId);

        let nextNodeId: string | undefined;
        let digitPressed: string | undefined;
        let status:
          | "in_progress"
          | "transferred"
          | "recorded"
          | "no_input"
          | "hangup"
          | "error" = "in_progress";

        if (eventType === "call.gather.ended") {
          const digits =
            asString(eventPayload.digits) ??
            asString(eventPayload.digit) ??
            "";
          digitPressed = digits || undefined;
          const statusEnded = asString(eventPayload.status);
          const key =
            statusEnded === "call_hangup"
              ? ("no_input" as const)
              : edgeKeyFromDigits(digits);
          if (key === "no_input" || key === "timeout") {
            status = "no_input";
          }
          nextNodeId = node
            ? resolveEdge(node, key) ?? resolveEdge(node, "invalid")
            : undefined;
        } else if (eventType === "call.speak.ended") {
          if (node?.type === "hangup") {
            await telnyxCallAction(apiKey, callControlId, "hangup");
            status = "hangup";
          } else if (node?.type === "voicemail") {
            // recording already started; wait for recording.saved
            status = "recorded";
          } else {
            nextNodeId = nextAfterSpeak(graph, clientState.nodeId);
          }
        } else if (eventType === "call.recording.saved") {
          status = "recorded";
          nextNodeId = node ? resolveEdge(node, "next") : undefined;
          if (!nextNodeId) {
            await telnyxCallAction(apiKey, callControlId, "hangup");
            status = "hangup";
          }
        }

        let routedTo: string | undefined;
        let currentNodeId = clientState.nodeId;

        if (nextNodeId) {
          const result = await executeNode({
            apiKey,
            callControlId,
            flowId: version.flowId,
            versionId: version.versionId,
            graph,
            nodeId: nextNodeId,
          });
          status = result.status === "in_progress" ? status : result.status;
          if (status === "in_progress" && result.status === "in_progress") {
            status = "in_progress";
          }
          currentNodeId = result.currentNodeId;
          routedTo = result.routedTo;
          if (result.errorMessage) {
            status = "error";
          }
        }

        await ctx.runMutation(internal.ivr.upsertCallLog, {
          flowId: version.flowId,
          versionId: version.versionId,
          callControlId,
          fromNumber: asString(eventPayload.from) ?? fromNumber,
          toNumber: toNumber,
          digitPressed,
          currentNodeId,
          routedTo,
          status,
          lastEventType: eventType,
        });
        return new Response(null, { status: 200 });
      }

      if (eventType === "call.hangup") {
        if (clientState) {
          await ctx.runMutation(internal.ivr.upsertCallLog, {
            flowId: clientState.flowId as Id<"ivrFlows">,
            versionId: clientState.versionId as Id<"ivrFlowVersions">,
            callControlId,
            status: "hangup",
            lastEventType: eventType,
            currentNodeId: clientState.nodeId,
          });
        }
        return new Response(null, { status: 200 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "webhook error";
      if (clientState) {
        await ctx.runMutation(internal.ivr.upsertCallLog, {
          flowId: clientState.flowId as Id<"ivrFlows">,
          versionId: clientState.versionId as Id<"ivrFlowVersions">,
          callControlId,
          status: "error",
          errorMessage: message,
          lastEventType: eventType,
        });
      }
      // Still 200 so Telnyx does not endlessly retry on logic bugs.
      console.error("Telnyx webhook error:", message);
    }

    return new Response(null, { status: 200 });
  }),
});

/**
 * Workflow webhook trigger — POST /workflows/webhook/{token}
 * Token is the secret path segment stored on the workflow document.
 */
http.route({
  pathPrefix: "/workflows/webhook/",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // ["workflows", "webhook", "{token}"]
    const token = parts[2] ?? "";
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const match = await ctx.runQuery(internal.workflows.getByWebhookToken, {
      token,
    });
    if (!match || match.status !== "live") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let payloadText = "";
    try {
      payloadText = await req.text();
    } catch {
      payloadText = "";
    }
    if (payloadText.length > 50_000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Prefer valid JSON object; otherwise wrap raw text.
    let stored = payloadText;
    if (payloadText.trim()) {
      try {
        const parsed: unknown = JSON.parse(payloadText);
        stored = JSON.stringify(parsed);
      } catch {
        stored = JSON.stringify({ raw: payloadText });
      }
    } else {
      stored = "{}";
    }

    try {
      const runId = await ctx.runMutation(internal.workflows.beginRun, {
        workflowId: match.workflowId,
        trigger: "webhook",
        triggerPayload: stored,
      });
      return new Response(JSON.stringify({ ok: true, runId }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start run";
      const status = message.includes("already in progress") ? 409 : 400;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;

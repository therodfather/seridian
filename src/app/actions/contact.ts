"use server";

import { createHmac } from "node:crypto";

const MAX_BODY_BYTES = 10_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

export type ContactInput = {
  name: string;
  email: string;
  message: string;
  company?: string;
};

export type ContactResult = { ok: boolean; error?: string };

function validate(input: ContactInput): ContactResult {
  const { name, email, message } = input;

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, error: "Name must be at least 2 characters" };
  }
  if (name.trim().length > 100) {
    return { ok: false, error: "Name too long (max 100 characters)" };
  }
  if (
    typeof email !== "string" ||
    email.trim().length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ok: false, error: "A valid email is required" };
  }
  if (typeof message !== "string" || message.trim().length < 10) {
    return { ok: false, error: "Message must be at least 10 characters" };
  }
  if (message.length > 2000) {
    return { ok: false, error: "Message too long (max 2000 characters)" };
  }
  return { ok: true };
}

export async function submitContact(input: ContactInput): Promise<ContactResult> {
  // Honeypot — pretend success so bots move on.
  if (typeof input.company === "string" && input.company.trim().length > 0) {
    return { ok: true };
  }

  if (isRateLimited("submit")) {
    return { ok: false, error: "Rate limited — please try again in a minute" };
  }

  const result = validate(input);
  if (!result.ok) return result;

  const url = process.env.CONTACT_WEBHOOK_URL;
  const secret = process.env.CONTACT_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.error("[submitContact] CONTACT_WEBHOOK_URL or CONTACT_WEBHOOK_SECRET is not configured");
    return {
      ok: false,
      error: "Contact submissions are temporarily unavailable",
    };
  }

  const payload = JSON.stringify({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    message: input.message.trim(),
    source: "seridian-lander",
    submittedAt: new Date().toISOString(),
  });

  // HMAC over `${timestamp}.${body}` — the receiver rejects anything that is not
  // signed with the shared secret (held only in both Netlify deploys' env).
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
        "X-Seridian-Signature": `t=${timestamp},v1=${signature}`,
      },
      body: payload,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[submitContact] webhook fetch failed:", err);
    return { ok: false, error: "Could not send your message — please try again" };
  }

  if (!res.ok) {
    console.error("[submitContact] webhook responded with HTTP", res.status);
    return {
      ok: false,
      error:
        res.status === 429
          ? "Rate limited — please try again in a minute"
          : "Failed to send — please try again later",
    };
  }

  return { ok: true };
}

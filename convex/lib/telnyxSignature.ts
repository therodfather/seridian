/** Telnyx Ed25519 webhook signature verification (Web Crypto). */
const MAX_SKEW_SECONDS = 300;

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    normalized.length % 4 === 0
      ? ""
      : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function verifyTelnyxSignature(args: {
  payload: string;
  signatureB64: string;
  timestamp: string;
  publicKeyB64: string;
  nowSeconds?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ts = Number(args.timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "invalid timestamp" };
  }
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  try {
    const keyBytes = base64ToBytes(args.publicKeyB64.trim());
    const sigBytes = base64ToBytes(args.signatureB64.trim());
    const message = new TextEncoder().encode(`${args.timestamp}|${args.payload}`);

    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      sigBytes,
      message,
    );
    return valid ? { ok: true } : { ok: false, reason: "bad signature" };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "verify failed",
    };
  }
}

export type CallClientState = {
  flowId: string;
  versionId: string;
  nodeId: string;
};

export function encodeClientState(state: CallClientState): string {
  const json = JSON.stringify(state);
  // btoa expects Latin1; client_state is ASCII JSON so this is fine.
  return btoa(json);
}

export function decodeClientState(
  raw: string | undefined | null,
): CallClientState | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(atob(raw));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as CallClientState).flowId !== "string" ||
      typeof (parsed as CallClientState).versionId !== "string" ||
      typeof (parsed as CallClientState).nodeId !== "string"
    ) {
      return null;
    }
    return parsed as CallClientState;
  } catch {
    return null;
  }
}

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export async function telnyxCallAction(
  apiKey: string,
  callControlId: string,
  action: string,
  body: Record<string, unknown> = {},
): Promise<void> {
  const res = await fetch(
    `${TELNYX_API_BASE}/calls/${encodeURIComponent(callControlId)}/actions/${action}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telnyx ${action} failed (${res.status}): ${text}`);
  }
}

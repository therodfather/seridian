# Contact form — how it hooks up

The contact form on `seridian.dev` does not talk to an email API directly. It hands
each submission to a **server action**, which signs it and forwards it to a
**webhook receiver** that lives on the Seridian portal deploy. The portal then
delivers the message by email. This doc covers the full path and everything the
lander (this repo) must configure.

## Architecture

```
 Visitor (seridian.dev)
   │  fills out the form in src/components/Contact.tsx (client component)
   ▼
 submitContact()  ── src/app/actions/contact.ts  ("use server", runs as a
   │               Netlify Node function — never ships to the browser)
   │   1. honeypot check (silent success for bots)
   │   2. rate limit (5 submissions / min / function instance)
   │   3. validate name / email / message
   │   4. sign the payload:
   │        timestamp = Date.now()
   │        signature = HMAC-SHA256(CONTACT_WEBHOOK_SECRET, `${timestamp}.${body}`)
   ▼
 POST  CONTACT_WEBHOOK_URL   (default: https://app.seridian.dev/api/webhooks/seridian-contact)
       Authorization: Bearer <CONTACT_WEBHOOK_SECRET>
       X-Seridian-Signature: t=<timestamp>,v1=<signature>
       Content-Type: application/json
       {"name":"…","email":"…","message":"…","source":"seridian-lander","submittedAt":"…"}
   ▼
 Portal webhook receiver (private repo) — verifies bearer + signature
 (timing-safe, ±5 min replay window), then delivers via Resend
 from hello@seridian.dev to the site owners, reply-to the submitter
   ▼
 { ok: true } → the form shows "Message sent — thank you!"
```

Who owns what:

| Concern | Owner | Where it lives |
|---|---|---|
| Form UI, validation UX, honeypot | this repo | `src/components/Contact.tsx` |
| Server-side validation, signing, forwarding | this repo | `src/app/actions/contact.ts` |
| Webhook URL + shared secret (values) | Netlify env of **both** deploys | never in any repo |
| Receiver auth, spam filtering, email delivery, recipients | private portal repo | `app.seridian.dev` |

## Setup (lander side only)

One shared secret ties the two deploys together. Generate it once, then set it in
both Netlify dashboards **out of band** — it is never committed anywhere.

### 1. Generate the shared secret

```bash
openssl rand -hex 32
```

Keep the value handy for the next step. Treat it like a password: whoever holds it
can post to the receiver.

### 2. Set the lander's Netlify env vars

```bash
bunx netlify link --name seridian

bunx netlify env:set CONTACT_WEBHOOK_URL "https://app.seridian.dev/api/webhooks/seridian-contact" \
  --context production --context deploy-preview

bunx netlify env:set CONTACT_WEBHOOK_SECRET "<the 64-hex value from step 1>" \
  --context production --context deploy-preview
```

The exact same secret must also be set on the portal's Netlify site
(`CONTACT_WEBHOOK_SECRET`) — that is the portal side's job, coordinated privately.

### 3. Redeploy

Env var changes only apply to new builds:

```bash
bunx netlify deploy --prod --build
```

### 4. Local development

Copy `.env.example` to `.env.local` and fill in the two contact vars (plus the
Convex vars, which the `/casestudies` and `/packages` pages need at build time):

```bash
# .env.local  (gitignored — never commit)
CONTACT_WEBHOOK_URL=https://app.seridian.dev/api/webhooks/seridian-contact
CONTACT_WEBHOOK_SECRET=<same 64-hex value>
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOYMENT=...
```

With the real URL + secret, `bun run dev` submissions go straight to the live
receiver — the fastest way to confirm the whole chain works.

## Worked examples

### What the server action actually sends

Reproduce a signed request by hand (useful for receiver debugging):

```bash
TS=$(date +%s)000   # unix milliseconds
BODY='{"name":"Jane Doe","email":"jane@example.com","message":"Cloud migration help, please.","source":"seridian-lander","submittedAt":"2026-09-04T12:00:00.000Z"}'

SIG=$(printf '%s.%s' "$TS" "$BODY" \
  | openssl dgst -sha256 -hmac "$CONTACT_WEBHOOK_SECRET" -hex \
  | sed 's/^.* //')

curl -sS -X POST "$CONTACT_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CONTACT_WEBHOOK_SECRET" \
  -H "X-Seridian-Signature: t=$TS,v1=$SIG" \
  -d "$BODY"
# → {"ok":true}
```

The receiver compares both the bearer token and the signature with
timing-safe equality and rejects timestamps older/newer than 5 minutes, so a
replayed or tampered request fails with `401`.

### Test the lander without the live receiver

Run this minimal stub locally and point `CONTACT_WEBHOOK_URL` at it. It performs
the same verification the portal does, so a passing stub means the lander side is
configured correctly.

Save as `webhook-stub.ts` (outside the repo) and run with `bun`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const SECRET = process.env.CONTACT_WEBHOOK_SECRET!;
const PORT = 8787;

createServer((req, res) => {
  if (req.method !== "POST") return res.writeHead(404).end();
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const expected = `Bearer ${SECRET}`;
    const auth = String(req.headers.authorization ?? "");
    const sig = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(
      String(req.headers["x-seridian-signature"] ?? "")
    );
    const eq = (a: string, b: string) =>
      a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

    const fresh = !!sig && Math.abs(Date.now() - Number(sig[1])) < 5 * 60_000;
    const valid =
      eq(auth, expected) &&
      fresh &&
      eq(sig![2], createHmac("sha256", SECRET).update(`${sig![1]}.${raw}`).digest("hex"));

    if (!valid) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
    }
    console.log("[ok] verified submission:", raw);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });
}).listen(PORT, () => console.log(`stub receiver on http://localhost:${PORT}`));
```

Then in two terminals:

```bash
# terminal 1 — stub receiver
CONTACT_WEBHOOK_SECRET=$(openssl rand -hex 32) bun webhook-stub.ts

# terminal 2 — lander pointed at the stub
CONTACT_WEBHOOK_URL=http://localhost:8787/api/webhooks/seridian-contact \
CONTACT_WEBHOOK_SECRET=<same value as terminal 1> \
bun run dev
```

Submit the form at `http://localhost:3000/#contact` — terminal 1 prints the
verified payload.

## Secret rotation

```bash
openssl rand -hex 32                        # new value
bunx netlify env:set CONTACT_WEBHOOK_SECRET "<new>" \
  --context production --context deploy-preview
# repeat on the portal's Netlify site with the SAME new value, then
bunx netlify deploy --prod --build          # lander
# ...and redeploy the portal
```

Both sides must move together — a mismatch shows up as 401s in the portal logs and
"Failed to send" in the form.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Form says "Contact submissions are temporarily unavailable" | `CONTACT_WEBHOOK_URL` or `CONTACT_WEBHOOK_SECRET` unset in the deploy env | Set both (step 2) and redeploy |
| Form says "Failed to send — please try again later" | Receiver returned 401/500/502 | Check portal function logs; most often a secret mismatch between the two sites |
| Portal logs show `401` | Secret mismatch, or server clock skew > 5 min | Rotate the secret on both sites; confirm deploy times |
| Form says "Rate limited" | More than 5 submissions/min through one function instance | Wait a minute; expected behavior |
| Honeypot filled silently "succeeds" | Bot behavior | By design — no email is sent, no error is shown |
| `bun run build` fails on `/casestudies` locally | `NEXT_PUBLIC_CONVEX_URL` missing | Copy `.env.example` → `.env.local` (see [deploy.md](deploy.md)) |

## Privacy model

This repo is public, so it contains **no** founder email addresses, no Resend
credentials, and no receiver code. Everything private lives in the portal repo and
the two Netlify dashboards. If you ever need to verify that, search this repo for
`FOUNDER_` — the only hits should be this doc explaining that there are none.

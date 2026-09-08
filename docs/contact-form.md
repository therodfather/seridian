# Contact form — how it hooks up

The contact form on `seridian.dev` does not talk to an email API directly. It hands
each submission to a **server action**, which forwards it to the portal's
**Forms backend**. The portal then delivers the message by email. This doc covers
the full path and everything the lander (this repo) must configure.

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
   ▼
 POST  CONTACT_WEBHOOK_URL   (example: https://fleet-fish-566.convex.site/forms/seridian-contact)
       Content-Type: application/json
       {"name":"…","email":"…","message":"…","source":"seridian-lander","submittedAt":"…"}
   ▼
 Portal Forms backend — a public Formspree-style endpoint
 (no Authorization/signature headers required; lander-side honeypot
 + rate limit remain the throttle). Extra JSON keys are ignored.
 A `website` honeypot key returns fake success. Delivers via Resend
 from hello@seridian.dev to the site owners, reply-to the submitter
   ▼
 { ok: true } → the form shows "Message sent — thank you!"
```

Who owns what:

| Concern | Owner | Where it lives |
|---|---|---|
| Form UI, validation UX, honeypot | this repo | `src/components/Contact.tsx` |
| Server-side validation, forwarding | this repo | `src/app/actions/contact.ts` |
| Webhook URL (value) | Netlify env of **this** deploy | never in any repo |
| Spam filtering, email delivery, recipients | portal repo + Forms backend | `fleet-fish-566.convex.site` |

## Setup (lander side only)

No shared secret. The Forms endpoint is public by design — the throttle is the
lander-side honeypot plus the per-instance rate limit, with backend-side
filtering on the portal.

### 1. Set the lander's Netlify env var

```bash
bunx netlify link --name seridian

bunx netlify env:set CONTACT_WEBHOOK_URL "https://fleet-fish-566.convex.site/forms/seridian-contact" \
  --context production --force
```

### 2. Redeploy

Env var changes only apply to new builds:

```bash
bunx netlify deploy --prod --build
```

### 3. Local development

Copy `.env.example` to `.env.local` and fill in the contact URL (plus the
Convex vars, which the `/casestudies` and `/packages` pages need at build time):

```bash
# .env.local  (gitignored — never commit)
CONTACT_WEBHOOK_URL=https://fleet-fish-566.convex.site/forms/seridian-contact
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOYMENT=...
```

`CONTACT_WEBHOOK_SECRET` is legacy/unused — deprecated, leave it blank. Do not
set a value; the old signed Next.js receiver and its shared-secret HMAC scheme
are retired.

With the real URL, `bun run dev` submissions go straight to the live
Forms backend — the fastest way to confirm the whole chain works.

## Worked examples

### What the server action actually sends

Plain JSON — reproduce by hand (useful for backend debugging):

```bash
curl -sS -X POST "https://fleet-fish-566.convex.site/forms/seridian-contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","message":"Cloud migration help, please.","source":"seridian-lander","submittedAt":"2026-09-04T12:00:00.000Z"}'
# → {"ok":true}
```

Extra keys (like `source` / `submittedAt`) are ignored by the backend. Sending a
non-empty `website` key returns fake success without delivering anything (bot
trap — the lander-side honeypot stays silent-success for the same reason).

### Test the lander without the live backend

Run this minimal stub locally and point `CONTACT_WEBHOOK_URL` at it. It accepts
the same JSON the Forms backend does — no auth headers to verify.

Save as `webhook-stub.ts` (outside the repo) and run with `bun`:

```ts
import { createServer } from "node:http";

const PORT = 8787;

createServer((req, res) => {
  if (req.method !== "POST") return res.writeHead(404).end();
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    console.log("[ok] submission:", raw);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });
}).listen(PORT, () => console.log(`stub receiver on http://localhost:${PORT}`));
```

Then in two terminals:

```bash
# terminal 1 — stub receiver
bun webhook-stub.ts

# terminal 2 — lander pointed at the stub
CONTACT_WEBHOOK_URL=http://localhost:8787/forms/seridian-contact \
bun run dev
```

Submit the form at `http://localhost:3000/#contact` — terminal 1 prints the
payload.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Form says "Contact submissions are temporarily unavailable" | `CONTACT_WEBHOOK_URL` unset in the deploy env | Set it (step 1) and redeploy |
| Form says "Failed to send — please try again later" | Backend returned 4xx/5xx, or fetch failed | Check portal Forms backend logs; confirm the URL matches `.env.example` |
| Form says "Rate limited" | More than 5 submissions/min through one function instance | Wait a minute; expected behavior |
| Honeypot filled silently "succeeds" | Bot behavior | By design — no email is sent, no error is shown |
| `bun run build` fails on `/casestudies` locally | `NEXT_PUBLIC_CONVEX_URL` missing | Copy `.env.example` → `.env.local` (see [deploy.md](deploy.md)) |

## Privacy model

This repo is public, so it contains **no** founder email addresses, no Resend
credentials, and no receiver code. Everything private lives in the portal repo and
the Netlify dashboard. If you ever need to verify that, search this repo for
`FOUNDER_` — the only hits should be this doc explaining that there are none.

# Deploy

The site deploys to Netlify as **seridian** (`seridian.netlify.app`, custom domain
`seridian.dev`). Pushes to `main` deploy automatically; PRs get Deploy Previews.

## Build pipeline

| | |
|---|---|
| Build command | `bun run build` (`next build`) |
| Output | `.next` via `@netlify/plugin-nextjs` |
| Node | 22 (`netlify.toml`) |
| Package manager | **bun only** — CI runs `bun install --frozen-lockfile` |

Server-side pieces (the contact server action in `src/app/actions/contact.ts`) run
as Netlify Functions automatically — no extra wiring.

## Environment variables (lander side)

Set via the Netlify UI or `bunx netlify-cli env:set … --context production --context deploy-preview`.

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `CONTACT_WEBHOOK_URL` | yes (form) | contact server action | `https://app.seridian.dev/api/webhooks/seridian-contact` |
| `CONTACT_WEBHOOK_SECRET` | yes (form) | contact server action | shared with the portal deploy; **never commit** |
| `NEXT_PUBLIC_CONVEX_URL` | yes (build) | `/casestudies`, `/packages` | Convex deployment URL; build prerender fails without it |
| `CONVEX_DEPLOYMENT` | local dev only | `bunx convex dev` | not needed on Netlify |

Full setup walkthrough for the contact vars:
[contact-form.md § Setup](contact-form.md#setup-lander-side-only).

Local development: `cp .env.example .env.local` and fill in the same values —
`.env.local` is gitignored.

## Deploy commands

```bash
# automatic — just push to main
git push origin main

# manual production deploy
bunx netlify deploy --prod --build

# non-production preview deploy
bunx netlify deploy --build
```

Env var changes require a fresh build/deploy to take effect.

## Post-deploy verification

1. Open the live site and submit the contact form with a real address you control.
   Expected: "Message sent — thank you!" toast.
2. Confirm the message arrived at the owner inbox (configured on the portal side).
3. Submit 6+ times in a minute to confirm the rate limit responds with
   "Rate limited — please try again in a minute".
4. Spot-check `/packages` and `/casestudies` render (they need
   `NEXT_PUBLIC_CONVEX_URL` at build time).

If step 1 fails with "temporarily unavailable", the deploy env is missing
`CONTACT_WEBHOOK_URL` / `CONTACT_WEBHOOK_SECRET` — see
[contact-form.md § Troubleshooting](contact-form.md#troubleshooting).

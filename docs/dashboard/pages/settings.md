# Settings

**URL:** `/dashboard/settings` (tabs: general, users, sync, …)

**What it does:** Org prefs, team, integrations, secrets, agents.

**Edit here**
- Page: `src/app/dashboard/settings/page.tsx` (`PageShell`)
- Integrations: `src/components/settings/PlatformConnections.tsx`
- Telnyx: `src/components/settings/TelnyxConnectCard.tsx`

**Multi-step flow:** Telnyx connect ([flow doc](../flows/telnyx.md))

**E2E must keep:** `Integrations & Sync`, `Platform connections`, `Linear sync (trial)`, `Start setup` / `Manage setup`

← [All pages](./index.md)

# Settings

**URL:** `/dashboard/settings` (tabs: general, users, sync, …)

**What it does:** Org prefs, team, integrations, secrets, agents.

**Edit here**
- Page: `src/app/dashboard/settings/page.tsx` (`PageShell`)
- Integrations: `src/components/settings/PlatformConnections.tsx`
- Telnyx: `src/components/settings/TelnyxConnectCard.tsx`
- GitHub sync controls: `src/components/sync/SyncDashboard.tsx` → `GitHubSyncSection` (GitHub only)

**Multi-step flow:** Telnyx connect ([flow doc](../flows/telnyx.md))

**Linear:** No Settings UI for Linear API keys or client-side sync. Data comes from Convex `linearSync` (vault ciphertext and/or deprecated `LINEAR_API_KEY` env). Run `bunx convex run linearSync:syncAllLinear` when needed.

**E2E must keep:** `Integrations & Sync`, `Platform connections`, `GitHub sync`, `Not connected` (money/voice cards)

← [All pages](./index.md)

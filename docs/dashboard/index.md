# Dashboard docs

How the Seridian dashboard is built so a careful non-expert can edit it.

## Quick links

- [How to use the kit](./kit.md) — `PageShell`, `EmptyState`, `FlowSteps`, `HubCard`, …
- [All pages](./pages/index.md) — one doc per dashboard area
- [All multi-step flows](./flows/index.md) — create / setup / publish wizards

## Navbar IA (what’s primary vs nested)

**Primary sidebar** (calm list in `src/lib/dashboardNav.ts` → `DASHBOARD_NAV`):

| Label | Route | Notes |
|-------|-------|--------|
| Overview | `/dashboard` | Get-started checklist + KPIs |
| Work | `/dashboard/issues` | Issues / ops board |
| Business | `/dashboard/business` | **Hub** → clients, sales, proposals, contracts, bookings, health-check |
| Knowledge | `/dashboard/knowledge` | **Hub** → wiki, brain, files, templates, arena, chat |
| Voice | `/dashboard/ivr` | IVR builder |
| Settings | `/dashboard/settings` | Tabs include Integrations & Sync |

**Not in the sidebar** (deep links still work; open from hubs, Overview, or Cmd+K):

Clients, Bookings, Sales, Proposals, Contracts, Health Check, Wiki, Second Brain, Files, Templates, LLM Arena, Chat. Legacy `/dashboard/sync` redirects into Settings → Integrations.

## Layout rule (simple)

1. **Route file** (`src/app/dashboard/.../page.tsx`) stays thin — it wires the page.
2. **Feature UI** lives in `src/components/<feature>/` — one file, one job.
3. **Shared frames** come from [`@/components/dashboard/kit`](../../src/components/dashboard/kit/README.md).

## Mom tip

Want to change a page title? Open that page’s doc under [pages](./pages/index.md), follow the “Edit here” path, change the `title` / `description` on `PageShell`.

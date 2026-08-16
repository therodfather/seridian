# Clients

**URL:** `/dashboard/clients` · detail `/dashboard/clients/[clientId]`

**What it does:** Client accounts list, KPIs, search/filters, create/edit dialog.

**Edit here**
- List frame / empty / metrics: `src/components/clients/ClientList.tsx` (`PageShell`, `MetricCards`, `Toolbar`)
- Create/edit wizard: `src/components/clients/ClientForm.tsx`
- Detail: `src/app/dashboard/clients/[clientId]/page.tsx` (`PageShell`, `BackLink`, `StatusBadge`)
- Route: `src/app/dashboard/clients/page.tsx`

**Multi-step flow:** Basics → Contacts → Review ([flow doc](../flows/clients.md))

**E2E must keep:** heading `Clients`, button `Add Client`

← [All pages](./index.md)

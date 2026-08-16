# Home / Overview

**URL:** `/dashboard`

**What it does:** Business snapshot — KPIs, recent activity, quick create client/deal, plus a **Get started** checklist (Telnyx, IVR, client, knowledge).

**Edit here**
- Frame / greeting / actions: `src/components/business/BusinessOverview.tsx` (`PageShell`)
- Checklist: `src/components/business/SetupChecklist.tsx`
- Route (thin): `src/app/dashboard/page.tsx`

**Multi-step flow:** Uses `ClientForm` / `DealForm` dialogs (see [flows](../flows/index.md)). Checklist links into hubs and Settings.

**Kit:** `PageShell` + `StatusBadge` for the live workspace header.

← [All pages](./index.md)

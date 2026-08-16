# Proposals

**URL:** `/dashboard/proposals` · detail `/dashboard/proposals/[proposalId]`

**What it does:** Commercial proposals list + create/edit wizard.

**Edit here**
- List: `src/components/proposals/ProposalList.tsx` (`PageShell`)
- Form: `src/components/proposals/ProposalForm.tsx`
- Detail: `src/app/dashboard/proposals/[proposalId]/page.tsx` (`PageShell`, `BackLink`, `StatusBadge`)
- Route: `src/app/dashboard/proposals/page.tsx`

**Multi-step flow:** Client → Scope → Pricing → Review ([flow doc](../flows/proposals.md))

**E2E must keep:** heading `Proposals`, button `New Proposal`

← [All pages](./index.md)

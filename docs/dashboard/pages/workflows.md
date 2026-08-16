# Workflows

**URL:** `/dashboard/workflows` · builder `/dashboard/workflows/[id]`

**What it does:** First-party workflow automation inside Seridian (n8n/Pipedream-style *capability*, not a fork). List drafts/live workflows, build trigger → sequential actions, publish a version, Run now / webhook / schedule, and inspect run logs.

**Edit here**
- List: `src/components/workflows/WorkflowList.tsx` (`PageShell`)
- Builder: `src/components/workflows/WorkflowBuilder.tsx` (`FlowSteps`)
- Step editor: `src/components/workflows/WorkflowStepEditor.tsx`
- Types: `src/components/workflows/workflowTypes.ts`
- Convex: `convex/workflows.ts`, `convex/workflowExecutor.ts`, `convex/lib/workflowGraph.ts`, `convex/crons.ts`, webhook in `convex/http.ts`

**Nav:** Under **Business** hub (not a primary sidebar item). Route: `ROUTES.dashboard.workflows`.

**Multi-step flow:** Name → Trigger → Steps → Review → Publish ([flow doc](../flows/workflows.md))

**Triggers (MVP)**
- Manual (Run now)
- Webhook — `POST {CONVEX_SITE_URL}/workflows/webhook/{token}`
- Schedule — interval minutes (cron tick every 1 min)

**Actions (MVP)**
- HTTP request
- Create dashboard issue
- Create Linear issue (vault / env `LINEAR_API_KEY` + teamId)
- Append client note
- Delay
- Filter (skip remaining if payload field ≠ expected)

← [All pages](./index.md)

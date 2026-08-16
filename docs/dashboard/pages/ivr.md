# IVR / Voice

**URL:** `/dashboard/ivr` · builder `/dashboard/ivr/[flowId]`

**What it does:** Inbound Telnyx Call Control menus — draft, publish, assign number.

**Edit here**
- List: `src/components/ivr/IvrFlowList.tsx` (`PageShell`)
- Builder: `src/components/ivr/IvrBuilder.tsx` (`FlowSteps`)
- Node editor: `src/components/ivr/IvrNodeInspector.tsx`
- Convex: `convex/ivr.ts`, `convex/telnyx.ts`, `convex/lib/ivrGraph.ts`

**Multi-step flow:** Name → Tree → Publish → Assign number ([flow doc](../flows/ivr.md))

**E2E must keep:** nav `IVR / Voice`, heading `IVR / Voice`

← [All pages](./index.md)

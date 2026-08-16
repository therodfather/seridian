# Flow: Workflow builder

**Steps:** Name → Trigger → Steps → Review → Publish

**Gates (harder to break):**
- Cannot advance past Name without a non-empty name
- Cannot Publish without ≥1 complete action step (server `assertPublishableGraph`)
- Schedule requires interval 5–10080 minutes
- Delete/archive and webhook rotate ask for confirm
- Run now disabled while a run is pending/running
- Empty graphs cannot go live

**File:** `src/components/workflows/WorkflowBuilder.tsx` — labels in `FLOW_STEPS`

**How to add an action type (kit-friendly):**
1. Add a literal to `workflowStepTypeValidator` in `convex/lib/workflowGraph.ts` and mirror fields on the step object.
2. Extend the same union in `convex/schema.ts` (draft + version step objects).
3. Add a blank factory + label in `src/components/workflows/workflowTypes.ts`.
4. Add form fields in `WorkflowStepEditor.tsx`.
5. Implement the case in `convex/workflowExecutor.ts` (internal mutation for DB writes; `fetch` for HTTP).
6. Document it in [pages/workflows.md](../pages/workflows.md).

← [All flows](./index.md)

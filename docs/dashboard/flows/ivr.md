# Flow: IVR builder

**Steps:** Name → Tree → Publish → Assign number

**Gates (harder to break):**
- Cannot advance past Name without a non-empty name
- Cannot Publish (or advance to Assign) without a **reachable** transfer, hangup, or voicemail from the entry node
- Transfer nodes must have destination numbers before publish
- Assign is disabled until status is `published`
- Delete node asks for confirm; primary buttons disable while mutations run
- Server also enforces exit-path via `assertHasExitPath` in `convex/lib/ivrGraph.ts`

**File:** `src/components/ivr/IvrBuilder.tsx` — labels in `IVR_FLOW_STEPS`

← [All flows](./index.md)

# Dashboard kit — edit pages without getting lost

Import shared pieces from one place:

```ts
import {
  PageShell,
  PageSection,
  EmptyState,
  LoadingBlock,
  MetricCards,
  Toolbar,
  FlowSteps,
  PageFlow,
  StatusBadge,
  BackLink,
  HubCard,
} from "@/components/dashboard/kit";
```

## How to add a new dashboard page (5 steps)

1. Create a thin route file under `src/app/dashboard/<name>/page.tsx`.
2. Put the real UI in `src/components/<name>/` (one component = one job).
3. Wrap the page in `PageShell` (title + description + primary button).
4. Use `EmptyState` when the list is empty, `LoadingBlock` while data loads.
5. If create/setup has multiple parts, use `MultiStepForm` (forms) or `PageFlow` / `FlowSteps` (page journeys).

## Mom tip

Want to change the big title or help sentence? Open the page (or list) file and find `PageShell` — edit `title` and `description` only.

Full docs map: [docs/dashboard/index.md](../../../../docs/dashboard/index.md)

# Dashboard kit

Import everything from:

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
} from "@/components/dashboard/kit";
```

Source folder: [`src/components/dashboard/kit/`](../../src/components/dashboard/kit/)

| Piece | When to use | Edit tip |
|-------|-------------|----------|
| `PageShell` | Every page frame (title + help + primary button) | Change `title` / `description` / `action` |
| `PageSection` | One job inside a page | Change section `title` |
| `EmptyState` | List has nothing yet | Change empty message + CTA |
| `LoadingBlock` | Waiting on Convex | Usually leave alone |
| `MetricCards` | KPI row | Change `items` labels/values |
| `Toolbar` | Search + filters | Put controls as children |
| `FlowSteps` / `PageFlow` | Guided multi-step journeys | Change step `label`s |
| `StatusBadge` | Draft / live / active pills | Change `tone` |
| `BackLink` | Detail → list | Change `href` / `label` |

Form wizards (Clients, Deals, Proposals, Bookings, Contracts) use `MultiStepForm` from `@/components/ui/form`, which renders `FlowSteps` for the step chrome.

See also: [flows](./flows/index.md) · [pages](./pages/index.md) · [kit README](../../src/components/dashboard/kit/README.md)

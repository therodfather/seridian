# Dashboard docs

How the Seridian dashboard is built so a careful non-expert can edit it.

## Quick links

- [How to use the kit](./kit.md) — `PageShell`, `EmptyState`, `FlowSteps`, …
- [All pages](./pages/index.md) — one doc per dashboard area
- [All multi-step flows](./flows/index.md) — create / setup / publish wizards

## Layout rule (simple)

1. **Route file** (`src/app/dashboard/.../page.tsx`) stays thin — it wires the page.
2. **Feature UI** lives in `src/components/<feature>/` — one file, one job.
3. **Shared frames** come from [`@/components/dashboard/kit`](../../src/components/dashboard/kit/README.md).

## Mom tip

Want to change a page title? Open that page’s doc under [pages](./pages/index.md), follow the “Edit here” path, change the `title` / `description` on `PageShell`.

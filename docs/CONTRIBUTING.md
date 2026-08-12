# Contributing to Seridian

Thanks for your interest in contributing. This guide covers everything you need to know to work on the Seridian codebase.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **bun** | `>=1.1` (enforced `1.4.0`) | Package manager — never use npm, yarn, or pnpm |
| **Node.js** | `22` | Pinned via `.nvmrc` |
| **Convex CLI** | Latest | Used via `bunx convex dev` |

## Development Setup

### 1. Clone and install

```bash
git clone git@github.com:therodfather/seridian.git
cd seridian
bun install
```

The `--frozen-lockfile` flag is used in CI. Locally, plain `bun install` is fine.

### 2. Environment variables

Copy the example and fill in required values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | Fine-grained PAT for contact form to GitHub Projects |
| `GITHUB_REPO` | Yes | Target repo (e.g. `therodfather/seridian`) |
| `GITHUB_PROJECT_NUMBER` | Yes | GitHub Projects v2 board number |
| `GITHUB_PROJECT_STATUS` | Recommended | Status column label for new items |
| `CONVEX_DEPLOYMENT` | Auto | Set by `bunx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | Auto | Set by `bunx convex dev` |
| `LINEAR_API_KEY` | Optional | For Linear sync features |

### 3. Start Convex dev server

```bash
bun run convex:dev
```

This generates `convex/_generated/` types and `.env.local` entries. Keep this running alongside Next.js.

### 4. Start the app

```bash
bun run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### 5. Seed demo data (optional)

```bash
bun run seed
```

> **Warning:** `seed.ts` is gitignored and runs live Convex mutations. Only run against a dev deployment.

### Quick reference

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Next.js dev server |
| `bun run convex:dev` | Convex dev server (generates types) |
| `bun run build` | Production build |
| `bun run lint` | ESLint via `next lint` |
| `bunx tsc --noEmit` | Typecheck |
| `bun run test` | Convex unit tests (vitest) |
| `bun run test:watch` | Tests in watch mode |
| `bun run seed` | Seed demo data |
| `bun run convex:deploy` | Deploy Convex functions |

---

## Branch Naming

Use descriptive names with a type prefix and slash separator:

```
<type>/<short-description>
```

| Prefix | When to use |
|--------|-------------|
| `feature/` | New functionality or significant enhancements |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, upgrades, refactoring with no behavior change |
| `docs/` | Documentation only |
| `ci/` | CI/CD pipeline changes |
| `hotfix/` | Urgent production fixes |

**Examples:**

```
feature/booking-calendar
fix/kanban-drag-drop
chore/next-16
docs/contributing-guide
ci/bun-workflow
```

**Rules:**

- Lowercase only, no spaces (use hyphens)
- Keep it short but descriptive
- Create worktrees for larger features (see `docs/LINEAR_GITHUB_WORKFLOW.md`)

---

## Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Maintenance, deps, config |
| `docs` | Documentation changes |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `ci` | CI/CD changes |
| `style` | Formatting, whitespace (no logic change) |

### Scopes (optional)

Use when the change is scoped to a specific area:

```
feat(chat): real-time Convex-powered chat
fix(tsconfig): add path mapping for convex/_generated
feat(business-ops): add bookings, sales pipeline, case studies
chore: upgrade eslint-config-next to 16.3.0
```

### Examples from this repo

```
feat(sync): Linear and GitHub Projects ingestion pipelines
fix: move SearchCommand to dashboard layout, fix Header
chore: upgrade to Next.js 16.3.0 + React 19.2.8
docs: update all references to Next.js 16.3.0
feat(tests): add TDD infrastructure and CI/CD workflows
```

**Rules:**

- Use imperative mood in the description ("add feature" not "added feature")
- Keep the first line under 72 characters
- Reference issues when applicable: `Fixes #42`, `Closes #17`

---

## Pull Request Process

### 1. Create a Linear issue first

Every PR must have a corresponding Linear issue on the **Seridian Site Refresh** project (team `SER`). Use the official Linear MCP:

```
Linear: SER-X
```

### 2. Mirror to GitHub

Create a GitHub issue linked to the Linear issue. The PR body must contain both references:

```
Linear: SER-4
Fixes #4
```

### 3. Fill out the PR template

The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires:

- **Summary** — what the PR changes, linked issues
- **Links** — Linear issue, GitHub issue, worktree path
- **Track** — check the relevant one:
  - `track:ui-kit` — `@bytecats/ui-kit` + Astryx tokens
  - `track:webgl` — WebGL hero, reduced-motion fallback
  - `track:fonts` — `next/font`, `display: swap`
  - `track:workflow` — CI, Linear/GitHub tandem
- **Screenshots / Video** — before/after, perf traces for WebGL
- **Checklist** — all items must pass

### 4. CI must pass

The PR workflow (`.github/workflows/pr.yml`) runs in this order:

1. **Lint** — `bun run lint`
2. **Typecheck** — `bunx tsc --noEmit`
3. **Build** — `bun run build`

All three must pass before merge. A `ci:passed` label is added automatically on success.

### 5. Deploy preview

Netlify posts a Deploy Preview link automatically. Test it before merging.

### Merge rules

- Squash merge to `main`
- Branch must be up to date
- All CI checks green
- Linear issue marked as "In Review" or ready to close

---

## Code Style

### General principles

- **No comments in code.** Code should be self-documenting through clear naming and structure. If a comment is absolutely necessary, explain *why*, not *what*.
- **TypeScript strict mode.** The `tsconfig.json` has `"strict": true`. Never use `any`.
- **Functional over class-based.** Prefer functions and hooks.
- **Single responsibility.** One component, one file. One function, one purpose.

### TypeScript

```typescript
// Use Id<"tableName"> for document IDs, not string
import { Id } from "./_generated/dataModel";

function getIssue(issueId: Id<"issues">) { ... }

// Type function contexts properly — never use any
import { QueryCtx, MutationCtx } from "./_generated/server";

// Prefer type inference where obvious
const items = await ctx.db.query("issues").take(100);

// Explicit types for return values and complex parameters
type IssueStats = Record<string, number>;
```

**Rules:**

- No `any` — use `unknown` and narrow with type guards
- Use `Id<"tableName">` for Convex document IDs, not `string`
- Import path alias `@/*` maps to `src/*`
- Import types from `convex/_generated/dataModel` and `convex/_generated/server`

### Tailwind CSS 4

This project uses **Tailwind CSS v4** with `@import "tailwindcss"` in `globals.css` — no `tailwind.config.*` file.

```tsx
// Use cn() utility from @bytecats/ui-kit for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)} />

// Use Seridian custom utilities defined in globals.css
<div className="gradient-text">Text with gradient</div>
<div className="card-glow">Card with glow effect</div>
<div className="grid-bg">Background with grid pattern</div>
<div className="glow-orb">Radial glow element</div>
```

**Rules:**

- Import `@bytecats/ui-kit` styles in root layout before `globals.css`
- Use `cn()` from `src/lib/utils.ts` (re-exported from ui-kit) — do not duplicate `clsx`/`tailwind-merge`
- Use Seridian design tokens from `globals.css` (`--color-seridian-*`, `--astryx-*`)
- Two theme variants: `neutral` and `stone` via `data-ui-theme`
- Dark mode uses `light-dark()` CSS function — no `.dark` class

### Component patterns

```tsx
// Server Component (default in App Router) — no "use client"
export function ComponentName({ items }: { items: Item[] }) {
  return (
    <section className="...">
      {items.map((item) => (
        <ItemCard key={item._id} item={item} />
      ))}
    </section>
  );
}

// Client Component — only when you need interactivity
"use client";

import { useState } from "react";

export function InteractiveComponent({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

**Rules:**

- Prefer Server Components — only add `"use client"` when you need hooks, event handlers, or browser APIs
- One component per file, named export
- Feature components go in `src/components/<feature>/`
- Shared UI primitives go in `src/components/ui/`
- Dashboard layout components go in `src/components/dashboard/`

### File organization

```
src/
├── app/                    # App Router pages and layouts
│   ├── layout.tsx          # Root layout (fonts, Header, Footer)
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Theme overrides and custom utilities
│   └── dashboard/          # Dashboard routes (wrapped in ConvexClientProvider)
│       ├── layout.tsx      # Dashboard layout with ConvexClientProvider
│       ├── page.tsx        # Dashboard overview
│       ├── issues/         # Issue tracker
│       └── ...
├── components/
│   ├── ui/                 # Reusable primitives (shadcn-style)
│   ├── dashboard/          # Dashboard layout and shared components
│   ├── chat/               # Real-time chat UI
│   ├── clients/            # Client management
│   ├── bookings/           # Calendar bookings
│   ├── sales/              # Sales pipeline
│   ├── proposals/          # Proposal management
│   ├── files/              # File management
│   ├── emailtemplates/     # Email templates
│   ├── casestudies/        # Case study display
│   ├── kanban/             # Drag-and-drop issue board
│   ├── sync/               # Linear/GitHub sync UI
│   └── auth/               # Authentication components
└── lib/
    └── utils.ts            # cn() re-export from ui-kit
```

---

## Testing

### Convex function tests

All Convex functions are tested with **vitest** and **convex-test** using the `edge-runtime` environment.

**Test file location:** `convex/*.test.ts` (co-located with the functions they test)

**Setup:**

```typescript
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("my feature", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest({ schema, modules });
  });

  test("creates a record", async () => {
    const id = await t.mutation(api.myModule.create, {
      name: "Test",
    });

    expect(id).toBeDefined();

    const doc = await t.query(api.myModule.get, { id });
    expect(doc?.name).toBe("Test");
  });
});
```

**Rules:**

- Always include `/// <reference types="vite/client" />` at the top of test files
- Always pass `{ schema, modules }` to `convexTest()`
- Use `beforeEach` to reset state between tests
- Test both happy paths and error cases
- Test authorization (wrong user, missing permissions)
- Test edge cases (empty arrays, null values, boundary conditions)

### Running tests

```bash
bun run test          # Single run
bun run test:watch    # Watch mode
```

### What to test

- Every Convex mutation and query should have at least one test
- Error conditions and authorization checks
- Edge cases in business logic
- Pagination behavior
- Index-based queries return correct results

---

## Convex Function Patterns

### Function types

| Type | Import | Use case |
|------|--------|----------|
| `query` | `./_generated/server` | Read-only data fetching (public API) |
| `mutation` | `./_generated/server` | Read/write operations (public API) |
| `action` | `./_generated/server` | Side effects, external APIs, Node.js runtime |
| `internalQuery` | `./_generated/server` | Private reads called by other functions |
| `internalMutation` | `./_generated/server` | Private writes called by other functions |
| `internalAction` | `./_generated/server` | Private side effects called by other functions |

### Query pattern

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("clients")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(500);
    }
    return await ctx.db.query("clients").order("desc").take(500);
  },
});
```

**Rules:**

- Always include argument validators
- Always use `.withIndex()` when querying by a non-primary key field
- Always use `.take(n)` or `.paginate()` — never `.collect()` for unbounded results
- Never read `Date.now()` inside a query — pass current time as an argument
- Use `.order("asc")` or `.order("desc")` explicitly

### Mutation pattern

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("todo"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("issues", args);
  },
});

export const update = mutation({
  args: {
    issueId: v.id("issues"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const { issueId, ...fields } = args;
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(issueId, nonUndefined);
    return issueId;
  },
});

export const remove = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.issueId);
  },
});
```

**Rules:**

- Use `v.id("tableName")` for document ID arguments — never `v.string()`
- Use `v.optional()` for optional fields in update mutations
- Filter out `undefined` values before patching
- Mutations are transactions — keep them atomic and fast
- For bulk operations exceeding transaction limits, use `ctx.scheduler.runAfter(0, ...)` to continue in a new transaction

### Action pattern

```typescript
import { action } from "./_generated/server";

export const syncExternal = action({
  args: {},
  handler: async (ctx, args) => {
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();

    // Call a mutation to persist data — actions cannot use ctx.db
    await ctx.runMutation(internal.myModule.persistData, { data });

    return null;
  },
});
```

**Rules:**

- Add `"use node";` only to files with Node.js built-in imports (fs, crypto, etc.)
- Never mix `"use node"` with queries/mutations in the same file
- Actions cannot access `ctx.db` — use `ctx.runMutation()` to persist data
- Use `fetch()` without `"use node"` when calling external APIs
- Minimize `ctx.runQuery`/`ctx.runMutation` calls from actions to reduce race condition risk

### Schema patterns

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clients: defineTable({
    name: v.string(),
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  issues: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
    ),
    clientId: v.optional(v.id("clients")),
  })
    .index("by_status", ["status"])
    .index("by_clientId", ["clientId"])
    .index("by_status_and_clientId", ["status", "clientId"]),
});
```

**Rules:**

- Always define schema in `convex/schema.ts`
- Include all index fields in the index name: `["field1", "field2"]` → `"by_field1_and_field2"`
- Never store unbounded arrays in a document field — create a separate table with a foreign key
- Use `v.union(v.literal(...))` for enum-like fields
- Add staged indexes for large tables: `.index("by_field", { fields: ["field"], staged: true })`

### Calling functions from client

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function IssueList() {
  const issues = useQuery(api.issues.list, { status: "todo" });
  const createIssue = useMutation(api.issues.create);

  if (!issues) return <div>Loading...</div>;

  return (
    <ul>
      {issues.map((issue) => (
        <li key={issue._id}>{issue.title}</li>
      ))}
    </ul>
  );
}
```

**Rules:**

- Use `api.moduleName.functionName` for public functions
- Use `internal.moduleName.functionName` for internal functions
- `useQuery` returns `undefined` while loading — always handle the loading state
- `useMutation` returns a function you call with args

---

## Vendored UI Kit

The `@bytecats/ui-kit` is vendored at `vendor/ui-kit/` with committed `dist/` artifacts. **Do not** rebuild, move, or modify the vendored `dist/` directory.

```tsx
// Import styles once in root layout (order matters)
import "@bytecats/ui-kit/styles.css";
import "./globals.css";
```

- `src/lib/utils.ts` re-exports `cn` from the kit — use it everywhere
- Package is consumed via `"file:./vendor/ui-kit"` in `package.json` (relative path only)
- See `docs/UI_KIT.md` for full details

---

## Tandem Workflow (Linear + GitHub)

See `docs/LINEAR_GITHUB_WORKFLOW.md` for the full workflow. The short version:

1. Create a **Linear issue** (team `SER`) with the work description
2. Mirror it to a **GitHub issue** with `gh issue create`
3. Create a **worktree** and branch for the work
4. PR body must contain `Linear: SER-X` and `Fixes #Y`
5. CI parses these references and auto-links everything

---

## Gotchas

- **Never use npm/yarn/pnpm.** Bun only. CI runs `bun install --frozen-lockfile`.
- **Never commit `package-lock.json`.** It drifts from `bun.lock`.
- **Never rebuild `vendor/ui-kit/dist/`.** Netlify/CI need the committed artifacts.
- **Tailwind v4** uses `@import "tailwindcss"` + `@theme` in `globals.css`. No `tailwind.config.*`.
- **`seed.ts` is gitignored.** Run `bun run seed` only against a dev deployment.
- **`.env.local` is not committed.** Copy from `.env.example` and populate locally.
- **Convex schema changes** require `bunx convex dev` to regenerate `convex/_generated/` types before the app will compile.
- **`SearchCommand` must be inside `ConvexProvider`** — dashboard routes have their own provider in `src/app/dashboard/layout.tsx`.
- **`next lint` was removed in Next 16** — the `lint` script calls `next lint` which may error. Fix by migrating to standalone ESLint if needed.

# AGENTS.md

## Package manager — bun only
- `bun@1.4.0` enforced (`packageManager` + `.bun-version`, Node `22` via `.nvmrc` / `netlify.toml`). Never use `npm`/`yarn`/`pnpm`.
- Install: `bun install --frozen-lockfile` (CI uses `oven-sh/setup-bun@v2` with this exact command).
- Do not commit `package-lock.json`. README's `npm install` is stale — use `bun`.

## Commands
- `bun run dev` — Next.js dev server (http://localhost:3000)
- `bun run lint` — `next lint` per `package.json` / CI (`next/core-web-vitals` + `next/typescript`). **Broken on Next 16**: `next lint` was removed in Next 16 (`Invalid project directory: .../lint`); `bunx eslint` also errors (circular config in `@eslint/eslintrc` compat). PR gate still runs `bun run lint` so it will fail on this branch until migrated via `npx @next/codemod@canary next-lint-to-eslint-cli .`.
- `bunx tsc --noEmit` — typecheck (no `typecheck` script; CI runs `bunx tsc --noEmit` directly)
- `bun run build` — production build (`next build`); `NEXT_TELEMETRY_DISABLED=1` in CI
- No test framework configured — no `test` script.

## CI / PR gate
- `.github/workflows/pr.yml`: `lint` → `typecheck` → `build` sequential; must all pass. `size-check` and `auto-merge-ready` depend on `ci`. Concurrency cancels in-progress runs per ref.
- PR checklist (`.github/PULL_REQUEST_TEMPLATE.md`): `bun run lint`, `bun x tsc --noEmit`, `bun run build`, `bun install --frozen-lockfile` clean, CLS/fonts/WebGL checks. Track checkboxes: `shadcn/ui`, `WebGL`, `Custom Fonts`, `Workflow/infra`.
- Netlify (`netlify.toml`): `command = "bun run build"`, `publish = ".next"`, plugin `@netlify/plugin-nextjs`. Push to `main` auto-deploys; PRs get Deploy Preview.

## Architecture
- Next.js 16 App Router + React 19 + Tailwind CSS 4 (`@tailwindcss/postcss` in `postcss.config.mjs`) + TypeScript strict (`@/*` → `src/*`).
- Single-page marketing site: `src/app/layout.tsx` (root layout, metadata, font) + `src/app/page.tsx` composes `Header` → `Hero` → `Services` → `Approach` → `Expertise` → `Contact` → `Footer`. No API routes yet; `.env.example` anticipates `/api/contact` → Linear `issueCreate`.
- `src/app/icon.tsx` — app icon route.
- Sections live in `src/components/`; global theme in `src/app/globals.css`.

## Vendored UI kit — do not break
- `@bytecats/ui-kit` is vendored at `vendor/ui-kit/` with committed `dist/` (no build step). `package.json` uses `file:./vendor/ui-kit` (relative path only — absolute `file:` paths break CI/Netlify).
- `vendor/ui-kit/package.json` exports both `.` and `./styles.css` → `./dist/styles.css`. Dependencies are externalized via `tsup` — keep `dependencies` in vendored manifest, no `prepare` script.
- Import once at app root before globals — order matters (`src/app/layout.tsx:3-4`):
  ```ts
  import "@bytecats/ui-kit/styles.css";
  import "./globals.css";
  ```
- `src/lib/utils.ts` re-exports `cn` from the kit — do not duplicate `clsx`/`tailwind-merge` logic.
- Theming: kit uses Astryx tokens + CSS `light-dark()` (no `.dark` class, respects `prefers-color-scheme`). Two kit themes `neutral`/`stone` via `data-ui-theme`. `globals.css` `:root` overrides `--astryx-color-accent` → `#06b6d4` (Seridian cyan) and dark surfaces → `#070b14`/`#172033`/`#0c1222`. Keep `@theme` Seridian palette + utilities (`.gradient-text`, `.grid-bg`, `.glow-orb`, `.card-glow`). `body` uses `bg-background text-foreground` from kit.

## Env / Linear & Convex integration
- `.env.example` & `.env.local`: `LINEAR_API_KEY` for syncing Linear data (teams, projects, labels, users, issues). Do not commit `.env.local` or secret keys.
- **Convex environment variables**: Must be configured in Convex deployment separately from local `.env.local` or Netlify env vars.
  - Set key: `bunx convex env set LINEAR_API_KEY "lin_api_..."`
  - Run sync action: `bunx convex run linearSync:syncAllLinear`
- **Netlify environment & linking**:
  - Site link: `bunx netlify link --name seridian-4ce`
  - Set env var: `bunx netlify env:set LINEAR_API_KEY "lin_api_..."`
  - Check env list: `bunx netlify env:list`

## Branches
- Active feature branches off `main`: `feature/ui-kit`, `feature/webgl`, `feature/fonts`, `feature/shadcn`, `feature/linear-sync`, `chore/next-16` (this branch — Next 15→16 bump). Check `git branch -a` before creating new work.

## Gotchas & Quirks
- `next lint` was removed in Next 16 — see Commands/lint note above; do not paper over by switching CI to `bunx eslint` without fixing compat.
- **Linear GraphQL API Schema Quirk**: In `projects` query (`SyncLinearProjects`), querying `teamId` directly on `Project` nodes causes HTTP 400. Do not request `teamId` directly on `projects` GraphQL nodes in `convex/linearSync.ts`.
- **Convex Env vs Netlify/Local Env**: Setting env vars in Netlify CLI or `.env.local` does NOT populate Convex serverless runtime env vars. You must set Convex env vars using `bunx convex env set <KEY> <VALUE>`.
- Do not add `npm`-generated lockfiles or run `npm install` — it drifts from `bun.lock`.
- Do not move or rebuild `vendor/ui-kit/dist/` — Netlify/CI need the committed artifacts.
- Tailwind v4 uses `@import "tailwindcss"` + `@theme` in `globals.css`, not `tailwind.config.*`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

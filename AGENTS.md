# AGENTS.md

## Package manager — bun only
- `bun@1.3.14` enforced (`packageManager` + `.bun-version`, Node `22` via `.nvmrc` / `netlify.toml`). Never use `npm`/`yarn`/`pnpm`.
- Install: `bun install --frozen-lockfile` (CI uses `oven-sh/setup-bun@v2` with this exact command).
- Do not commit `package-lock.json`. README's `npm install` is stale — use `bun`.

## Commands
- `bun run dev` — Next.js dev server (http://localhost:3000)
- `bun run lint` — `eslint src/` (matches CI; do not use `next lint`, removed in Next 16)
- `bun run typecheck` — `tsc --noEmit`
- `bun run test` — Vitest (Convex `edge-runtime` + `src/**/*.test.ts` unit)
- `bun run test:convex` / `bun run test:unit` — single Vitest project
- `bun run test:e2e:smoke` — Playwright Chromium smoke (`@smoke`); `bun run test:e2e` is the full suite
- `bun run build` — production build (`next build`); `NEXT_TELEMETRY_DISABLED=1` in CI

## CI / PR gate
- `.github/workflows/pr.yml`: lint → typecheck → vitest → build, then Playwright smoke on PRs (full e2e on `main`). Concurrency cancels in-progress runs per ref.
- `.github/workflows/android.yml`: `./gradlew check` on Android path changes; AAR pre-release only on `android-v*` tags.
- `.github/workflows/convex.yml`: Convex tests + tsc when `convex/**` changes.
- PR checklist (`.github/PULL_REQUEST_TEMPLATE.md`): lint, typecheck, test, e2e smoke, build, bun-only lockfile, CLS/fonts/WebGL checks.
- Netlify (`netlify.toml`): `command = "bun run build"`, plugin `@netlify/plugin-nextjs`. Push to `main` auto-deploys; PRs get Deploy Preview from Netlify Git integration.

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
  - Production site: **https://seridian.netlify.app** (Netlify project `seridian`, repo `therodfather/seridian`)
  - Site link (if you have access): `bunx netlify link --name seridian`
  - Fork preview site `seridian-4ce` tracks `4cecoder/seridian` — not canonical prod
  - Set env var: `bunx netlify env:set LINEAR_API_KEY "lin_api_..."`
  - Check env list: `bunx netlify env:list`

## Branches
- Active feature branches off `main`: `feature/ui-kit`, `feature/webgl`, `feature/fonts`, `feature/shadcn`, `feature/linear-sync`, `chore/next-16` (this branch — Next 15→16 bump). Check `git branch -a` before creating new work.

## Gotchas & Quirks
- `next lint` was removed in Next 16 — `package.json` `lint` script is `eslint src/`, matching CI.
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

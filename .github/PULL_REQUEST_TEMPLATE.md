## Summary
<!-- What does this PR change? Link related issues. Must include Linear: SER-X and Fixes #Y -->

## Links (required — tandem workflow)

| Field | Value |
|-------|-------|
| **Linear issue** | `Linear: SER-` <!-- e.g. Linear: SER-4 — https://linear.app/seridian/issue/SER-4 --> |
| **GitHub issue** | `Fixes #` <!-- e.g. Fixes #4 — mirrored via gh issue create, auto-closes on merge --> |
| **Worktree** | ` ` <!-- e.g. /tmp/wt-linear — branch feature/linear-sync (git worktree add ...) --> |
| **Linear project** | `Seridian Site Refresh` (team SER) |

> PR body **must** contain `Linear: SER-X` and `Fixes #Y` as plain text (CI and `linear-sync.yml` parse it). See `docs/LINEAR_GITHUB_WORKFLOW.md` for how to create the Linear issue via official MCP `https://mcp.linear.app/mcp` (`linear_create_issue`) and mirror with `gh issue create`.

## Track
<!-- Check one — must match Linear label + GitHub label track:* -->
- [ ] track:ui-kit (@bytecats/ui-kit + Astryx tokens — see docs/UI_KIT.md)
- [ ] track:webgl (WebGL hero, prefers-reduced-motion fallback)
- [ ] track:fonts (next/font, display:swap)
- [ ] track:workflow / infra (Linear + GitHub tandem, CI, worktrees)

## Screenshots / Video
<!-- Add before/after. For WebGL, include perf trace (FPS, JS heap). -->

## Checklist (bun only — do not use npm/yarn/pnpm)
- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (Convex + unit)
- [ ] `bun run test:e2e:smoke` passes locally (or CI Playwright smoke is green)
- [ ] `bun run build` succeeds
- [ ] `bun install --frozen-lockfile` is clean (no `package-lock.json` drift)
- [ ] Convex/ViewModel changes include or update tests in the same PR
- [ ] No layout shift (CLS) regressions
- [ ] Fonts use `display: swap` and are preloaded
- [ ] WebGL has `prefers-reduced-motion` fallback
- [ ] PR body contains `Linear: SER-X` and `Fixes #Y`
- [ ] Linear issue description contains `GitHub: #Y` and worktree path

## Preview
Netlify will post a Deploy Preview link. Also test locally: `bun install && bun run build && bun run start`.

> **Enforced:** This repo uses **bun only**. CI runs `oven-sh/setup-bun@v2` and `bun install --frozen-lockfile`. Do not commit `package-lock.json` or use `npm ci`. Official Linear MCP only: `https://mcp.linear.app/mcp` via `mcp-remote` (OAuth); fallback PAT `LINEAR_API_KEY` only if OAuth blocked — see `docs/LINEAR_GITHUB_WORKFLOW.md` and the linear skill at `~/.config/opencode/skills/linear/SKILL.md`.

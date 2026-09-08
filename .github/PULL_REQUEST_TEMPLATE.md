## Summary
<!-- What does this PR change? Link related issues with Fixes #Y -->

## Checklist (bun only — do not use npm/yarn/pnpm)
- [ ] `bun run lint` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run build` succeeds
- [ ] `bun install --frozen-lockfile` is clean (no `package-lock.json` drift)
- [ ] No layout shift (CLS) regressions
- [ ] Fonts use `display: swap` and are preloaded
- [ ] WebGL has `prefers-reduced-motion` fallback

## Preview
Netlify will post a Deploy Preview link. Also test locally: `bun install && bun run build && bun run start`.

> **Enforced:** This repo uses **bun only**. CI runs `oven-sh/setup-bun@v2` and `bun install --frozen-lockfile`. Do not commit `package-lock.json` or use `npm ci`.

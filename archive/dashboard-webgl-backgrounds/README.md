# Archived: dashboard WebGL backgrounds

Moved out of `src/` (and unwired from `wiki`, `templates`, `files`, `brain`)
on 2026-08-14. These were decorative, full-viewport `<Canvas>` overlays.

Every one of them had the same bug: react-three-fiber's own wrapper divs and
the `<canvas>` element reset inline `pointer-events` back to `auto`, breaking
out of the `pointer-events-none` ancestor div meant to let clicks pass
through — so the canvas silently ate clicks on whatever page it sat behind
(e.g. wiki sidebar articles were unclickable). See PR #85 for the root
cause and a working fix (`style={{ pointerEvents: "none" }}` on `<Canvas>`)
if these are ever revived.

Not deleted outright — kept here for reference in case the visual effect is
wanted again, done properly next time.

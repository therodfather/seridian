/**
 * Lightweight client-side guard so we skip Convex queries when a route
 * param is not a plausible document Id (avoids ArgumentValidationError crashes).
 * Convex Ids are opaque base32-ish strings; this is intentionally conservative.
 */
const CONVEX_ID_RE = /^[a-z0-9]{16,64}$/i;

export function isConvexId(value: string | null | undefined): boolean {
  if (!value) return false;
  return CONVEX_ID_RE.test(value);
}

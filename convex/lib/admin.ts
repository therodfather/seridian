/** Admin pubkey / handle gate used by secrets vault and integration setup. */
export const ADMIN_HANDLES = [
  "dee",
  "d",
  "rod",
  "admin",
  "fource",
  "therodfather",
] as const;

export function checkAdminPermission(currentUser?: string): boolean {
  if (!currentUser) return false;
  const normalized = currentUser.toLowerCase().trim();
  return ADMIN_HANDLES.some((h) => normalized.includes(h));
}

export function requireAdmin(currentUser: string): void {
  if (!checkAdminPermission(currentUser)) {
    throw new Error("Unauthorized: admin handle required");
  }
}

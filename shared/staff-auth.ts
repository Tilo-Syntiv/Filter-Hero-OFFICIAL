/**
 * Staff magic links must land on a path already on the Auth allowlist.
 * Production currently allows /login and /account, not /admin.
 * After PKCE exchange, the shopper login page sends matching staff to /admin.
 */
export const STAFF_MAGIC_LINK_PATH = "/login";
export const STAFF_AFTER_AUTH_KEY = "fh-staff-after-auth";

export function staffEmailsMatch(
  pending: string | null | undefined,
  sessionEmail: string | null | undefined,
): boolean {
  if (!pending || !sessionEmail) return false;
  return pending.trim().toLowerCase() === sessionEmail.trim().toLowerCase();
}

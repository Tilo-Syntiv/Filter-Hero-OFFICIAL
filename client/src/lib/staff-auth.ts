import {
  STAFF_AFTER_AUTH_KEY,
  STAFF_MAGIC_LINK_PATH,
  staffEmailsMatch,
} from "@shared/staff-auth";

export { STAFF_MAGIC_LINK_PATH };

export function markStaffAuthPending(email: string) {
  try {
    sessionStorage.setItem(STAFF_AFTER_AUTH_KEY, email.trim().toLowerCase());
  } catch {
    /* private mode / blocked storage */
  }
}

export function consumeStaffAuthPending(sessionEmail: string | null | undefined): boolean {
  try {
    const pending = sessionStorage.getItem(STAFF_AFTER_AUTH_KEY);
    if (!staffEmailsMatch(pending, sessionEmail)) return false;
    sessionStorage.removeItem(STAFF_AFTER_AUTH_KEY);
    return true;
  } catch {
    return false;
  }
}

export function staffMagicLinkRedirect(): string {
  return `${window.location.origin}${STAFF_MAGIC_LINK_PATH}`;
}

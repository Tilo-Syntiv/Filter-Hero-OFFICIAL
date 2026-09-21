/** Same-origin post-login path. Reject protocol-relative, absolute, and staff/API URLs. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/account";
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return "/account";
  }
  value = value.replace(/\\/g, "/");
  if (!value || value.includes("\0") || value.includes("..")) return "/account";
  if (!value.startsWith("/") || value.startsWith("//") || /[a-z][a-z0-9+.-]*:/i.test(value)) {
    return "/account";
  }
  const pathOnly = value.split(/[?#]/, 1)[0] ?? "/account";
  const normalized = pathOnly.replace(/\/{2,}/g, "/").toLowerCase();
  if (
    normalized.startsWith("/admin") ||
    normalized.startsWith("/api") ||
    normalized === "/login" ||
    normalized.startsWith("/login/")
  ) {
    return "/account";
  }
  return value;
}

/** Browser-facing headers. Apex is DNS-only to Railway, so Express must set these. */

export function buildContentSecurityPolicy(mode: "production" | "development"): string {
  const connect = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://challenges.cloudflare.com",
    "https://*.klaviyo.com",
    "https://static.klaviyo.com",
  ];
  if (mode === "development") {
    connect.push(
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://localhost:3000",
      "http://localhost:3001",
      "ws://127.0.0.1:3000",
      "ws://localhost:3000",
      "http://*.klaviyo.com",
      "http://a.klaviyo.com",
    );
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.klaviyo.com https://*.klaviyo.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connect.join(" ")}`,
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
  ];
  if (mode === "production") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaderMap(opts: {
  production: boolean;
  hsts: boolean;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": buildContentSecurityPolicy(
      opts.production ? "production" : "development",
    ),
  };
  if (opts.hsts) {
    headers["Strict-Transport-Security"] = "max-age=15552000; includeSubDomains";
  }
  return headers;
}

export const REQUIRED_SECURITY_HEADERS = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
  "Content-Security-Policy",
] as const;

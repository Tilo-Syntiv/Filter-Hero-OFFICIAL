import { Router } from "express";
import { constantContactOAuth } from "./oauth";

const STATE_COOKIE = "fh_cc_oauth_state";

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return null;
}

function clearStateCookie(production: boolean): string {
  const parts = [`${STATE_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (production) parts.push("Secure");
  return parts.join("; ");
}

function settingsRedirect(kind?: string): string {
  const origin = (
    process.env.NODE_ENV === "production"
      ? process.env.SITE_URL || "https://filterhero.net"
      : process.env.CLIENT_URL || process.env.SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const query = kind ? `?constantcontact=${encodeURIComponent(kind)}` : "?constantcontact=connected";
  return `${origin}/admin/settings${query}`;
}

/** Public Constant Contact redirect. Staff connect lives on /api/admin/constant-contact/*. */
export function constantContactRouter(): Router {
  const router = Router();

  router.get("/oauth/callback", async (req, res) => {
    const query = {
      code: typeof req.query.code === "string" ? req.query.code : null,
      state: typeof req.query.state === "string" ? req.query.state : null,
      error: typeof req.query.error === "string" ? req.query.error : null,
    };
    const production = process.env.NODE_ENV === "production";
    const cookieState = readCookie(req.header("cookie"), STATE_COOKIE);
    if (cookieState && query.state && cookieState !== query.state) {
      res.setHeader("Set-Cookie", clearStateCookie(production));
      res.redirect(302, settingsRedirect("csrf"));
      return;
    }
    try {
      const result = await constantContactOAuth.completeCallback(query);
      res.setHeader("Set-Cookie", clearStateCookie(production));
      res.redirect(302, settingsRedirect(result.ok ? "connected" : result.kind));
    } catch (err) {
      console.error("[constant-contact] callback", err);
      res.setHeader("Set-Cookie", clearStateCookie(production));
      res.redirect(302, settingsRedirect("other"));
    }
  });

  return router;
}

export { STATE_COOKIE };

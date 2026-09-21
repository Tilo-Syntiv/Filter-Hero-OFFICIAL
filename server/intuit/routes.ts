import { Router } from "express";
import { statesMatch } from "../../shared/intuit-oauth";
import { intuitOAuth } from "./oauth";

const STATE_COOKIE = "fh_intuit_oauth_state";

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
  const parts = [
    `${STATE_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (production) parts.push("Secure");
  return parts.join("; ");
}

function settingsRedirect(kind?: string): string {
  const origin = (
    process.env.NODE_ENV === "production"
      ? process.env.SITE_URL || "https://filterhero.net"
      : process.env.CLIENT_URL || process.env.SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const query = kind ? `?intuit=${encodeURIComponent(kind)}` : "?intuit=connected";
  return `${origin}/admin/settings${query}`;
}

/** Public Intuit redirect. Staff connect/status/disconnect live on /api/admin/intuit/*. */
export function intuitRouter(): Router {
  const router = Router();

  router.get("/oauth/callback", async (req, res) => {
    const query = {
      code: typeof req.query.code === "string" ? req.query.code : null,
      state: typeof req.query.state === "string" ? req.query.state : null,
      error: typeof req.query.error === "string" ? req.query.error : null,
      error_description:
        typeof req.query.error_description === "string" ? req.query.error_description : null,
      realmId: typeof req.query.realmId === "string" ? req.query.realmId : null,
    };
    const production = process.env.NODE_ENV === "production";
    const cookieState = readCookie(req.header("cookie"), STATE_COOKIE);
    if (cookieState && query.state && !statesMatch(cookieState, query.state)) {
      res.setHeader("Set-Cookie", clearStateCookie(production));
      res.redirect(302, settingsRedirect("csrf"));
      return;
    }
    try {
      const result = await intuitOAuth.completeCallback(query);
      res.setHeader("Set-Cookie", clearStateCookie(production));
      if (!result.ok) {
        res.redirect(302, settingsRedirect(result.kind));
        return;
      }
      res.redirect(302, settingsRedirect("connected"));
    } catch (err) {
      console.error("[intuit] callback", err);
      res.setHeader("Set-Cookie", clearStateCookie(production));
      res.redirect(302, settingsRedirect("error"));
    }
  });

  return router;
}

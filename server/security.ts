import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { securityHeaderMap } from "../shared/security-headers";

/**
 * Public-API hardening used by contact, CRM, and checkout.
 *
 * Error bodies are fixed strings. Raw Error.message can hold keys, emails, or
 * SQL — none of that belongs in a shopper or staff JSON response.
 */

export function isHoneypotTripped(value: string | undefined | null): boolean {
  return Boolean(value && value.trim());
}

export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<{ ok: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    // Local forms can run without a widget. Production must fail closed.
    return { ok: process.env.NODE_ENV !== "production" };
  }
  if (!token?.trim()) return { ok: false };
  try {
    const body = new URLSearchParams({ secret, response: token.trim() });
    if (ip?.trim()) body.set("remoteip", ip.trim());
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return { ok: Boolean(data.success) };
  } catch (err) {
    console.error("[turnstile] siteverify failed", err);
    return { ok: false };
  }
}

export function shouldEnforceTurnstile(
  intent: string,
  _token?: string,
): boolean {
  if (intent === "reminder") return false;
  if (process.env.NODE_ENV === "production") return true;
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function publicError(
  err: unknown,
  fallback: { code: string; message: string },
  log?: string,
): { status: number; body: { error: string; code: string } } {
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: { error: fallback.message, code: fallback.code },
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (log) console.error(log, err);
  const status = /not configured/i.test(message) ? 503 : 400;
  return {
    status,
    body: { error: fallback.message, code: fallback.code },
  };
}

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  const production = process.env.NODE_ENV === "production";
  const headers = securityHeaderMap({
    production,
    hsts: production && req.secure,
  });
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.removeHeader("X-Powered-By");
  next();
}

export function jsonBodyError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!err) {
    next();
    return;
  }
  const typed = err as { type?: string; status?: number };
  if (
    typed.type === "entity.parse.failed" ||
    (err instanceof SyntaxError && "body" in (err as object))
  ) {
    res.status(400).json({ error: "Invalid JSON.", code: "invalid_json" });
    return;
  }
  if (typed.type === "entity.too.large" || typed.status === 413) {
    res.status(413).json({ error: "Payload too large.", code: "payload_too_large" });
    return;
  }
  next(err);
}

export function unexpectedError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error("[http]", err);
  res.status(500).json({ error: "Something went wrong.", code: "internal_error" });
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Unmatched /api routes must stay JSON. Do not fall through to the SPA or Express HTML. */
export function apiNotFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found.", code: "not_found" });
}

function clientIp(req: Request): string {
  // req.ip honors `trust proxy`. Do not read X-Forwarded-For[0] ourselves —
  // a client can put a random IP first and skip the limiter.
  return req.ip || req.socket.remoteAddress || "unknown";
}

function makeLimiter(opts: {
  windowMs: number;
  max: number;
  code: string;
  message: string;
}) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = clientIp(req);
    const recent = (hits.get(ip) ?? []).filter((at) => now - at < opts.windowMs);
    if (recent.length >= opts.max) {
      res.status(429).json({ error: opts.message, code: opts.code });
      return;
    }
    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}

/** Five quote/support posts per IP per 15 minutes. */
export const contactLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: "rate_limited_contact",
  message: "Too many messages. Try again later.",
});

/** Admin console. Generous enough for a board load; tight enough for a probe. */
export const crmLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 60,
  code: "rate_limited_crm",
  message: "Too many requests.",
});

/** Same budget as the CRM — the admin console is the same staff session. */
export const adminLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 80,
  code: "rate_limited_admin",
  message: "Too many requests.",
});

export const accountLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 60,
  code: "rate_limited_account",
  message: "Too many requests.",
});

export const checkoutLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: "rate_limited_checkout",
  message: "Too many checkout attempts. Try again later.",
});

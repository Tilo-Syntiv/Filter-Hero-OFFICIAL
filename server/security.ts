import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { securityHeaderMap } from "../shared/security-headers";

/**
 * Public-API hardening used by contact, CRM, identify, track, and checkout.
 *
 * Error bodies are fixed strings. Raw Error.message can hold keys, emails, or
 * SQL — none of that belongs in a shopper or staff JSON response.
 */

const IDENTIFY_ALLOW = new Set([
  "house_type",
  "change_interval_days",
  "preferred_merv",
]);

const BLOCKED_KEYS = /^(?:__proto__|prototype|constructor)$/i;
const ALLOWED_DOLLAR_KEYS = new Set(["$value"]);
const MAX_EVENT_KEYS = 40;
const MAX_EVENT_BYTES = 8_192;
const MAX_EVENT_STRING = 2_000;
const MAX_EVENT_DEPTH = 3;
const MAX_EVENT_ARRAY = 40;

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

export function sanitizeIdentifyProperties(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (IDENTIFY_ALLOW.has(key)) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function isSafeKey(key: string): boolean {
  if (BLOCKED_KEYS.test(key)) return false;
  if (key.startsWith("$") && !ALLOWED_DOLLAR_KEYS.has(key)) return false;
  return true;
}

function sanitizeEventValue(value: unknown, depth: number): unknown {
  if (depth > MAX_EVENT_DEPTH) return undefined;
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > MAX_EVENT_STRING ? value.slice(0, MAX_EVENT_STRING) : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_EVENT_ARRAY)
      .map((item) => sanitizeEventValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (!isSafeKey(key)) continue;
      const next = sanitizeEventValue(inner, depth + 1);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return undefined;
}

export function sanitizeEventProperties(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  if (Object.keys(obj).length > MAX_EVENT_KEYS) return undefined;
  try {
    if (JSON.stringify(obj).length > MAX_EVENT_BYTES) return undefined;
  } catch {
    return undefined;
  }
  const out = sanitizeEventValue(obj, 0);
  if (!out || typeof out !== "object" || Array.isArray(out)) return undefined;
  return Object.keys(out).length ? (out as Record<string, unknown>) : undefined;
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

export const identifyLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 20,
  code: "rate_limited_identify",
  message: "Too many requests.",
});

export const trackLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 40,
  code: "rate_limited_track",
  message: "Too many requests.",
});

export const checkoutLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: "rate_limited_checkout",
  message: "Too many checkout attempts. Try again later.",
});

/** Cart freight previews. Debounced typing must not burn checkout attempts (FH-393). */
export const shippingQuoteLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 40,
  code: "rate_limited_shipping_quote",
  message: "Too many shipping quotes. Try again in a moment.",
});

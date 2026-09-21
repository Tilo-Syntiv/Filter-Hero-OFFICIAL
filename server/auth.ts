import type { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { supabaseAuthConfig } from "./db";

/**
 * Staff gate for /api/crm/* and the detailed health endpoints.
 *
 * Two conditions, both required: a valid Supabase Auth session, and an email on
 * STAFF_EMAILS. The allowlist matters because Supabase signup is open by
 * default — a valid token only proves the holder controls some inbox, not that
 * the inbox belongs here.
 *
 * Staff login is a magic link. Shoppers sign in with email and password.
 */

export type StaffActor = { id: string; email: string };
export type CustomerActor = { id: string; email: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: StaffActor;
      customer?: CustomerActor;
    }
  }
}

export function staffEmails(): string[] {
  return (process.env.STAFF_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowed = staffEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

export function isAuthConfigured(): boolean {
  const { url, anonKey } = supabaseAuthConfig();
  return Boolean(url && anonKey && staffEmails().length > 0);
}

/** Customer login only needs Auth wired. The staff allowlist is irrelevant. */
export function isCustomerAuthConfigured(): boolean {
  const { url, anonKey } = supabaseAuthConfig();
  return Boolean(url && anonKey);
}

function bearerToken(req: Request): string | undefined {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) return undefined;
  const [scheme, token] = header.split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return undefined;
  return token.trim() || undefined;
}

/**
 * Verifies the token against Supabase rather than decoding it locally. A local
 * decode would accept a revoked or already-signed-out session.
 */
async function resolveAuthUser(token: string): Promise<CustomerActor | null> {
  const { url, anonKey } = supabaseAuthConfig();
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export async function resolveStaff(token: string): Promise<StaffActor | null> {
  const user = await resolveAuthUser(token);
  if (!user || !isStaffEmail(user.email)) return null;
  return user;
}

export async function resolveCustomer(token: string): Promise<CustomerActor | null> {
  return resolveAuthUser(token);
}

export async function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isAuthConfigured()) {
    // Fail closed. An unconfigured gate must not become an open door.
    res
      .status(503)
      .json({ error: "Staff access is not configured.", code: "auth_not_configured" });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Sign in required.", code: "unauthenticated" });
    return;
  }

  let actor: StaffActor | null = null;
  try {
    actor = await resolveStaff(token);
  } catch (err) {
    console.error("[auth] token verification failed", err);
    res.status(503).json({ error: "Could not verify that session.", code: "auth_unavailable" });
    return;
  }

  if (!actor) {
    // Same body for "bad token" and "not staff" — a prober learns nothing
    // about who is on the allowlist.
    res.status(403).json({ error: "Not authorized.", code: "forbidden" });
    return;
  }

  req.staff = actor;
  next();
}

export async function requireCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isCustomerAuthConfigured()) {
    res
      .status(503)
      .json({ error: "Customer accounts are not configured.", code: "auth_not_configured" });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Sign in required.", code: "unauthenticated" });
    return;
  }

  let actor: CustomerActor | null = null;
  try {
    actor = await resolveCustomer(token);
  } catch (err) {
    console.error("[auth] customer token verification failed", err);
    res.status(503).json({ error: "Could not verify that session.", code: "auth_unavailable" });
    return;
  }

  if (!actor) {
    res.status(401).json({ error: "Sign in required.", code: "unauthenticated" });
    return;
  }

  req.customer = actor;
  next();
}

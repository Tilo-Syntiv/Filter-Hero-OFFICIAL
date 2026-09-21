import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase service-role client.
 *
 * The browser never talks to Postgres. CRM and customer-account tables are
 * RLS deny-by-default, so the only way in is this client behind
 * `requireStaff` or `requireCustomer`. That keeps one authorization path to
 * audit. Never expose this key to the client bundle.
 */

let client: SupabaseClient | null | undefined;

function isServiceRoleConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key && !key.includes("...") && !url.includes("..."));
}

export function isCrmEnabled(): boolean {
  if (process.env.CRM_DISABLE === "1") return false;
  return isServiceRoleConfigured();
}

export function isAccountEnabled(): boolean {
  if (process.env.ACCOUNT_DISABLE === "1") return false;
  return isServiceRoleConfigured();
}

function serviceRoleClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured()) return null;
  if (client !== undefined) return client;
  client = createClient(
    process.env.SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

export function getDb(): SupabaseClient | null {
  if (!isCrmEnabled()) return null;
  return serviceRoleClient();
}

export function getAccountDb(): SupabaseClient | null {
  if (!isAccountEnabled()) return null;
  return serviceRoleClient();
}

/** Test seam — drops the memoized client so env changes take effect. */
export function resetDbClient(): void {
  client = undefined;
}

export function supabaseAuthConfig(): { url: string; anonKey: string } {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim(),
    anonKey: (
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ""
    ).trim(),
  };
}

/** Why the CRM is off. Empty string means it is on. Used by the boot log so
 *  a missing key is not silent. */
export function crmDisabledReason(): string {
  if (process.env.CRM_DISABLE === "1") return "CRM_DISABLE=1";
  if (!process.env.SUPABASE_URL?.trim()) return "SUPABASE_URL is empty";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY is empty";
  if (key.includes("...")) return "SUPABASE_SERVICE_ROLE_KEY is still a placeholder";
  return "";
}

/** Why customer accounts are off. Empty string means they are on. */
export function accountDisabledReason(): string {
  if (process.env.ACCOUNT_DISABLE === "1") return "ACCOUNT_DISABLE=1";
  if (!process.env.SUPABASE_URL?.trim()) return "SUPABASE_URL is empty";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY is empty";
  if (key.includes("...")) return "SUPABASE_SERVICE_ROLE_KEY is still a placeholder";
  return "";
}

export function logCrmBoot(): void {
  const reason = crmDisabledReason();
  if (reason) {
    console.warn(`[crm] off — ${reason}. Quotes still save to leads.json.`);
  } else {
    console.log("[crm] on — staff console at /admin");
  }
  const accountReason = accountDisabledReason();
  if (accountReason) {
    console.warn(`[account] off — ${accountReason}. Shoppers can still check out as guests.`);
    return;
  }
  console.log("[account] on — customer login at /login");
}

export async function crmHealth(): Promise<{
  enabled: boolean;
  reachable: boolean;
  stages: number;
  error?: string;
}> {
  const db = getDb();
  if (!db) return { enabled: false, reachable: false, stages: 0 };
  const { count, error } = await db
    .from("crm_stages")
    .select("id", { count: "exact", head: true });
  if (error) {
    return { enabled: true, reachable: false, stages: 0, error: error.message };
  }
  return { enabled: true, reachable: true, stages: count ?? 0 };
}

export async function accountHealth(): Promise<{
  enabled: boolean;
  reachable: boolean;
  error?: string;
}> {
  const db = getAccountDb();
  if (!db) return { enabled: false, reachable: false };
  const { error } = await db
    .from("customer_profiles")
    .select("id", { count: "exact", head: true });
  if (error) {
    return { enabled: true, reachable: false, error: error.message };
  }
  return { enabled: true, reachable: true };
}

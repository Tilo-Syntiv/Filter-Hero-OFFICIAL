import "dotenv/config";
import fs from "node:fs";
import path from "path";
import { crmHealth, isCrmEnabled, resetDbClient } from "../server/db.ts";
import { isAuthConfigured, staffEmails } from "../server/auth.ts";

/**
 * Bring the CRM from "schema exists" to "the server can actually talk to it."
 *
 * The service role key is the one thing this repo cannot invent. If
 * SUPABASE_ACCESS_TOKEN is in the environment (from `npx supabase login`), we
 * write the key into `.env` without printing it. Otherwise we say exactly
 * which dashboard field to copy.
 */

const PROJECT_REF = "mayxuwlygchatgeqyhyt";
const ENV_PATH = path.resolve(process.cwd(), ".env");
const DASHBOARD_KEYS = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`;
const DASHBOARD_AUTH = `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration`;

function upsertEnv(file: string, key: string, value: string): boolean {
  if (!value) return false;
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.replace(/\s*$/, "")}\n${line}\n`;
  if (next === current) return false;
  fs.writeFileSync(file, next, "utf-8");
  return true;
}

async function fetchServiceRole(token: string): Promise<string | null> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.error(`[setup:crm] management API ${res.status}`);
    return null;
  }
  const keys = (await res.json()) as Array<{ name?: string; api_key?: string }>;
  return keys.find((key) => key.name === "service_role")?.api_key ?? null;
}

async function fetchLegacyAnon(token: string): Promise<string | null> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const keys = (await res.json()) as Array<{ name?: string; api_key?: string }>;
  return keys.find((key) => key.name === "anon")?.api_key ?? null;
}

async function patchAuthConfig(token: string): Promise<boolean> {
  // Site URL is always an allowed redirect. Adding /admin covers the magic-link
  // landing page even on older GoTrue builds that do not treat paths as same-origin.
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site_url: "https://filterhero.net",
        uri_allow_list: [
          "http://localhost:3000/**",
          "http://localhost:3000/admin",
          "http://localhost:3000/admin/login",
          "http://localhost:3000/login",
          "http://localhost:3000/account",
          "http://127.0.0.1:3000/**",
          "http://127.0.0.1:3000/admin",
          "https://filterhero.net/**",
          "https://filterhero.net/admin",
          "https://filterhero.net/admin/login",
          "https://filterhero.net/login",
          "https://filterhero.net/account",
        ].join(","),
        mailer_autoconfirm: false,
        enable_confirmations: true,
      }),
    },
  );
  if (!res.ok) {
    console.error(`[setup:crm] auth config ${res.status}`);
    return false;
  }
  return true;
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

  if (token) {
    const service = await fetchServiceRole(token);
    if (service) {
      const wrote = upsertEnv(ENV_PATH, "SUPABASE_SERVICE_ROLE_KEY", service);
      process.env.SUPABASE_SERVICE_ROLE_KEY = service;
      resetDbClient();
      console.log(
        wrote
          ? "[setup:crm] wrote SUPABASE_SERVICE_ROLE_KEY to .env"
          : "[setup:crm] SUPABASE_SERVICE_ROLE_KEY already present",
      );
    } else {
      console.error("[setup:crm] could not read the service_role key");
    }

    const anon = await fetchLegacyAnon(token);
    if (anon) {
      upsertEnv(ENV_PATH, "SUPABASE_ANON_KEY", anon);
      process.env.SUPABASE_ANON_KEY = anon;
    }

    const auth = await patchAuthConfig(token);
    console.log(
      auth
        ? "[setup:crm] auth redirects now allow localhost and filterhero.net /admin"
        : `[setup:crm] set Site URL + Redirect URLs by hand: ${DASHBOARD_AUTH}`,
    );
  } else if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.log(`[setup:crm] missing SUPABASE_SERVICE_ROLE_KEY`);
    console.log(`  1. Open ${DASHBOARD_KEYS}`);
    console.log(`  2. Copy the service_role secret`);
    console.log(`  3. Paste it into .env as SUPABASE_SERVICE_ROLE_KEY=...`);
    console.log(`  Or: npx supabase login  &&  set SUPABASE_ACCESS_TOKEN=...  &&  pnpm setup:crm`);
  }

  resetDbClient();
  const health = await crmHealth();
  console.log(
    `[setup:crm] crm enabled=${health.enabled} reachable=${health.reachable} stages=${health.stages}${
      health.error ? ` error=${health.error}` : ""
    }`,
  );
  console.log(
    `[setup:crm] auth configured=${isAuthConfigured()} staff=${staffEmails().length}`,
  );

  if (!health.enabled || !health.reachable) {
    process.exitCode = 1;
    if (!isCrmEnabled()) {
      console.error("[setup:crm] CRM is still off. The service role key is the missing piece.");
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

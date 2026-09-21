import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Merge customer login/account URLs into Auth → Redirect URLs.
 * Does not print tokens. GET first so existing entries stay.
 */

const PROJECT_REF = "mayxuwlygchatgeqyhyt";
const DASHBOARD = `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration`;

const REQUIRED = [
  "http://localhost:3000/login",
  "http://localhost:3000/account",
  "http://localhost:3000/admin",
  "http://localhost:3000/admin/login",
  "https://filterhero.net/login",
  "https://filterhero.net/account",
  "https://filterhero.net/admin",
  "https://filterhero.net/admin/login",
];

function accessToken(): string {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const candidates = [
    path.join(os.homedir(), "AppData", "Roaming", "supabase", "access-token"),
    path.join(os.homedir(), ".supabase", "access-token"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const value = fs.readFileSync(file, "utf-8").trim();
      if (value) return value;
    }
  }
  return "";
}

function splitList(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function authConfig(token: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Management API ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function main() {
  const token = accessToken();
  if (!token) {
    console.error("No SUPABASE_ACCESS_TOKEN. Run `npx supabase login` or set the env var.");
    console.error(`Or add the URLs by hand: ${DASHBOARD}`);
    process.exit(1);
  }

  const before = await authConfig(token);
  const current = splitList(before.uri_allow_list);
  const next = [...current];
  for (const url of REQUIRED) {
    if (!next.includes(url)) next.push(url);
  }

  if (next.length === current.length && REQUIRED.every((url) => current.includes(url))) {
    console.log("Redirect URLs already include the customer login/account paths.");
    for (const url of next) console.log(`  ${url}`);
    return;
  }

  const after = await authConfig(token, {
    method: "PATCH",
    body: JSON.stringify({ uri_allow_list: next.join(",") }),
  });

  const written = splitList(after.uri_allow_list);
  const missing = REQUIRED.filter((url) => !written.includes(url));
  console.log("Auth redirect allowlist:");
  for (const url of written) console.log(`  ${url}`);
  if (missing.length) {
    console.error(`Missing after PATCH: ${missing.join(", ")}`);
    console.error(`Set them by hand: ${DASHBOARD}`);
    process.exit(1);
  }
  console.log("Customer login/account redirects are live.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

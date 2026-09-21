import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const REQUIRED = [
  "http://localhost:3000/login",
  "http://localhost:3000/account",
  "http://localhost:3000/admin",
  "https://filterhero.net/login",
  "https://filterhero.net/account",
];
/** Optional: old emails still pointed here. App magic links now land on /login. */
const OPTIONAL = ["https://filterhero.net/admin"];
const CONTROL = "https://evil.example/phish";
const PROBE = "redirect-check-does-not-exist@filterhero.net";

function classify(message: string | undefined): "allowed" | "blocked" | "unknown" {
  if (!message) return "allowed";
  const text = message.toLowerCase();
  if (text.includes("redirect") || text.includes("allow list") || text.includes("allowlist")) {
    return "blocked";
  }
  return "unknown";
}

async function main() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !service || service.includes("...")) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let failed = false;
  for (const redirect of [...REQUIRED, ...OPTIONAL, CONTROL]) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: PROBE,
      options: { redirectTo: redirect },
    });
    const expectedBlock = redirect === CONTROL;
    const optional = OPTIONAL.includes(redirect);
    const returned = data?.properties?.redirect_to || "";
    const matches = !error && returned === redirect;
    const status = error
      ? classify(error.message)
      : matches
        ? "allowed"
        : "blocked";
    const ok = expectedBlock ? status === "blocked" : matches;
    if (!ok && !optional) failed = true;
    const label = ok ? "ok" : optional ? "WARN" : "FAIL";
    const note = error?.message
      || (matches ? "redirect accepted" : `rejected, fell back to ${returned || "site URL"}`);
    console.log(`${label.padEnd(4)}  ${status.padEnd(8)} ${redirect}  (${note})`);
  }

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const probe = listed.users.find((user) => user.email === PROBE);
  if (probe) {
    const { error } = await admin.auth.admin.deleteUser(probe.id);
    if (error) {
      console.error(`Could not delete probe user: ${error.message}`);
      failed = true;
    }
  }

  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

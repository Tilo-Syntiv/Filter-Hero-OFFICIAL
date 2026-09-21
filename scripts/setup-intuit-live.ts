import "dotenv/config";
import { spawn } from "node:child_process";

const PRODUCTION_REDIRECT = "https://filterhero.net/api/intuit/oauth/callback";

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes("..."));
}

function setRailway(name: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("railway", ["variable", "set", name, "--stdin"], {
      stdio: ["pipe", "ignore", "pipe"],
      shell: true,
    });
    child.stdin.write(value);
    child.stdin.end();
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${name} railway set failed (${code})${err ? `: ${err.trim()}` : ""}`));
    });
  });
}

async function main() {
  const clientId = (process.env.INTUIT_PRODUCTION_CLIENT_ID || "").trim();
  const clientSecret = (process.env.INTUIT_PRODUCTION_CLIENT_SECRET || "").trim();
  if (!present(clientId) || !present(clientSecret)) {
    throw new Error("Set INTUIT_PRODUCTION_CLIENT_ID and INTUIT_PRODUCTION_CLIENT_SECRET in .env");
  }

  await setRailway("INTUIT_CLIENT_ID", clientId);
  await setRailway("INTUIT_CLIENT_SECRET", clientSecret);
  await setRailway("INTUIT_ENVIRONMENT", "production");
  await setRailway("INTUIT_REDIRECT_URI", PRODUCTION_REDIRECT);

  console.log("Railway Intuit vars set for production.");
  console.log(`  client_id: ${clientId.slice(0, 6)}…${clientId.slice(-4)}`);
  console.log("  environment: production");
  console.log(`  redirect_uri: ${PRODUCTION_REDIRECT}`);
  console.log("Add that exact URI on Intuit Keys & OAuth → Production, then Connect on https://filterhero.net/admin/settings");
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

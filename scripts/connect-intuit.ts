import "dotenv/config";
import { createIntuitOAuth, intuitConfigFromEnv } from "../server/intuit/oauth.ts";

function redactId(value: string): string {
  if (value.length < 12) return "(set)";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

async function probeClient(clientId: string, clientSecret: string, tokenEndpoint: string) {
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: "fh-key-probe",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    error_description?: string;
  };
  const error = (body.error || "").toLowerCase();
  if (error === "invalid_client" || res.status === 401) {
    throw new Error("Intuit rejected the Client ID / Secret (invalid_client).");
  }
  if (error !== "invalid_grant" && res.status !== 400) {
    throw new Error(`Unexpected token probe HTTP ${res.status} (${error || "no error"})`);
  }
}

async function main() {
  const config = intuitConfigFromEnv();
  if (!config) {
    throw new Error("INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET are missing.");
  }
  await probeClient(config.clientId, config.clientSecret, config.tokenEndpoint);

  const oauth = createIntuitOAuth();
  const started = oauth.startConnect("info@filterhero.net");
  if (!started.ok) {
    throw new Error(started.message);
  }

  console.log("Intuit client accepted.");
  console.log(`  client_id: ${redactId(config.clientId)}`);
  console.log(`  environment: ${config.environment}`);
  console.log(`  redirect_uri: ${config.redirectUri}`);
  console.log(`  authorize: ${started.data.url}`);
  console.log("Open that URL, sign in to Intuit, and pick the company.");
  console.log("Intuit must list this exact Redirect URI on the app.");
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

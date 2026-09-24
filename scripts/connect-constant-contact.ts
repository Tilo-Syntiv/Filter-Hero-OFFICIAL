import "dotenv/config";
import { CC_TOKEN_ENDPOINT } from "../shared/constant-contact-oauth.ts";
import {
  constantContactConfigFromEnv,
  createConstantContactOAuth,
} from "../server/constant-contact/oauth.ts";

function redactId(value: string): string {
  if (value.length < 12) return "(set)";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

async function probeClient(clientId: string, clientSecret: string) {
  const res = await fetch(CC_TOKEN_ENDPOINT, {
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
    throw new Error("Constant Contact rejected the API key or client secret (invalid_client).");
  }
  if (error !== "invalid_grant" && res.status !== 400) {
    throw new Error(`Unexpected token probe HTTP ${res.status} (${error || "no error"})`);
  }
}

async function main() {
  const config = constantContactConfigFromEnv();
  if (!config) {
    throw new Error("CONSTANT_CONTACT_CLIENT_ID and CONSTANT_CONTACT_CLIENT_SECRET are missing.");
  }
  await probeClient(config.clientId, config.clientSecret);
  const oauth = createConstantContactOAuth();
  const started = oauth.startConnect("info@filterhero.net");
  if (!started.ok) throw new Error(started.message);
  console.log("Constant Contact client accepted.");
  console.log(`  client_id: ${redactId(config.clientId)}`);
  console.log(`  redirect_uri: ${config.redirectUri}`);
  console.log(`  authorize: ${started.data.url}`);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

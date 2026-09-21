import "dotenv/config";
import { spawn } from "node:child_process";
import Stripe from "stripe";
import {
  SHOP_FULFILLMENT_EVENTS,
  SHOP_FULFILLMENT_WEBHOOK_URL,
  shopFulfillmentWebhookAllowed,
} from "../shared/stripe-accounts.ts";
import { scrubConflictingStripeWebhooks, stripeAccountContext } from "../server/stripe-webhooks.ts";

function last4(secret: string | null | undefined): string {
  if (!secret) return "none";
  return secret.slice(-4);
}

function setRailwayWebhookSecret(secret: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "railway",
      ["variable", "set", "STRIPE_WEBHOOK_SECRET", "--stdin"],
      { stdio: ["pipe", "ignore", "pipe"], shell: true },
    );
    child.stdin.write(secret);
    child.stdin.end();
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += String(chunk);
    });
    child.on("error", (spawnErr) => {
      reject(spawnErr);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`railway variable set failed (${code})${err ? `: ${err.trim()}` : ""}`));
    });
  });
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("...")) {
    throw new Error("STRIPE_SECRET_KEY must be set");
  }

  const stripe = new Stripe(key);
  const rotate = process.argv.includes("--rotate");
  const ctx = await stripeAccountContext(stripe);
  const scrubbed = await scrubConflictingStripeWebhooks(stripe);
  if (scrubbed.deleted.length) {
    console.log(`Removed conflicting webhook(s): ${scrubbed.deleted.join(", ")}`);
  }
  if (!shopFulfillmentWebhookAllowed({ accountId: ctx.accountId, livemode: ctx.livemode })) {
    console.log(
      `This key is ${ctx.accountName || ctx.accountId} (${ctx.livemode ? "live" : "test"}). Production fulfillment stays on FILTER HERO live only.`,
    );
    console.log("Local Checkout uses `stripe listen --forward-to localhost:3001/api/stripe/webhook`.");
    console.log("Do not point a sandbox or test-mode endpoint at https://filterhero.net/api/stripe/webhook.");
    await enableGooglePay(stripe);
    return;
  }
  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  let endpoint = hooks.data.find((hook) => hook.url === SHOP_FULFILLMENT_WEBHOOK_URL);
  if (rotate && endpoint) {
    await stripe.webhookEndpoints.del(endpoint.id);
    console.log(`Deleted ${endpoint.id} so a new signing secret can be stored on Railway`);
    endpoint = undefined;
  }

  if (endpoint && endpoint.status === "enabled") {
    const enabled = endpoint;
    const missing = SHOP_FULFILLMENT_EVENTS.filter((event) => !enabled.enabled_events.includes(event));
    if (missing.length) {
      endpoint = await stripe.webhookEndpoints.update(enabled.id, {
        enabled_events: [...SHOP_FULFILLMENT_EVENTS],
      });
      console.log(`Updated ${endpoint.id} events (+${missing.join(",")})`);
    } else {
      console.log(`Webhook already enabled: ${enabled.id} → ${enabled.url}`);
    }
    console.log(`Signing secret is only shown when the endpoint is created. last4 of env STRIPE_WEBHOOK_SECRET=${last4(process.env.STRIPE_WEBHOOK_SECRET)}`);
  } else if (endpoint && endpoint.status !== "enabled") {
    endpoint = await stripe.webhookEndpoints.update(endpoint.id, { disabled: false });
    console.log(`Re-enabled ${endpoint.id} → ${endpoint.url}`);
  } else {
    endpoint = await stripe.webhookEndpoints.create({
      url: SHOP_FULFILLMENT_WEBHOOK_URL,
      enabled_events: [...SHOP_FULFILLMENT_EVENTS],
      description: "Filter Hero Checkout fulfillment",
    });
    const secret = endpoint.secret;
    if (!secret) {
      throw new Error("Stripe created the endpoint but did not return a signing secret");
    }
    console.log(`Created ${endpoint.id} → ${endpoint.url}`);
    console.log(`Signing secret last4=${last4(secret)}`);
    try {
      await setRailwayWebhookSecret(secret);
      console.log("Railway STRIPE_WEBHOOK_SECRET updated.");
    } catch (err) {
      console.warn(err instanceof Error ? err.message : err);
      console.log("Set Railway STRIPE_WEBHOOK_SECRET from Dashboard → Webhooks → reveal.");
    }
    console.log("Do not overwrite local .env if you use `stripe listen` — that secret is different.");
  }

  await enableGooglePay(stripe);
}

async function enableGooglePay(stripe: Stripe): Promise<void> {
  try {
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 10 });
    const pmcId =
      configs.data.find((cfg) => cfg.is_default && !cfg.application)?.id ??
      configs.data.find((cfg) => cfg.is_default)?.id ??
      configs.data[0]?.id;
    if (!pmcId) {
      console.warn("No payment method configuration to update");
      return;
    }
    const pmc = await stripe.paymentMethodConfigurations.update(pmcId, {
      google_pay: { display_preference: { preference: "on" } },
    });
    console.log(`Google Pay display preference=${pmc.google_pay?.display_preference?.value}`);
  } catch (err) {
    console.warn("Could not enable Google Pay on the default PMC", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

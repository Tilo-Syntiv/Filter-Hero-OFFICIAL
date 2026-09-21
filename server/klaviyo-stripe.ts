import {
  KLAVIYO_STRIPE_EVENTS,
  KLAVIYO_STRIPE_INSTALL_URL,
  KLAVIYO_STRIPE_OAUTH_ACCOUNT_ID,
  isKlaviyoStripeWebhookUrl,
  klaviyoStripeWebhookUrl,
} from "../shared/klaviyo-stripe";
import { FILTER_HERO_ACCOUNT_ID, klaviyoNativeWebhookAllowed } from "../shared/stripe-accounts";
import { getKlaviyoAccount, klaviyoPublicKey } from "./klaviyo";
import { getStripe } from "./stripe";
import { readStripeWebhookHealth, scrubConflictingStripeWebhooks } from "./stripe-webhooks";

export type KlaviyoStripeStatus = {
  shopEvents: true;
  configured: boolean;
  nativeWebhook: boolean;
  fulfillmentConflict: boolean;
  nativeConflict: boolean;
  url: string | null;
  connectUrl: string;
  companyId: string;
  stripeAccountId: string | null;
  stripeAccountName: string | null;
  webhookId: string | null;
  oauthAccountMatch: boolean;
};

function last4(secret: string | null | undefined): string | null {
  if (!secret) return null;
  return secret.slice(-4);
}

export async function resolveKlaviyoCompanyId(): Promise<string> {
  const fromEnv = klaviyoPublicKey();
  try {
    const account = await getKlaviyoAccount();
    if (account.ok && account.publicKey) return account.publicKey;
    if (account.ok && account.accountId) return account.accountId;
  } catch (err) {
    console.warn("[klaviyo-stripe] account ping failed", err);
  }
  if (fromEnv) return fromEnv;
  throw new Error("Set KLAVIYO_PUBLIC_API_KEY or KLAVIYO_PRIVATE_API_KEY");
}

function emptyStatus(
  companyId: string,
  expected: string | null,
  extra: Partial<KlaviyoStripeStatus> = {},
): KlaviyoStripeStatus {
  return {
    shopEvents: true,
    configured: false,
    nativeWebhook: false,
    fulfillmentConflict: false,
    nativeConflict: false,
    url: expected,
    connectUrl: KLAVIYO_STRIPE_INSTALL_URL,
    companyId,
    stripeAccountId: null,
    stripeAccountName: null,
    webhookId: null,
    oauthAccountMatch: false,
    ...extra,
  };
}

export async function klaviyoStripeStatus(): Promise<KlaviyoStripeStatus> {
  const companyId = klaviyoPublicKey();
  const expected = companyId ? klaviyoStripeWebhookUrl(companyId) : null;
  const stripe = getStripe();
  if (!stripe) return emptyStatus(companyId, expected);
  try {
    const listed = await readStripeWebhookHealth(stripe);
    const found = listed.hooks.find(
      (hook) => isKlaviyoStripeWebhookUrl(hook.url) && hook.status === "enabled",
    );
    const stripeAccountId = listed.accountId || null;
    return {
      shopEvents: true,
      configured: true,
      nativeWebhook: Boolean(found) && klaviyoNativeWebhookAllowed(stripeAccountId),
      fulfillmentConflict: listed.health.shop.conflict,
      nativeConflict: listed.health.klaviyo.conflict,
      url: found?.url || expected,
      connectUrl: KLAVIYO_STRIPE_INSTALL_URL,
      companyId,
      stripeAccountId,
      stripeAccountName: listed.accountName,
      webhookId: found?.id || null,
      oauthAccountMatch: stripeAccountId === KLAVIYO_STRIPE_OAUTH_ACCOUNT_ID,
    };
  } catch (err) {
    console.error("[klaviyo-stripe] list webhooks", err);
    return emptyStatus(companyId, expected, { configured: true });
  }
}

export async function ensureKlaviyoStripeWebhook(opts?: {
  rotate?: boolean;
}): Promise<{
  id: string;
  url: string;
  created: boolean;
  secret: string | null;
  secretLast4: string | null;
  connectUrl: string;
}> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const scrubbed = await scrubConflictingStripeWebhooks(stripe);
  if (!klaviyoNativeWebhookAllowed(scrubbed.accountId)) {
    throw new Error(
      `Klaviyo Stripe Connect must use FILTER HERO (${FILTER_HERO_ACCOUNT_ID}). This key is ${scrubbed.accountId}. Sandboxes cannot OAuth to live Klaviyo.`,
    );
  }
  const companyId = await resolveKlaviyoCompanyId();
  const url = klaviyoStripeWebhookUrl(companyId);
  const events = [...KLAVIYO_STRIPE_EVENTS];
  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  let existing = hooks.data.find((hook) => isKlaviyoStripeWebhookUrl(hook.url));
  if (opts?.rotate && existing) {
    await stripe.webhookEndpoints.del(existing.id);
    existing = undefined;
  }

  if (existing && existing.status === "enabled") {
    const missing = events.filter((event) => !existing.enabled_events.includes(event));
    const endpoint =
      missing.length || existing.url !== url
        ? await stripe.webhookEndpoints.update(existing.id, {
            url,
            enabled_events: events,
          })
        : existing;
    return {
      id: endpoint.id,
      url: endpoint.url,
      created: false,
      secret: null,
      secretLast4: null,
      connectUrl: KLAVIYO_STRIPE_INSTALL_URL,
    };
  }

  if (existing && existing.status !== "enabled") {
    const endpoint = await stripe.webhookEndpoints.update(existing.id, {
      disabled: false,
      url,
      enabled_events: events,
    });
    return {
      id: endpoint.id,
      url: endpoint.url,
      created: false,
      secret: null,
      secretLast4: null,
      connectUrl: KLAVIYO_STRIPE_INSTALL_URL,
    };
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: events,
    description: "Klaviyo Stripe app (charges + invoices)",
  });
  return {
    id: endpoint.id,
    url: endpoint.url,
    created: true,
    secret: endpoint.secret || null,
    secretLast4: last4(endpoint.secret),
    connectUrl: KLAVIYO_STRIPE_INSTALL_URL,
  };
}

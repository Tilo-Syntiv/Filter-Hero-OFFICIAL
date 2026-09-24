import type Stripe from "stripe";
import {
  classifyStripeWebhookUrl,
  shopFulfillmentWebhookAllowed,
  stripeWebhookHealth,
} from "../shared/stripe-accounts";

export async function stripeAccountContext(stripe: Stripe): Promise<{
  accountId: string;
  accountName: string | null;
  livemode: boolean;
}> {
  const [account, balance] = await Promise.all([
    stripe.accounts.retrieve(),
    stripe.balance.retrieve(),
  ]);
  return {
    accountId: account.id,
    accountName:
      account.settings?.dashboard?.display_name || account.business_profile?.name || null,
    livemode: balance.livemode === true,
  };
}

/**
 * Drop shop fulfillment endpoints that do not belong on this Stripe key, and
 * drop every Klaviyo charge/invoice endpoint. Sandbox keys must not post to
 * filterhero.net.
 */
export async function scrubConflictingStripeWebhooks(stripe: Stripe): Promise<{
  accountId: string;
  livemode: boolean;
  deleted: string[];
}> {
  const { accountId, livemode } = await stripeAccountContext(stripe);
  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  const deleted: string[] = [];
  for (const hook of hooks.data) {
    const kind = classifyStripeWebhookUrl(hook.url);
    const dropShop =
      kind === "shop" && !shopFulfillmentWebhookAllowed({ accountId, livemode });
    const dropKlaviyo = kind === "klaviyo";
    if (!dropShop && !dropKlaviyo) continue;
    await stripe.webhookEndpoints.del(hook.id);
    deleted.push(hook.id);
  }
  return { accountId, livemode, deleted };
}

export async function readStripeWebhookHealth(stripe: Stripe) {
  const { accountId, accountName, livemode } = await stripeAccountContext(stripe);
  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  return {
    accountId,
    accountName,
    livemode,
    health: stripeWebhookHealth({
      accountId,
      livemode,
      hooks: hooks.data.map((hook) => ({ url: hook.url, status: hook.status })),
    }),
    hooks: hooks.data,
  };
}

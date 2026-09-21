import type Stripe from "stripe";
import {
  classifyStripeWebhookUrl,
  isFilterHeroAccount,
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
 * Drop shop fulfillment and Klaviyo native endpoints that do not belong on
 * this Stripe key. Sandbox / test keys must not post to filterhero.net or
 * impersonate the live Klaviyo OAuth account.
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
    const dropKlaviyo = kind === "klaviyo" && !isFilterHeroAccount(accountId);
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

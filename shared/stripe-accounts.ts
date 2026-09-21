/**
 * Stripe account + webhook ownership. Shop fulfillment and Klaviyo's native
 * app must not share events or sit on the sandbox key.
 *
 * FILTER HERO live (`acct_1U9bqlQEENEs0Qmw`) is the only account that may
 * post `checkout.session.*` to filterhero.net. Local sandbox uses
 * `stripe listen`. Klaviyo OAuth is the same FILTER HERO account — never
 * FILTER HERO sandbox.
 */

import { isKlaviyoStripeWebhookUrl } from "./klaviyo-stripe";

export const FILTER_HERO_ACCOUNT_ID = "acct_1U9bqlQEENEs0Qmw";
export const FILTER_HERO_SANDBOX_ACCOUNT_ID = "acct_1U9bqs790NnFGDLv";

export const SHOP_FULFILLMENT_WEBHOOK_URL = "https://filterhero.net/api/stripe/webhook";
export const SHOP_FULFILLMENT_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
] as const;

export type StripeWebhookKind = "shop" | "klaviyo" | "other";

export function isFilterHeroAccount(accountId: string | null | undefined): boolean {
  return accountId === FILTER_HERO_ACCOUNT_ID;
}

export function isFilterHeroSandboxAccount(accountId: string | null | undefined): boolean {
  return accountId === FILTER_HERO_SANDBOX_ACCOUNT_ID;
}

/** Production Checkout fulfillment is live FILTER HERO only. */
export function shopFulfillmentWebhookAllowed(input: {
  accountId: string | null | undefined;
  livemode: boolean;
}): boolean {
  return isFilterHeroAccount(input.accountId) && input.livemode === true;
}

/** Native charge/invoice webhook is FILTER HERO only (test or live). */
export function klaviyoNativeWebhookAllowed(accountId: string | null | undefined): boolean {
  return isFilterHeroAccount(accountId);
}

export function isShopFulfillmentWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "filterhero.net" &&
      parsed.pathname === "/api/stripe/webhook"
    );
  } catch {
    return false;
  }
}

export function classifyStripeWebhookUrl(url: string): StripeWebhookKind {
  if (isShopFulfillmentWebhookUrl(url)) return "shop";
  if (isKlaviyoStripeWebhookUrl(url)) return "klaviyo";
  return "other";
}

export function stripeWebhookHealth(input: {
  accountId: string | null | undefined;
  livemode: boolean;
  hooks: Array<{ url: string; status: string }>;
}): {
  shop: { present: boolean; conflict: boolean };
  klaviyo: { present: boolean; conflict: boolean };
} {
  const shop = input.hooks.some(
    (hook) => classifyStripeWebhookUrl(hook.url) === "shop" && hook.status === "enabled",
  );
  const klaviyo = input.hooks.some(
    (hook) => classifyStripeWebhookUrl(hook.url) === "klaviyo" && hook.status === "enabled",
  );
  return {
    shop: {
      present: shop,
      conflict: shop && !shopFulfillmentWebhookAllowed(input),
    },
    klaviyo: {
      present: klaviyo,
      conflict: klaviyo && !klaviyoNativeWebhookAllowed(input.accountId),
    },
  };
}

/**
 * Native Klaviyo Stripe app. Charge/invoice webhooks are additive to Filter
 * Hero's own Checkout webhook (Placed Order / Checkout Expired).
 *
 * Do not trigger replenish, abandoned checkout, or a second receipt from
 * Successfully Paid. Resend + Stripe already send the order confirmation.
 */

export const KLAVIYO_STRIPE_INSTALL_URL = "https://www.klaviyo.com/integration/stripe";

/** Stripe account Klaviyo OAuth can connect. Stripe Sandboxes are ineligible. */
export const KLAVIYO_STRIPE_OAUTH_ACCOUNT_ID = "acct_1U9bqlQEENEs0Qmw";

export const KLAVIYO_STRIPE_EVENTS = [
  "charge.captured",
  "charge.expired",
  "charge.failed",
  "charge.pending",
  "charge.refunded",
  "charge.succeeded",
  "charge.updated",
  "invoice.created",
  "invoice.deleted",
  "invoice.finalized",
  "invoice.marked_uncollectible",
  "invoice.payment_action_required",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
  "invoice.sent",
  "invoice.upcoming",
  "invoice.updated",
  "invoice.voided",
] as const;

export function klaviyoStripeWebhookUrl(companyId: string): string {
  const id = companyId.trim();
  if (!id) throw new Error("Klaviyo company id is required");
  return `https://a.klaviyo.com/api/webhook/integration/stripe?c=${encodeURIComponent(id)}`;
}

export function isKlaviyoStripeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "a.klaviyo.com" &&
      parsed.pathname === "/api/webhook/integration/stripe"
    );
  } catch {
    return false;
  }
}

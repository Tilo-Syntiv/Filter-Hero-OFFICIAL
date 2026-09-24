/**
 * One shopper message, one sender.
 *
 * Resend = transactional (we already have the relationship).
 * Stripe = payment receipt only.
 * CRM    = staff pipeline in Postgres. Never mail.
 *
 * Welcome, abandon, nurture, replenish, and win-back have no sender (FH-369).
 * The previous Klaviyo mapping is in `archive/klaviyo/`. Do not send those
 * from `server/mailer.ts`. Do not import the mailer from `server/crm/`.
 */

export type ContactIntent = "quote" | "support" | "reminder";

export type EmailChannel = "resend" | "stripe" | "none";

export type ShopperMessage =
  | "staff_lead_alert"
  | "lead_alert"
  | "quote_receipt"
  | "support_receipt"
  | "clock_cadence"
  | "order_confirmation"
  | "stripe_receipt"
  | "welcome"
  | "abandoned_checkout"
  | "post_purchase_nurture"
  | "replenish"
  | "winback";

export const EMAIL_OWNER: Record<ShopperMessage, EmailChannel> = {
  staff_lead_alert: "resend",
  lead_alert: "resend",
  quote_receipt: "resend",
  support_receipt: "resend",
  clock_cadence: "none",
  order_confirmation: "resend",
  stripe_receipt: "stripe",
  welcome: "none",
  abandoned_checkout: "none",
  post_purchase_nurture: "none",
  replenish: "none",
  winback: "none",
};

/** CRM records work. It is never a sender — a third mailbox re-opens FH-171. */
export const CRM_SENDS_MAIL = false;

/** Resend may email the shopper for quote/support only. Clock saves are staff-only. */
export function resendSendsShopperReceipt(intent: ContactIntent): boolean {
  return intent === "quote" || intent === "support";
}

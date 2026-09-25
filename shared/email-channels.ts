/**
 * One shopper message, one sender.
 *
 * Resend = transactional (we already have the relationship).
 * Klaviyo = marketing events and flows.
 * Stripe = payment receipt only.
 * CRM    = staff pipeline in Postgres. Never mail.
 *
 * Welcome, abandon, nurture, replenish, and win-back are Klaviyo (FH-380).
 * Constant Contact stays connected for integrations Klaviyo does not run.
 * It must not send those five series. Do not send them from `server/mailer.ts`.
 * Do not import the mailer from `server/crm/`.
 */

export type ContactIntent = "quote" | "support" | "reminder";

export type EmailChannel = "resend" | "klaviyo" | "stripe" | "constant_contact" | "none";

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
  | "winback"
  | "back_in_stock";

export const EMAIL_OWNER: Record<ShopperMessage, EmailChannel> = {
  staff_lead_alert: "resend",
  lead_alert: "resend",
  quote_receipt: "resend",
  support_receipt: "resend",
  clock_cadence: "none",
  order_confirmation: "resend",
  stripe_receipt: "stripe",
  welcome: "klaviyo",
  abandoned_checkout: "klaviyo",
  post_purchase_nurture: "klaviyo",
  replenish: "klaviyo",
  winback: "klaviyo",
  /** Shopper asked to be told when a specific size × MERV returns — Resend only. */
  back_in_stock: "resend",
};

/**
 * Replenish automations read this date. Written only on a one-time paid order.
 * Filter Clock stores its calculator date as `CLOCK_NEXT_CHANGE_PROPERTY`.
 */
export const REPLENISH_DATE_PROPERTY = "next_change_date";
export const CLOCK_NEXT_CHANGE_PROPERTY = "clock_next_change_date";

/** CRM records work. It is never a sender — a third mailbox re-opens FH-171. */
export const CRM_SENDS_MAIL = false;

/** Resend may email the shopper for quote/support only. Clock saves are staff-only. */
export function resendSendsShopperReceipt(intent: ContactIntent): boolean {
  return intent === "quote" || intent === "support";
}

/**
 * Marketing list join. Clock never subscribes — replenish starts on Placed Order.
 */
export function klaviyoMaySubscribe(input: {
  intent: ContactIntent;
  marketingConsent?: boolean;
}): boolean {
  if (input.intent === "reminder") return false;
  return input.marketingConsent === true;
}

export function klaviyoMetricForIntent(intent: ContactIntent): string {
  if (intent === "reminder") return "Signed Up Reminder";
  if (intent === "support") return "Requested Support";
  return "Requested Quote";
}

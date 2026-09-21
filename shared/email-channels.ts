/**
 * One shopper message, one sender. Three systems, one job each.
 *
 * Resend = transactional (we already have the relationship).
 * Klaviyo = marketing + events (flows in the Klaviyo UI).
 * CRM     = staff pipeline in Postgres. Never mail. Never a Klaviyo write.
 * Stripe  = payment receipt only.
 *
 * Do not add abandon / welcome / replenish / win-back to `server/mailer.ts`.
 * Do not send a second order confirmation or quote receipt from a Klaviyo flow.
 * Do not import the mailer or Klaviyo from `server/crm/`.
 */

export type ContactIntent = "quote" | "support" | "reminder";

export type EmailChannel = "resend" | "klaviyo" | "stripe" | "none";

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
  welcome: "klaviyo",
  abandoned_checkout: "klaviyo",
  post_purchase_nurture: "klaviyo",
  replenish: "klaviyo",
  winback: "klaviyo",
};

/** CRM records work. It is never a sender — a third mailbox re-opens FH-171. */
export const CRM_SENDS_MAIL = false;

/**
 * Replenish flows trigger on this profile date. Written only on Placed Order.
 * Filter Clock stores the calculator date as `CLOCK_NEXT_CHANGE_PROPERTY`
 * so a cadence save cannot enroll replenish (FH-131).
 */
export const REPLENISH_DATE_PROPERTY = "next_change_date";
export const CLOCK_NEXT_CHANGE_PROPERTY = "clock_next_change_date";

/** Resend may email the shopper for quote/support only. Clock saves are staff-only. */
export function resendSendsShopperReceipt(intent: ContactIntent): boolean {
  return intent === "quote" || intent === "support";
}

/**
 * Marketing list join. Clock never subscribes — replenish starts on Placed Order (FH-131).
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

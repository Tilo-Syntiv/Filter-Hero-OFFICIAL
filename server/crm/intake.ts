import { isCrmEnabled } from "../db";
import { logActivity } from "./activities";
import { upsertContact } from "./contacts";
import { closeOpenDealsForContact, createDeal } from "./deals";
import { INTENT_TO_STAGE, SYSTEM_ACTOR, type DealSource } from "./schema";

export type IntakeLead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  filterSize?: string;
  message: string;
  intent: "quote" | "support" | "reminder";
  cartSummary?: string;
};

/** Days a new quote may sit before the board flags it. */
const FIRST_TOUCH_DAYS = 1;

function splitName(name: string): { firstName?: string; lastName?: string } {
  const trimmed = name.trim();
  if (!trimmed || /^filter clock/i.test(trimmed)) return {};
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || undefined };
}

function dealName(lead: IntakeLead): string {
  const size = lead.filterSize?.trim() || "custom";
  const who = lead.name.trim() || lead.email;
  return `Quote — ${size} — ${who}`;
}

function sourceFor(lead: IntakeLead): DealSource {
  if (lead.cartSummary?.trim()) return "cart_quote";
  if (!lead.filterSize?.trim()) return "custom_quote";
  return "quote_form";
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * Put a contact-form submission into the pipeline.
 *
 * Called after `appendLead`, inside its own try/catch, so a CRM outage can
 * never fail a shopper's submission — leads.json stays the append-only record
 * and Postgres is the queryable layer on top of it.
 *
 * Intent decides the shape:
 *   quote    → contact + deal in `new` with a next action one day out
 *   support  → contact + note, no deal (nothing to sell)
 *   reminder → nothing at all. A Filter Clock cadence save is not an
 *              opportunity, and creating a deal for it would re-open FH-131.
 */
export async function recordLeadInCrm(
  lead: IntakeLead,
): Promise<{ ok: boolean; dealId?: string; skipped?: boolean; error?: string }> {
  if (!isCrmEnabled()) return { ok: false, skipped: true, error: "crm_disabled" };

  const stage = INTENT_TO_STAGE[lead.intent];
  if (lead.intent === "reminder") return { ok: true, skipped: true };

  const { firstName, lastName } = splitName(lead.name);
  const contact = await upsertContact(
    { email: lead.email, firstName, lastName, phone: lead.phone || undefined },
    SYSTEM_ACTOR,
  );
  if (!contact.ok) return { ok: false, error: contact.error };

  if (!stage) {
    const note = await logActivity(
      {
        type: "note",
        contactId: contact.data.id,
        subject: "Support request",
        body: lead.message,
      },
      SYSTEM_ACTOR,
    );
    return note.ok ? { ok: true } : { ok: false, error: note.error };
  }

  const deal = await createDeal(
    {
      name: dealName(lead),
      contactId: contact.data.id,
      stageId: stage,
      source: sourceFor(lead),
      nextActionAt: inDays(FIRST_TOUCH_DAYS),
      leadId: lead.id,
      properties: {
        filter_size: lead.filterSize || null,
        cart_summary: lead.cartSummary || null,
      },
    },
    SYSTEM_ACTOR,
  );
  if (!deal.ok) return { ok: false, error: deal.error };

  // A retry of the same lead returns the original deal without creating one,
  // so the arrival note is written exactly once.
  if (deal.data.created) {
    await logActivity(
      {
        type: "system",
        dealId: deal.data.deal.id,
        contactId: contact.data.id,
        subject: `Quote request from ${lead.email}`,
        body: lead.message,
      },
      SYSTEM_ACTOR,
    );
  }

  return { ok: true, dealId: deal.data.deal.id };
}

/**
 * Close the pipeline on payment. The shopper buying is the only close signal
 * that matters, so a completed Stripe checkout wins every open deal for that
 * email.
 */
export async function closeDealsOnPurchase(input: {
  email: string;
  amount?: number;
  stripeCustomerId?: string;
}): Promise<{ ok: boolean; closed?: number; error?: string }> {
  if (!isCrmEnabled()) return { ok: false, error: "crm_disabled" };

  const contact = await upsertContact(
    { email: input.email, stripeCustomerId: input.stripeCustomerId },
    SYSTEM_ACTOR,
  );
  if (!contact.ok) return { ok: false, error: contact.error };

  const result = await closeOpenDealsForContact(contact.data.id, SYSTEM_ACTOR, {
    amount: input.amount,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, closed: result.data };
}

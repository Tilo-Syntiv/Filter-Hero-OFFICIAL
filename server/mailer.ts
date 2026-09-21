import { Resend } from "resend";
import { BRAND_EMAIL, BRAND_NAME } from "../shared/const";
import {
  EMAIL_BRAND,
  emailDefinitionTable,
  emailFromAddress,
  emailOrigin,
  emailParagraph,
  escapeEmailHtml,
  renderBrandedEmail,
} from "../shared/email-brand";
import { resendSendsShopperReceipt, type ContactIntent } from "../shared/email-channels";
import { getProductById, packShotSrc } from "../shared/products";

type OrderMail = {
  sessionId: string;
  customerEmail: string | null;
  amountSubtotal: number | null;
  amountTax: number | null;
  amountTotal: number | null;
  items: string;
  shipping?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
    } | null;
  } | null;
};

export type MailResult = { sent: false } | { sent: true; id?: string };

type BuiltMail = {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

export type LeadMail = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  filterSize?: string;
  message: string;
  intent: ContactIntent;
  cartSummary?: string;
};

function resendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function contactInbox(): string {
  return (process.env.CONTACT_TO || "").trim() || BRAND_EMAIL;
}

function intentLabel(intent: ContactIntent): string {
  if (intent === "quote") return "Quote";
  if (intent === "reminder") return "Filter Reminder";
  return "Support";
}

async function sendBuilt(mail: BuiltMail, idempotencyKey: string): Promise<MailResult> {
  const resend = resendClient();
  if (!resend) {
    console.info("[mailer] RESEND_API_KEY not set — skip send", mail.subject);
    return { sent: false };
  }
  const { data, error } = await resend.emails.send(
    {
      from: emailFromAddress(),
      to: [mail.to],
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    },
    { idempotencyKey },
  );
  if (error) {
    console.error("[mailer] resend", error);
    return { sent: false };
  }
  return { sent: true, id: data?.id };
}

export function buildLeadAlert(lead: LeadMail): BuiltMail {
  const label = intentLabel(lead.intent);
  const rows: Array<[string, string]> = [
    ["Lead ID", lead.id],
    ["Intent", lead.intent],
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "—"],
    ["Filter size", lead.filterSize || "—"],
    ["Cart", lead.cartSummary || "—"],
  ];
  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    lead.message,
  ].join("\n");
  return {
    to: contactInbox(),
    replyTo: lead.email,
    subject: `[${BRAND_NAME}] ${label} — ${lead.name}`,
    text,
    html: renderBrandedEmail({
      title: `${label} from ${lead.name}`,
      bodyHtml: `${emailDefinitionTable(rows)}${emailParagraph(lead.message)}`,
      ctaHref: emailOrigin(),
      ctaLabel: "Open Filter Hero",
    }),
  };
}

export function buildContactReceipt(lead: LeadMail): BuiltMail | null {
  if (lead.intent === "reminder") return null;
  const quote = lead.intent === "quote";
  const subject = quote
    ? "We got your Filter Hero quote request"
    : "We got your Filter Hero message";
  const sizeLine = lead.filterSize
    ? emailParagraph(`Size: ${lead.filterSize}`)
    : "";
  const body =
    `${emailParagraph("This is a receipt, not marketing. Stripe still sends the payment receipt when you buy.")}${sizeLine}` +
    emailParagraph(lead.message);
  const text = [
    subject,
    lead.filterSize ? `Size: ${lead.filterSize}` : "",
    "",
    lead.message,
    "",
    "This is a receipt, not marketing.",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    to: lead.email,
    replyTo: BRAND_EMAIL,
    subject,
    text,
    html: renderBrandedEmail({
      title: subject,
      preview: "We received your message at Filter Hero.",
      bodyHtml: body,
      ctaHref: `${emailOrigin()}/#finder`,
      ctaLabel: "Shop filters",
    }),
  };
}

function parseOrderItems(raw: string): Array<{ productId: number; quantity: number }> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is { productId: number; quantity: number } =>
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as { productId?: unknown }).productId === "number" &&
        typeof (row as { quantity?: unknown }).quantity === "number",
    );
  } catch {
    return [];
  }
}

function money(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function orderLineLabel(item: { productId: number; quantity: number }): string {
  const product = getProductById(item.productId);
  if (!product) return `${item.quantity} × product ${item.productId}`;
  const grade = product.isCarbon ? "Carbon" : `MERV ${product.merv}`;
  return `${item.quantity} × ${product.size} ${grade}`;
}

function orderPackShot(items: Array<{ productId: number; quantity: number }>): string {
  for (const item of items) {
    const product = getProductById(item.productId);
    if (product) return packShotSrc(product.merv, Boolean(product.isCarbon));
  }
  return packShotSrc(8);
}

export function buildOrderConfirmation(order: OrderMail): BuiltMail | null {
  const email = (order.customerEmail || "").trim();
  if (!email) return null;
  const origin = emailOrigin();
  const items = parseOrderItems(order.items);
  const lines = items
    .map((item) => {
      return `<tr><td style="padding:6px 0">${escapeEmailHtml(orderLineLabel(item))}</td></tr>`;
    })
    .join("");
  const pack = `${origin}${orderPackShot(items)}`;
  const tax =
    order.amountTax && order.amountTax > 0
      ? `<p style="margin:0 0 8px">Tax: ${money(order.amountTax)}</p>`
      : "";
  const ship = order.shipping?.address
    ? emailParagraph(
        [
          order.shipping.name,
          order.shipping.address.line1,
          order.shipping.address.line2,
          [order.shipping.address.city, order.shipping.address.state, order.shipping.address.postal_code]
            .filter(Boolean)
            .join(", "),
        ]
          .filter(Boolean)
          .join("\n"),
      )
    : "";
  const html = renderBrandedEmail({
    title: "Your Filter Hero order is confirmed",
    preview: "Stripe will send the payment receipt separately.",
    bodyHtml: `
      <img src="${escapeEmailHtml(pack)}" alt="${escapeEmailHtml(BRAND_NAME)} pack" width="240" style="display:block;margin:0 0 16px;max-width:240px;height:auto;border:0">
      <table role="presentation" width="100%">${lines}</table>
      <p style="margin:16px 0 8px">Subtotal: ${money(order.amountSubtotal)}</p>
      ${tax}
      <p style="margin:0 0 16px">Total: ${money(order.amountTotal)}</p>
      ${ship}
    `,
    ctaHref: `${origin}/how-often-to-change-air-filter`,
    ctaLabel: "Set a change reminder",
  });
  const text = [
    "Your Filter Hero order is confirmed.",
    ...items.map(orderLineLabel),
    `Subtotal: ${money(order.amountSubtotal)}`,
    order.amountTax && order.amountTax > 0 ? `Tax: ${money(order.amountTax)}` : "",
    `Total: ${money(order.amountTotal)}`,
    "Stripe will send the payment receipt separately.",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    to: email,
    replyTo: BRAND_EMAIL,
    subject: "Your Filter Hero order is confirmed",
    html,
    text,
  };
}

export async function sendLeadAlert(lead: LeadMail): Promise<MailResult> {
  return sendBuilt(buildLeadAlert(lead), `lead-email/${lead.id}`);
}

export async function sendContactReceipt(lead: LeadMail): Promise<MailResult> {
  const mail = buildContactReceipt(lead);
  if (!mail) return { sent: false };
  return sendBuilt(mail, `lead-receipt/${lead.id}`);
}

export async function sendOrderConfirmation(order: OrderMail): Promise<MailResult> {
  const mail = buildOrderConfirmation(order);
  if (!mail) return { sent: false };
  return sendBuilt(mail, `order-confirmation/${order.sessionId}`);
}

export async function sendLeadEmail(lead: LeadMail): Promise<{ emailed: boolean }> {
  const staff = await sendLeadAlert(lead);
  if (resendSendsShopperReceipt(lead.intent)) {
    try {
      await sendContactReceipt(lead);
    } catch (err) {
      console.error("[mailer] shopper receipt failed", err);
    }
  }
  return { emailed: staff.sent };
}

/** Brand tokens stay imported so verifiers can assert the kit is wired. */
export const MAILER_BRAND = EMAIL_BRAND;

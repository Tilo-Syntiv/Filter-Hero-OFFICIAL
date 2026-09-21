import { BRAND_EMAIL, BRAND_NAME, BRAND_TAGLINE, SITE_ORIGIN } from "./const";

/** Stripe Branding, Klaviyo email defaults, and Resend HTML share this kit. */
export const EMAIL_BRAND = {
  navy: "#203868",
  burgundy: "#7F2328",
  ice: "#8EB0D8",
  mesh: "#3A66A3",
  deep: "#141e30",
  canvas: "#f6f7f9",
  white: "#ffffff",
  muted: "#5b6475",
  logoPath: "/logo.png",
  logoWidth: 200,
  logoHeight: 141,
} as const;

export function emailOrigin(): string {
  return (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    SITE_ORIGIN
  ).replace(/\/$/, "");
}

export function emailLogoUrl(): string {
  return `${emailOrigin()}${EMAIL_BRAND.logoPath}`;
}

export function emailFromAddress(): string {
  return (process.env.RESEND_FROM || "").trim() || `${BRAND_NAME} <${BRAND_EMAIL}>`;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value: string): string {
  return escapeEmailHtml(value).replace(/\r\n|\n|\r/g, "<br>");
}

export function transactionalFooterNote(): string {
  return `${BRAND_NAME} · ${BRAND_TAGLINE} · filterhero.net · ${BRAND_EMAIL}`;
}

export function renderBrandedEmail(input: {
  title: string;
  preview?: string;
  bodyHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
}): string {
  const title = escapeEmailHtml(input.title);
  const preview = escapeEmailHtml(input.preview || "");
  const ctaHref = escapeEmailHtml(input.ctaHref || "");
  const ctaLabel = escapeEmailHtml(input.ctaLabel || "");
  const logo = escapeEmailHtml(emailLogoUrl());
  const cta = input.ctaHref
    ? `<tr><td style="padding:8px 28px 28px">
        <a href="${ctaHref}" style="display:inline-block;background:${EMAIL_BRAND.burgundy};color:${EMAIL_BRAND.white};text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">${ctaLabel || "Open Filter Hero"}</a>
      </td></tr>`
    : "";
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:${EMAIL_BRAND.canvas};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_BRAND.deep}">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden">${preview}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:${EMAIL_BRAND.white};border-radius:12px;overflow:hidden">
        <tr><td style="background:${EMAIL_BRAND.navy};padding:20px 28px">
          <img src="${logo}" alt="${escapeEmailHtml(BRAND_NAME)}" width="${EMAIL_BRAND.logoWidth}" height="${EMAIL_BRAND.logoHeight}" style="display:block;height:auto;max-width:160px;border:0">
        </td></tr>
        <tr><td style="height:4px;background:${EMAIL_BRAND.navy};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:28px 28px 8px">
          <h1 style="margin:0 0 16px;font-size:22px;color:${EMAIL_BRAND.navy}">${title}</h1>
          ${input.bodyHtml}
        </td></tr>
        ${cta}
        <tr><td style="padding:0 28px 24px;color:${EMAIL_BRAND.muted};font-size:12px">${escapeEmailHtml(transactionalFooterNote())}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 12px;line-height:1.55">${nl2br(text)}</p>`;
}

export function emailDefinitionTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:${EMAIL_BRAND.muted};vertical-align:top">${escapeEmailHtml(label)}</td><td style="padding:4px 0;color:${EMAIL_BRAND.deep}">${escapeEmailHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${body}</table>`;
}

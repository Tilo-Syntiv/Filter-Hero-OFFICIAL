import { BRAND_NAME, SITE_ORIGIN } from "./const";
import { EMAIL_BRAND } from "./email-brand";

/**
 * Hosted Checkout branding. Stripe fetches these URLs itself, so they must
 * already be public image/png on filterhero.net — not localhost, and not a
 * SPA HTML fallback.
 *
 * `/hero/lockup-mascot.png` is the header flyer with a true transparent plate.
 * `/logo-checkout.png` is the same knockout of `logo.png` plus the FILTER HERO
 * wordmark; use it only after live serves it as PNG.
 */
export const STRIPE_CHECKOUT_LOGO_PATH = "/hero/lockup-mascot.png";
export const STRIPE_CHECKOUT_WORDMARK_PATH = "/logo-checkout.png";

export const STRIPE_CHECKOUT_THEME = {
  backgroundColor: EMAIL_BRAND.canvas,
  buttonColor: EMAIL_BRAND.burgundy,
  primaryColor: EMAIL_BRAND.navy,
  fontFamily: "nunito",
  borderStyle: "rounded",
} as const;

export function stripeCheckoutLogoUrl(): string {
  return `${SITE_ORIGIN}${STRIPE_CHECKOUT_LOGO_PATH}`;
}

/** Per-session Checkout look. Omitted fields fall back to Dashboard branding. */
export function stripeCheckoutBrandingSettings() {
  const logo = stripeCheckoutLogoUrl();
  return {
    background_color: STRIPE_CHECKOUT_THEME.backgroundColor,
    button_color: STRIPE_CHECKOUT_THEME.buttonColor,
    border_style: STRIPE_CHECKOUT_THEME.borderStyle,
    display_name: BRAND_NAME,
    font_family: STRIPE_CHECKOUT_THEME.fontFamily,
    logo: { type: "url" as const, url: logo },
    icon: { type: "url" as const, url: logo },
  };
}

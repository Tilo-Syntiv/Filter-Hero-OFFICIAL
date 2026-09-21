import type Stripe from "stripe";

/**
 * Canonical: Stripe tax code list — "General - Tangible Goods".
 * HVAC filters are movable physical goods. Override with STRIPE_TAX_CODE if needed.
 */
export const TANGIBLE_GOODS_TAX_CODE = "txcd_99999999";

/** Canonical: Stripe tax code list — "Shipping" with a sale of goods. */
export const SHIPPING_TAX_CODE = "txcd_92010001";

export type StripeTaxSettingsStatus = "active" | "pending";

export type StripeTaxRegistration = {
  country: string;
  state: string | null;
  status: "active" | "expired" | "scheduled";
};

export type StripeTaxReadiness = {
  configured: boolean;
  settingsStatus: StripeTaxSettingsStatus | null;
  automaticTax: boolean;
  collecting: boolean;
  headOfficeReady: boolean;
  registrations: StripeTaxRegistration[];
};

export function productTaxCode(): string {
  const override = process.env.STRIPE_TAX_CODE?.trim();
  return override || TANGIBLE_GOODS_TAX_CODE;
}

export function shouldEnableAutomaticTax(
  status: string | null | undefined,
): boolean {
  return status === "active";
}

export function taxRegistrationsCollecting(
  registrations: Array<{ status: string }>,
): boolean {
  return registrations.some((row) => row.status === "active");
}

export function emptyStripeTaxReadiness(
  configured = false,
): StripeTaxReadiness {
  return {
    configured,
    settingsStatus: null,
    automaticTax: false,
    collecting: false,
    headOfficeReady: false,
    registrations: [],
  };
}

function registrationFromStripe(
  row: Stripe.Tax.Registration,
): StripeTaxRegistration {
  return {
    country: row.country,
    state: row.country_options?.us?.state ?? null,
    status: row.status,
  };
}

export async function readStripeTaxReadiness(
  stripe: Stripe | null,
): Promise<StripeTaxReadiness> {
  if (!stripe) return emptyStripeTaxReadiness(false);
  try {
    const settings = await stripe.tax.settings.retrieve();
    const listed = await stripe.tax.registrations.list({ limit: 100 });
    const registrations = listed.data.map(registrationFromStripe);
    return {
      configured: true,
      settingsStatus: settings.status,
      automaticTax: shouldEnableAutomaticTax(settings.status),
      collecting: taxRegistrationsCollecting(registrations),
      headOfficeReady: Boolean(settings.head_office),
      registrations,
    };
  } catch (err) {
    console.warn("[stripe tax] settings retrieve failed; automatic_tax off", err);
    return emptyStripeTaxReadiness(true);
  }
}

export async function ensureStripeTaxDefaults(stripe: Stripe): Promise<void> {
  const settings = await stripe.tax.settings.retrieve();
  const taxCode = productTaxCode();
  const needsBehavior = settings.defaults.tax_behavior !== "exclusive";
  const needsCode = settings.defaults.tax_code !== taxCode;
  if (!needsBehavior && !needsCode) return;
  await stripe.tax.settings.update({
    defaults: {
      tax_behavior: "exclusive",
      tax_code: taxCode,
    },
  });
}

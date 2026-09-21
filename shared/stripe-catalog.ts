import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Mapping written by `pnpm sync:catalog`. Checkout uses it only when the
 * Stripe key mode matches `livemode`, so a test sync cannot be attached to
 * a live Checkout Session.
 */
export type StripeCatalogFile = {
  syncedAt: string | null;
  account: string | null;
  livemode: boolean | null;
  count: number;
  products: Record<string, string>;
};

const EMPTY: StripeCatalogFile = {
  syncedAt: null,
  account: null,
  livemode: null,
  count: 0,
  products: {},
};

export function stripeCatalogPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "stripe-catalog.json");
}

export function loadStripeCatalogFile(): StripeCatalogFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(stripeCatalogPath(), "utf-8")) as StripeCatalogFile;
    return {
      ...EMPTY,
      ...parsed,
      products:
        parsed.products && typeof parsed.products === "object" ? parsed.products : {},
    };
  } catch {
    return EMPTY;
  }
}

export function writeStripeCatalogFile(file: StripeCatalogFile): void {
  fs.writeFileSync(stripeCatalogPath(), `${JSON.stringify(file, null, 2)}\n`, "utf-8");
}

export function mappedStripeProductId(
  productId: number,
  livemode: boolean,
): string | undefined {
  const file = loadStripeCatalogFile();
  if (file.livemode != null && file.livemode !== livemode) return undefined;
  const id = file.products[String(productId)];
  return id || undefined;
}

export function stripeKeyIsLive(secret = process.env.STRIPE_SECRET_KEY || ""): boolean {
  return secret.startsWith("sk_live");
}

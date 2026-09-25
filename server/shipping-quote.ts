import { randomUUID } from "node:crypto";
import { getProductById } from "../shared/products";
import {
  filterKingConfigured,
  quoteOrderShipping,
  type FilterKingShipTo,
} from "./filterking";

export type ShopperShipTo = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type QuoteCartItem = {
  productId: number;
  quantity: number;
};

function normalizeShipTo(shipTo: ShopperShipTo): FilterKingShipTo {
  const line1 = shipTo.line1.trim();
  const city = shipTo.city.trim();
  const state = shipTo.state.trim().toUpperCase();
  const zip = shipTo.postalCode.trim();
  const country = (shipTo.country || "US").trim().toUpperCase() || "US";
  const line2 = shipTo.line2?.trim();
  if (!line1 || !city || !/^[A-Z]{2}$/.test(state) || !zip) {
    throw new Error("Enter a complete US shipping address for freight.");
  }
  if (country !== "US") {
    throw new Error("Shipping is only available in the United States.");
  }
  return {
    address_line_1: line1,
    ...(line2 ? { address_line_2: line2 } : {}),
    city,
    state,
    zip,
    country,
  };
}

function parentItemsForCart(items: QuoteCartItem[]) {
  const byParent = new Map<string, number>();
  for (const item of items) {
    const product = getProductById(item.productId);
    if (!product) throw new Error(`Unknown product: ${item.productId}`);
    const parent = product.parentModel?.trim();
    if (!parent) {
      throw new Error(`No stock parent model for product ${item.productId}`);
    }
    byParent.set(parent, (byParent.get(parent) || 0) + item.quantity);
  }
  return [...byParent.entries()].map(([parent_model, quantity]) => ({
    parent_model,
    quantity,
  }));
}

export type ShippingQuoteResult = {
  amountCents: number;
  amount: number;
  currency: string;
  source: "filter_king" | "none";
};

/** Live FedEx estimate from the dropship API. Shopper tax stays on Stripe. */
export async function quoteCartShipping(
  items: QuoteCartItem[],
  shipTo: ShopperShipTo,
): Promise<ShippingQuoteResult> {
  if (!filterKingConfigured()) {
    return { amountCents: 0, amount: 0, currency: "USD", source: "none" };
  }
  const fkShipTo = normalizeShipTo(shipTo);
  const quoteItems = parentItemsForCart(items);
  const quote = await quoteOrderShipping({
    shipTo: fkShipTo,
    items: quoteItems,
    idempotencyKey: randomUUID(),
  });
  if (quote.currency !== "USD") {
    throw new Error(`Unexpected shipping currency ${quote.currency}`);
  }
  const amountCents = Math.round(quote.estimatedShippingCost * 100);
  return {
    amountCents,
    amount: amountCents / 100,
    currency: "USD",
    source: "filter_king",
  };
}

/**
 * Automatic delivery (subscribe) pricing and cadence.
 * One-time list clears MIN_GROSS_MARGIN (50%). Subscribe is a flat 10% off
 * that list with no clawback to the floor (FH-366).
 */
export const AUTO_DELIVERY_INTERVALS = [30, 60, 90] as const;
export type AutoDeliveryInterval = (typeof AUTO_DELIVERY_INTERVALS)[number];
/** once = one-time buy; 30|60|90 = auto-delivery every N days */
export type DeliveryMode = "once" | AutoDeliveryInterval;

/** Fraction off the one-time pack unit for every auto-delivery shipment. */
export const SUBSCRIBE_DISCOUNT = 0.1;

export function isAutoDeliveryInterval(
  value: unknown,
): value is AutoDeliveryInterval {
  return value === 30 || value === 60 || value === 90;
}

export function parseDeliveryMode(value: unknown): DeliveryMode {
  if (value === "once" || value === 0 || value === "0" || value == null) return "once";
  const n = typeof value === "number" ? value : Number(value);
  if (isAutoDeliveryInterval(n)) return n;
  return "once";
}

export function deliveryLabel(delivery: DeliveryMode): string {
  if (delivery === "once") return "One-time";
  return `Every ${delivery} days`;
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 10% off one-time unit. Does not re-apply the gross-margin floor. */
export function subscribeUnitPrice(oneTimeUnit: number): number {
  if (!(oneTimeUnit > 0)) return 0;
  return money(oneTimeUnit * (1 - SUBSCRIBE_DISCOUNT));
}

export function unitPriceForDelivery(
  oneTimeUnit: number,
  delivery: DeliveryMode,
): number {
  if (delivery === "once") return money(oneTimeUnit);
  return subscribeUnitPrice(oneTimeUnit);
}

export function cartLineKey(productId: number, delivery: DeliveryMode): string {
  return `${productId}:${delivery}`;
}

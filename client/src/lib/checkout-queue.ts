const REMAINING_KEY = "fh-checkout-remaining";
const EMAIL_KEY = "fh-checkout-email";
const MARKETING_KEY = "fh-checkout-marketing";
const SHIP_TO_KEY = "fh-checkout-ship-to";

export type CheckoutQueueItem = {
  productId: number;
  quantity: number;
  delivery?: "once" | 30 | 60 | 90;
};

export type CheckoutShipTo = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export function stashCheckoutContinuation(input: {
  remainingItems: CheckoutQueueItem[];
  email: string;
  marketingConsent: boolean;
  shipTo?: CheckoutShipTo;
}) {
  if (input.remainingItems.length === 0) {
    clearCheckoutContinuation();
    return;
  }
  sessionStorage.setItem(REMAINING_KEY, JSON.stringify(input.remainingItems));
  sessionStorage.setItem(EMAIL_KEY, input.email);
  sessionStorage.setItem(MARKETING_KEY, input.marketingConsent ? "1" : "0");
  if (input.shipTo) {
    sessionStorage.setItem(SHIP_TO_KEY, JSON.stringify(input.shipTo));
  } else {
    sessionStorage.removeItem(SHIP_TO_KEY);
  }
}

export function readCheckoutContinuation(): {
  remainingItems: CheckoutQueueItem[];
  email: string;
  marketingConsent: boolean;
  shipTo?: CheckoutShipTo;
} | null {
  try {
    const raw = sessionStorage.getItem(REMAINING_KEY);
    if (!raw) return null;
    const remainingItems = JSON.parse(raw) as CheckoutQueueItem[];
    if (!Array.isArray(remainingItems) || remainingItems.length === 0) return null;
    let shipTo: CheckoutShipTo | undefined;
    const shipRaw = sessionStorage.getItem(SHIP_TO_KEY);
    if (shipRaw) {
      try {
        shipTo = JSON.parse(shipRaw) as CheckoutShipTo;
      } catch {
        shipTo = undefined;
      }
    }
    return {
      remainingItems,
      email: sessionStorage.getItem(EMAIL_KEY) || "",
      marketingConsent: sessionStorage.getItem(MARKETING_KEY) === "1",
      shipTo,
    };
  } catch {
    return null;
  }
}

export function clearCheckoutContinuation() {
  sessionStorage.removeItem(REMAINING_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(MARKETING_KEY);
  sessionStorage.removeItem(SHIP_TO_KEY);
}

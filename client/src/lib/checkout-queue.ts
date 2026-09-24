const REMAINING_KEY = "fh-checkout-remaining";
const EMAIL_KEY = "fh-checkout-email";
const MARKETING_KEY = "fh-checkout-marketing";

export type CheckoutQueueItem = {
  productId: number;
  quantity: number;
  delivery?: "once" | 30 | 60 | 90;
};

export function stashCheckoutContinuation(input: {
  remainingItems: CheckoutQueueItem[];
  email: string;
  marketingConsent: boolean;
}) {
  if (input.remainingItems.length === 0) {
    clearCheckoutContinuation();
    return;
  }
  sessionStorage.setItem(REMAINING_KEY, JSON.stringify(input.remainingItems));
  sessionStorage.setItem(EMAIL_KEY, input.email);
  sessionStorage.setItem(MARKETING_KEY, input.marketingConsent ? "1" : "0");
}

export function readCheckoutContinuation(): {
  remainingItems: CheckoutQueueItem[];
  email: string;
  marketingConsent: boolean;
} | null {
  try {
    const raw = sessionStorage.getItem(REMAINING_KEY);
    if (!raw) return null;
    const remainingItems = JSON.parse(raw) as CheckoutQueueItem[];
    if (!Array.isArray(remainingItems) || remainingItems.length === 0) return null;
    return {
      remainingItems,
      email: sessionStorage.getItem(EMAIL_KEY) || "",
      marketingConsent: sessionStorage.getItem(MARKETING_KEY) === "1",
    };
  } catch {
    return null;
  }
}

export function clearCheckoutContinuation() {
  sessionStorage.removeItem(REMAINING_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(MARKETING_KEY);
}

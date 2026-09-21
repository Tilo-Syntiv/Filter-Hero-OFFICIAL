import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/const";
import { useCart } from "@/contexts/CartContext";
import { useSeo } from "@/hooks/useSeo";

type ConfirmState = "checking" | "paid" | "unpaid" | "missing";

type SessionTotals = {
  amountSubtotal?: number | null;
  amountTax?: number | null;
  amountTotal?: number | null;
};

function formatUsd(cents: number | null | undefined) {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export default function CheckoutSuccess() {
  const { clearCart } = useCart();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<ConfirmState>("checking");
  const [totals, setTotals] = useState<SessionTotals | null>(null);

  useSeo({
    title: `Order confirmed | ${BRAND_NAME}`,
    description: `Your ${BRAND_NAME} payment was successful.`,
    path: "/checkout/success",
    noindex: true,
  });

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setState("missing");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          paid?: boolean;
          amountSubtotal?: number | null;
          amountTax?: number | null;
          amountTotal?: number | null;
        };
        if (cancelled) return;
        if (res.ok && data.paid) {
          clearCart();
          setTotals({
            amountSubtotal: data.amountSubtotal,
            amountTax: data.amountTax,
            amountTotal: data.amountTotal,
          });
          setState("paid");
          return;
        }
        setState("unpaid");
      } catch {
        if (!cancelled) setState("unpaid");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearCart]);

  const copy =
    state === "checking"
      ? {
          title: "Confirming your order",
          body: "Hold on while we verify the payment with Stripe.",
        }
      : state === "paid"
        ? {
            title: "Payment successful",
            body: `Thank you for your order. A confirmation email will arrive from Stripe shortly. We'll get your filters on the way.`,
          }
        : state === "missing"
          ? {
              title: "No checkout session",
              body: "This page needs a Stripe checkout session. If you just paid, use the link from your confirmation email. Your cart is still saved.",
            }
          : {
              title: "Payment not confirmed",
              body: "We could not confirm that payment. Your cart is still saved — try checkout again or request a quote.",
            };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          {state === "checking" ? (
            <Loader2 className="h-14 w-14 animate-spin text-primary" />
          ) : state === "paid" ? (
            <CheckCircle className="h-14 w-14 text-primary" />
          ) : (
            <CircleAlert className="h-14 w-14 text-muted-foreground" />
          )}
        </div>
        <img
          src="/logo.png"
          alt={BRAND_NAME}
          className="h-12 w-auto mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold mb-3">{copy.title}</h1>
        <p className="text-muted-foreground mb-8">{copy.body}</p>
        {state === "paid" && totals?.amountTotal != null && (
          <div className="text-sm text-muted-foreground mb-8 space-y-1">
            {totals.amountSubtotal != null && (
              <p>Subtotal {formatUsd(totals.amountSubtotal)}</p>
            )}
            {totals.amountTax != null && totals.amountTax > 0 && (
              <p>Tax {formatUsd(totals.amountTax)}</p>
            )}
            <p className="font-semibold text-foreground">Total {formatUsd(totals.amountTotal)}</p>
          </div>
        )}
        {state !== "checking" && (
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setLocation("/")}>
            Back to store
          </Button>
        )}
      </div>
    </div>
  );
}

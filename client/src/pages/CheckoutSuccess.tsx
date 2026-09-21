import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/CartDrawer";
import SiteHeader from "@/components/SiteHeader";
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

  const mark =
    state === "checking" ? (
      <Loader2 className="h-8 w-8 animate-spin text-navy" />
    ) : state === "paid" ? (
      <CheckCircle className="h-8 w-8 text-navy" />
    ) : (
      <CircleAlert className="h-8 w-8 text-hero" />
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="brand-band relative flex flex-1 items-start justify-center overflow-hidden px-4 py-8 sm:items-center sm:py-12">
        <div className="page-hero-glow" aria-hidden />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-[0_24px_50px_rgba(8,16,32,0.28)] sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="section-label !mb-0">
              {state === "paid" ? "Order" : "Checkout"}
            </span>
            {mark}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
          {state === "paid" && totals?.amountTotal != null && (
            <div className="mt-5 rounded-2xl border border-border bg-[#f7f9fc] px-4 py-3">
              {totals.amountSubtotal != null && (
                <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatUsd(totals.amountSubtotal)}</span>
                </div>
              )}
              {totals.amountTax != null && totals.amountTax > 0 && (
                <div className="mt-1 flex justify-between gap-3 text-sm text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatUsd(totals.amountTax)}</span>
                </div>
              )}
              <div className="mt-2 flex items-end justify-between gap-3 border-t border-border pt-2">
                <p className="cart-kicker">Total</p>
                <p className="cart-total !text-2xl">{formatUsd(totals.amountTotal)}</p>
              </div>
            </div>
          )}
          {state !== "checking" && (
            <Button
              size="lg"
              className="hero-shop-btn hero-shop-btn-glow mt-6 w-full text-white"
              onClick={() => setLocation("/")}
            >
              Back to store
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

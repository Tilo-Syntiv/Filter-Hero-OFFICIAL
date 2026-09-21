import { useLocation } from "wouter";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/CartDrawer";
import SiteHeader from "@/components/SiteHeader";
import { BRAND_NAME } from "@/const";
import { useSeo } from "@/hooks/useSeo";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  useSeo({
    title: `Checkout canceled | ${BRAND_NAME}`,
    description: `Checkout was canceled. Your ${BRAND_NAME} cart is still saved.`,
    path: "/checkout/cancel",
    noindex: true,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="brand-band relative flex flex-1 items-start justify-center overflow-hidden px-4 py-8 sm:items-center sm:py-12">
        <div className="page-hero-glow" aria-hidden />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-[0_24px_50px_rgba(8,16,32,0.28)] sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="section-label !mb-0">Checkout</span>
            <CircleAlert className="h-8 w-8 text-hero" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Checkout canceled
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No charge was made. Your cart is still saved — you can try again anytime.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              className="hero-shop-btn hero-shop-btn-glow w-full text-white"
              onClick={() => setLocation("/")}
            >
              Return to store
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="cart-navy-btn w-full text-white"
              onClick={() => {
                window.location.href = "/#contact";
              }}
            >
              Request a quote instead
            </Button>
          </div>
        </div>
      </main>
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <img
          src="/logo.png"
          alt={BRAND_NAME}
          className="h-12 w-auto mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold mb-3">Checkout canceled</h1>
        <p className="text-muted-foreground mb-8">
          No charge was made. Your cart is still saved — you can try again anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setLocation("/")}>
            Return to store
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              window.location.href = "/#contact";
            }}
          >
            Request a quote instead
          </Button>
        </div>
      </div>
    </div>
  );
}

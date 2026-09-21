import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MarketingOptIn from "@/components/MarketingOptIn";
import { identifyShopper, rememberedEmail } from "@/lib/klaviyo";
import { useAccount } from "@/contexts/AccountContext";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FILTER_PRODUCT_IMAGE, getProductById, packShotSrc } from "@shared/products";
import { useCart } from "@/contexts/CartContext";
import { stashQuoteHandoff } from "@/lib/quote-handoff";

type CartDrawerProps = {
  onRequestQuote: () => void;
};

export default function CartDrawer({ onRequestQuote }: CartDrawerProps) {
  const { items, isOpen, closeCart, setQty, removeItem, subtotal, itemCount, cartSummaryText } =
    useCart();
  const { email: accountEmail } = useAccount();
  const { maintenanceMode, maintenanceMessage } = useSiteConfig();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [email, setEmail] = useState(() => rememberedEmail());
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    if (accountEmail) setEmail(accountEmail);
  }, [accountEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter your email so we can save the cart if checkout is left open.");
      return;
    }
    identifyShopper({ email: trimmed });
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.qty,
          })),
          email: trimmed,
          marketingConsent,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setCheckingOut(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <DrawerContent
        className="max-h-[min(92dvh,40rem)]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
      >
        <DrawerHeader className="text-left">
          <DrawerTitle
            ref={titleRef}
            tabIndex={-1}
            className="flex items-center gap-2 outline-none"
          >
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your cart ({itemCount})
          </DrawerTitle>
          <DrawerDescription>
            Review items, then checkout securely with Stripe or request a quote.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-2 space-y-4 max-h-[50vh]">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Your cart is empty. Find your size and add a filter to get started.
            </p>
          ) : (
            items.map((item) => {
              const product = getProductById(item.productId);
              const shot = product
                ? packShotSrc(product.merv, Boolean(product.isCarbon))
                : FILTER_PRODUCT_IMAGE;
              return (
              <div
                key={item.productId}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4"
              >
                <img
                  src={shot}
                  alt={`${item.size} ${item.name}`}
                  className="h-16 w-16 shrink-0 rounded-lg border border-border bg-white object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground break-words">
                    {item.size}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.name}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setQty(item.productId, item.qty - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.qty}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setQty(item.productId, item.qty + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-destructive"
                    onClick={() => removeItem(item.productId)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              );
            })
          )}
        </div>

        <DrawerFooter className="border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-semibold text-navy">At checkout</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-email">Email</Label>
            <Input
              id="cart-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => {
                const trimmed = email.trim();
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                  identifyShopper({ email: trimmed });
                }
              }}
              placeholder="you@email.com"
              className="h-11"
            />
            <MarketingOptIn
              id="cart-marketing"
              checked={marketingConsent}
              onCheckedChange={setMarketingConsent}
            />
          </div>
          {maintenanceMode ? (
            <p className="text-sm text-muted-foreground">{maintenanceMessage}</p>
          ) : null}
          <Button
            size="lg"
            className="hero-shop-btn w-full text-white"
            disabled={items.length === 0 || checkingOut || maintenanceMode}
            onClick={handleCheckout}
          >
            {checkingOut ? "Redirecting…" : "Checkout with Stripe"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={items.length === 0}
            onClick={() => {
              stashQuoteHandoff({ cart: cartSummaryText() });
              closeCart();
              onRequestQuote();
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Request a quote
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">Continue shopping</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

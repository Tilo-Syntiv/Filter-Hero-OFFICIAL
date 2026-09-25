import { useEffect, useRef, useState } from "react";
import { ArrowRight, FileText, Minus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MarketingOptIn from "@/components/MarketingOptIn";
import { identifyShopper } from "@/lib/klaviyo";
import {
  stashCheckoutContinuation,
  type CheckoutShipTo,
} from "@/lib/checkout-queue";
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
import {
  AUTO_DELIVERY_INTERVALS,
  FILTER_PRODUCT_IMAGE,
  deliveryLabel,
  getProductById,
  packShotSrc,
  type DeliveryMode,
} from "@shared/products";
import { US_STATE_OPTIONS } from "@shared/us-states";
import { useCart } from "@/contexts/CartContext";
import { stashQuoteHandoff } from "@/lib/quote-handoff";

const CART_EMAIL_KEY = "fh_cart_email";
const LEGACY_CART_EMAIL_KEY = "fh_klaviyo_email";
const CART_SHIP_KEY = "fh_cart_ship_to";

function rememberedEmail(): string {
  try {
    const current = localStorage.getItem(CART_EMAIL_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(LEGACY_CART_EMAIL_KEY);
    if (!legacy) return "";
    localStorage.setItem(CART_EMAIL_KEY, legacy);
    localStorage.removeItem(LEGACY_CART_EMAIL_KEY);
    return legacy;
  } catch {
    return "";
  }
}

function rememberEmail(email: string) {
  try {
    localStorage.setItem(CART_EMAIL_KEY, email);
  } catch {
    /* private mode */
  }
}

function rememberedShipTo(): CheckoutShipTo {
  try {
    const raw = localStorage.getItem(CART_SHIP_KEY);
    if (!raw) return { line1: "", city: "", state: "", postalCode: "" };
    const parsed = JSON.parse(raw) as CheckoutShipTo;
    return {
      line1: parsed.line1 || "",
      line2: parsed.line2 || "",
      city: parsed.city || "",
      state: (parsed.state || "").toUpperCase(),
      postalCode: parsed.postalCode || "",
      country: "US",
    };
  } catch {
    return { line1: "", city: "", state: "", postalCode: "" };
  }
}

function rememberShipTo(shipTo: CheckoutShipTo) {
  try {
    localStorage.setItem(CART_SHIP_KEY, JSON.stringify(shipTo));
  } catch {
    /* private mode */
  }
}

function shipToReady(shipTo: CheckoutShipTo): boolean {
  return Boolean(
    shipTo.line1.trim() &&
      shipTo.city.trim() &&
      /^[A-Za-z]{2}$/.test(shipTo.state.trim()) &&
      shipTo.postalCode.trim().length >= 5,
  );
}

type CartDrawerProps = {
  onRequestQuote: () => void;
};

export default function CartDrawer({ onRequestQuote }: CartDrawerProps) {
  const {
    items,
    isOpen,
    closeCart,
    setQty,
    setDelivery,
    removeItem,
    subtotal,
    itemCount,
    checkoutGroupCount,
    cartSummaryText,
  } = useCart();
  const { email: accountEmail } = useAccount();
  const { maintenanceMode, maintenanceMessage } = useSiteConfig();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [email, setEmail] = useState(() => rememberedEmail());
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [shipTo, setShipTo] = useState<CheckoutShipTo>(() => rememberedShipTo());
  const [shippingLabel, setShippingLabel] = useState("Enter address");
  const [quoting, setQuoting] = useState(false);

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

  useEffect(() => {
    rememberShipTo(shipTo);
  }, [shipTo]);

  useEffect(() => {
    if (items.length === 0 || !shipToReady(shipTo)) {
      setShippingLabel(items.length === 0 ? "—" : "Enter address");
      setQuoting(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.qty,
              delivery: i.delivery,
            })),
            shipTo: {
              line1: shipTo.line1.trim(),
              line2: shipTo.line2?.trim() || undefined,
              city: shipTo.city.trim(),
              state: shipTo.state.trim().toUpperCase(),
              postalCode: shipTo.postalCode.trim(),
              country: "US",
            },
          }),
        });
        const data = (await res.json()) as {
          amount?: number;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          setShippingLabel(
            data.code === "rate_limited_shipping_quote" || data.code === "rate_limited_checkout"
              ? "Retry shortly"
              : "Unavailable",
          );
          return;
        }
        const amount = typeof data.amount === "number" ? data.amount : 0;
        setShippingLabel(
          amount === 0
            ? "$0.00"
            : new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(amount),
        );
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setShippingLabel("Unavailable");
      } finally {
        setQuoting(false);
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [items, shipTo]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter your email so we can save the cart if checkout is left open.");
      return;
    }
    if (!shipToReady(shipTo)) {
      toast.error("Enter your US shipping address so we can calculate freight.");
      return;
    }
    const nextShipTo: CheckoutShipTo = {
      line1: shipTo.line1.trim(),
      line2: shipTo.line2?.trim() || undefined,
      city: shipTo.city.trim(),
      state: shipTo.state.trim().toUpperCase(),
      postalCode: shipTo.postalCode.trim(),
      country: "US",
    };
    rememberEmail(trimmed);
    rememberShipTo(nextShipTo);
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
            delivery: i.delivery,
          })),
          email: trimmed,
          marketingConsent,
          shipTo: nextShipTo,
        }),
      });
      const data = (await res.json()) as {
        url?: string;
        remainingItems?: Array<{
          productId: number;
          quantity: number;
          delivery?: DeliveryMode;
        }>;
        groupLabel?: string;
        groupsRemaining?: number;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      stashCheckoutContinuation({
        remainingItems: data.remainingItems ?? [],
        email: trimmed,
        marketingConsent,
        shipTo: nextShipTo,
      });
      if ((data.groupsRemaining ?? 0) > 0) {
        toast.message(
          `Next: ${data.groupLabel || "this payment"}. You’ll complete ${
            (data.groupsRemaining ?? 0) + 1
          } Stripe checkouts for mixed delivery schedules.`,
        );
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setCheckingOut(false);
    }
  };

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <DrawerContent
        className="cart-drawer !h-dvh !w-full !max-w-none border-0 sm:!w-[28rem] sm:!max-w-[28rem]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
      >
        <DrawerHeader className="cart-drawer-band brand-band shrink-0 text-left">
          <DrawerClose className="cart-drawer-close" aria-label="Close cart">
            <X className="h-3.5 w-3.5" />
          </DrawerClose>
          <DrawerTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-bold tracking-tight text-white outline-none"
          >
            Your cart
            <span className="cart-count">{itemCount}</span>
          </DrawerTitle>
          <DrawerDescription className="text-xs leading-snug text-white/70">
            {checkoutGroupCount > 1
              ? `Mixed schedules need ${checkoutGroupCount} Stripe payments.`
              : "Checkout with Stripe, or request a quote."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="cart-drawer-list min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
          {items.length === 0 ? (
            <p className="cart-empty text-sm">
              Your cart is empty. Find your size and add a filter to get started.
            </p>
          ) : (
            items.map((item) => {
              const product = getProductById(item.productId);
              const shot = product
                ? packShotSrc(product.merv, Boolean(product.isCarbon))
                : FILTER_PRODUCT_IMAGE;
              return (
                <div key={item.lineKey} className="cart-line">
                  <img
                    src={shot}
                    alt={`${item.size} ${item.name}`}
                    className="cart-line-shot"
                  />
                  <div className="min-w-0">
                    <p className="cart-line-size break-words">{item.size}</p>
                    <p className="cart-line-name">{item.name}</p>
                    <label className="mt-1.5 block text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                      Delivery
                      <select
                        className="mt-0.5 block w-full rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold normal-case tracking-normal text-navy"
                        value={String(item.delivery)}
                        onChange={(event) => {
                          const v = event.target.value;
                          const next: DeliveryMode =
                            v === "once" ? "once" : (Number(v) as 30 | 60 | 90);
                          setDelivery(item.lineKey, next);
                        }}
                      >
                        <option value="once">Buy once</option>
                        {AUTO_DELIVERY_INTERVALS.map((days) => (
                          <option key={days} value={days}>
                            {deliveryLabel(days)} · 10% off
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="cart-line-meta">
                    <p className="cart-line-price">
                      ${item.price.toFixed(2)}
                      {item.qty > 1 ? <span className="cart-line-each">each</span> : null}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="pdp-stepper-ctrl">
                        <button
                          type="button"
                          onClick={() => setQty(item.lineKey, item.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        <span className="pdp-stepper-count" aria-live="polite">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.lineKey, item.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line-remove"
                        onClick={() => removeItem(item.lineKey)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DrawerFooter className="cart-drawer-foot shrink-0 gap-2 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="cart-kicker">Subtotal</p>
              <p className="cart-total">${subtotal.toFixed(2)}</p>
            </div>
            <div className="pb-0.5 text-right">
              <p className="cart-kicker">Shipping</p>
              <p className="text-xs font-bold text-navy">
                {quoting ? "Calculating…" : shippingLabel}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="cart-field-label">Ship to</p>
            <Input
              id="cart-line1"
              autoComplete="shipping address-line1"
              value={shipTo.line1}
              onChange={(event) => setShipTo((prev) => ({ ...prev, line1: event.target.value }))}
              placeholder="Street address"
              className="h-9 rounded-lg border-border bg-white text-sm"
            />
            <Input
              id="cart-line2"
              autoComplete="shipping address-line2"
              value={shipTo.line2 || ""}
              onChange={(event) => setShipTo((prev) => ({ ...prev, line2: event.target.value }))}
              placeholder="Apt, suite (optional)"
              className="h-9 rounded-lg border-border bg-white text-sm"
            />
            <div className="grid grid-cols-[1fr_4.5rem_5.5rem] gap-1.5">
              <Input
                id="cart-city"
                autoComplete="shipping address-level2"
                value={shipTo.city}
                onChange={(event) => setShipTo((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="City"
                className="h-9 rounded-lg border-border bg-white text-sm"
              />
              <select
                id="cart-state"
                aria-label="State"
                autoComplete="shipping address-level1"
                value={shipTo.state}
                onChange={(event) =>
                  setShipTo((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))
                }
                className="h-9 rounded-lg border border-border bg-white px-1 text-sm font-semibold text-navy"
              >
                <option value="">ST</option>
                {US_STATE_OPTIONS.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code}
                  </option>
                ))}
              </select>
              <Input
                id="cart-zip"
                autoComplete="shipping postal-code"
                value={shipTo.postalCode}
                onChange={(event) =>
                  setShipTo((prev) => ({ ...prev, postalCode: event.target.value }))
                }
                placeholder="ZIP"
                className="h-9 rounded-lg border-border bg-white text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cart-email" className="cart-field-label">
              Email
            </Label>
            <Input
              id="cart-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => {
                const trimmed = email.trim();
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                  rememberEmail(trimmed);
                  identifyShopper({ email: trimmed });
                }
              }}
              placeholder="you@email.com"
              className="h-9 rounded-lg border-border bg-white text-sm"
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
            className="hero-shop-btn hero-shop-btn-glow w-full text-white"
            disabled={
              items.length === 0 ||
              checkingOut ||
              maintenanceMode ||
              !shipToReady(shipTo)
            }
            onClick={handleCheckout}
          >
            {checkingOut ? "Redirecting…" : "Checkout with Stripe"}
            {checkingOut ? null : <ArrowRight className="h-4 w-4" />}
          </Button>
          <Button
            size="lg"
            className="cart-navy-btn w-full text-white"
            disabled={items.length === 0}
            onClick={() => {
              stashQuoteHandoff({ cart: cartSummaryText() });
              closeCart();
              onRequestQuote();
            }}
          >
            <FileText className="h-4 w-4" />
            Request a quote
          </Button>
          <DrawerClose asChild>
            <button type="button" className="section-link mx-auto">
              Continue shopping
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

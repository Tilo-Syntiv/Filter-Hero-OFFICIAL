import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Package, ShoppingCart, Trash2, UserRound } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "@/contexts/AccountContext";
import { useCart } from "@/contexts/CartContext";
import { authClient } from "@/lib/admin-api";
import { consumeStaffAuthPending } from "@/lib/staff-auth";
import {
  formatOrderTotal,
  getAccount,
  patchAccount,
  removeAccountFilter,
  type AccountOrder,
  type AccountProfile,
  type AccountSnapshot,
  type SavedFilter,
} from "@/lib/account-api";
import { getProductById } from "@shared/products";
import { BRAND_NAME } from "@/const";

export default function AccountPage() {
  const { ready, configured, session, email } = useAccount();
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (session && consumeStaffAuthPending(session.user.email)) {
      setLocation("/admin");
      return;
    }
    if (!configured || !session) {
      const next = encodeURIComponent(window.location.pathname);
      setLocation(`/login?next=${next}`);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAccount()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load your account.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, configured, session, setLocation]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const profile = await patchAccount({
        firstName: String(form.get("firstName") || ""),
        lastName: String(form.get("lastName") || ""),
        phone: String(form.get("phone") || ""),
        addressLine1: String(form.get("addressLine1") || ""),
        addressLine2: String(form.get("addressLine2") || ""),
        city: String(form.get("city") || ""),
        region: String(form.get("region") || ""),
        postalCode: String(form.get("postalCode") || ""),
      });
      setSnapshot((prev) => (prev ? { ...prev, profile } : prev));
      toast.success("Saved your details.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setSaving(false);
    }
  };

  const dropFilter = async (id: string) => {
    try {
      await removeAccountFilter(id);
      setSnapshot((prev) =>
        prev ? { ...prev, filters: prev.filters.filter((row) => row.id !== id) } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove that filter.");
    }
  };

  const reorder = (filter: SavedFilter) => {
    const product = getProductById(filter.product_id);
    if (!product || !product.inStock) {
      toast.error("That filter is not in the catalog right now.");
      return;
    }
    addItem(product, 1);
    toast.success(`Added ${product.size} to your cart.`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container max-w-4xl py-10 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              {BRAND_NAME}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-navy">Your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {email ? `Signed in as ${email}` : "Your filters, address, and order history."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void authClient()?.auth.signOut();
              setLocation("/");
            }}
          >
            Sign out
          </Button>
        </div>

        {!ready || loading ? (
          <p className="text-sm text-muted-foreground">Loading your account…</p>
        ) : !snapshot ? (
          <p className="text-sm text-muted-foreground">
            We could not load your account. Try signing in again.
          </p>
        ) : (
          <>
            <ProfileCard profile={snapshot.profile} saving={saving} onSave={saveProfile} />
            <FiltersCard filters={snapshot.filters} onRemove={dropFilter} onReorder={reorder} />
            <OrdersCard orders={snapshot.orders} />
          </>
        )}
      </main>
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

function ProfileCard({
  profile,
  saving,
  onSave,
}: {
  profile: AccountProfile;
  saving: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
        <UserRound className="h-4 w-4" />
        Your information
      </h2>
      <form onSubmit={onSave} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="firstName" label="First name" defaultValue={profile.first_name} />
        <Field id="lastName" label="Last name" defaultValue={profile.last_name} />
        <Field id="phone" label="Phone" defaultValue={profile.phone} />
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} readOnly className="bg-muted/40" />
        </div>
        <Field id="addressLine1" label="Address" defaultValue={profile.address_line1} className="sm:col-span-2" />
        <Field id="addressLine2" label="Apartment, suite" defaultValue={profile.address_line2} className="sm:col-span-2" />
        <Field id="city" label="City" defaultValue={profile.city} />
        <Field id="region" label="State" defaultValue={profile.region} />
        <Field id="postalCode" label="ZIP" defaultValue={profile.postal_code} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  defaultValue,
  className,
}: {
  id: string;
  label: string;
  defaultValue: string | null;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function FiltersCard({
  filters,
  onRemove,
  onReorder,
}: {
  filters: SavedFilter[];
  onRemove: (id: string) => void;
  onReorder: (filter: SavedFilter) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
        <Package className="h-4 w-4" />
        Your filters
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Filters you saved, plus anything you have already bought.
      </p>
      {filters.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          None yet.{" "}
          <Link href="/sizes" className="underline">
            Find your size
          </Link>{" "}
          and tap Save on a product page.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {filters.map((filter) => (
            <li key={filter.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-navy">
                  {filter.size} · MERV {filter.merv}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filter.name || "Filter"}
                  {filter.source === "purchase" ? " · from an order" : " · saved"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onReorder(filter)}>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Add to cart
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${filter.size}`}
                  onClick={() => onRemove(filter.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrdersCard({ orders }: { orders: AccountOrder[] }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-navy">Order history</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No paid orders on this email yet. Guest checkouts show up here once
          you sign in with the same address used at Stripe.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-navy">
                  {new Date(order.paidAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm font-bold">
                  {formatOrderTotal(order.amountTotal, order.currency)}
                </p>
              </div>
              <ul className="mt-2 text-sm text-muted-foreground">
                {order.items.length === 0 ? (
                  <li>Order details unavailable</li>
                ) : (
                  order.items.map((item) => (
                    <li key={`${order.id}-${item.productId}`}>
                      {item.quantity}× {item.size || "Filter"}
                      {item.name ? ` · ${item.name}` : ""}
                    </li>
                  ))
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  cartLineKey,
  deliveryLabel,
  getProductById,
  parseDeliveryMode,
  shopperUnitPrice,
  type DeliveryMode,
  type Product,
} from "@shared/products";
import { useStock } from "@/contexts/StockContext";

export type CartItem = {
  /** productId + delivery — same SKU can be once and on a schedule */
  lineKey: string;
  productId: number;
  size: string;
  merv: number;
  /** Unit price charged for this line (subscribe already discounted). */
  price: number;
  name: string;
  qty: number;
  delivery: DeliveryMode;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  checkoutGroupCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, qty?: number, delivery?: DeliveryMode) => void;
  setQty: (lineKey: string, qty: number) => void;
  setDelivery: (lineKey: string, delivery: DeliveryMode) => void;
  removeItem: (lineKey: string) => void;
  clearCart: () => void;
  cartSummaryText: () => string;
};

const STORAGE_KEY = "fpf-cart-v2";

const CartContext = createContext<CartContextValue | null>(null);

function lineLabel(product: Product, delivery: DeliveryMode) {
  const base = product.isCarbon
    ? `${product.name} · MERV 8 Carbon`
    : `${product.name} · MERV ${product.merv}`;
  if (delivery === "once") return base;
  return `${base} · ${deliveryLabel(delivery)}`;
}

function lineFromProduct(
  product: Product,
  qty: number,
  delivery: DeliveryMode,
): CartItem {
  const safeQty = Math.min(50, Math.max(0, qty));
  const mode = parseDeliveryMode(delivery);
  return {
    lineKey: cartLineKey(product.id, mode),
    productId: product.id,
    size: product.size,
    merv: product.merv,
    price: shopperUnitPrice(product.price, safeQty, product, mode),
    name: lineLabel(product, mode),
    qty: safeQty,
    delivery: mode,
  };
}

function normalizeCart(items: CartItem[]): CartItem[] {
  const byKey = new Map<string, { productId: number; qty: number; delivery: DeliveryMode }>();
  for (const item of items) {
    if (!item || typeof item.productId !== "number" || item.qty <= 0) continue;
    const delivery = parseDeliveryMode(
      (item as CartItem).delivery ?? "once",
    );
    const key =
      typeof item.lineKey === "string" && item.lineKey.includes(":")
        ? item.lineKey
        : cartLineKey(item.productId, delivery);
    const prev = byKey.get(key);
    byKey.set(key, {
      productId: item.productId,
      delivery,
      qty: Math.min(50, (prev?.qty ?? 0) + item.qty),
    });
  }
  const next: CartItem[] = [];
  byKey.forEach(({ productId, qty, delivery }) => {
    const product = getProductById(productId);
    if (!product || !product.inStock) return;
    next.push(lineFromProduct(product, qty, delivery));
  });
  return next;
}

function loadCart(): { items: CartItem[]; dropped: number } {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("fpf-cart-v1");
    if (!raw) return { items: [], dropped: 0 };
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return { items: [], dropped: 0 };
    const before = new Set(
      parsed
        .map((item) =>
          item?.lineKey ||
          (typeof item?.productId === "number" ? String(item.productId) : null),
        )
        .filter((id): id is string => Boolean(id)),
    );
    const items = normalizeCart(parsed);
    const after = new Set(items.map((item) => item.lineKey));
    let dropped = 0;
    before.forEach((id) => {
      if (![...after].some((k) => k === id || k.startsWith(`${id}:`))) {
        // v1 keys were productId only
        const asNum = Number(id);
        if (Number.isFinite(asNum) && ![...after].some((k) => k.startsWith(`${asNum}:`))) {
          dropped += 1;
        } else if (!Number.isFinite(asNum) && !after.has(id)) {
          dropped += 1;
        }
      }
    });
    return { items, dropped };
  } catch {
    return { items: [], dropped: 0 };
  }
}

function groupCount(items: CartItem[]): number {
  const groups = new Set(items.map((i) => String(i.delivery)));
  return groups.size;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { count: stockCount, ready: stockReady } = useStock();

  useEffect(() => {
    const { items: next, dropped } = loadCart();
    setItems(next);
    setHydrated(true);
    if (dropped > 0) {
      toast.info(
        dropped === 1
          ? "One item in your cart is no longer available and was removed."
          : `${dropped} items in your cart are no longer available and were removed.`,
      );
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !stockReady) return;
    setItems((prev) => {
      const next = prev.filter((item) => {
        const product = getProductById(item.productId);
        return Boolean(product?.inStock);
      });
      if (next.length === prev.length) return prev;
      const dropped = prev.length - next.length;
      toast.info(
        dropped === 1
          ? "One item in your cart is no longer available and was removed."
          : `${dropped} items in your cart are no longer available and were removed.`,
      );
      return next;
    });
  }, [hydrated, stockReady, stockCount]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.removeItem("fpf-cart-v1");
  }, [items, hydrated]);

  const addItem = useCallback(
    (product: Product, qty = 1, delivery: DeliveryMode = "once") => {
      if (!product.inStock) return;
      const mode = parseDeliveryMode(delivery);
      const key = cartLineKey(product.id, mode);
      setItems((prev) => {
        const existing = prev.find((i) => i.lineKey === key);
        const nextQty = Math.min(50, (existing?.qty ?? 0) + qty);
        const line = lineFromProduct(product, nextQty, mode);
        const next = existing
          ? prev.map((i) => (i.lineKey === key ? line : i))
          : [...prev, line];
        return next;
      });
      setIsOpen(true);
    },
    [],
  );

  const setQty = useCallback((lineKey: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.lineKey !== lineKey);
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (!existing) return prev;
      const product = getProductById(existing.productId);
      if (!product || !product.inStock) {
        return prev.filter((i) => i.lineKey !== lineKey);
      }
      const line = lineFromProduct(product, qty, existing.delivery);
      return prev.map((i) => (i.lineKey === lineKey ? line : i));
    });
  }, []);

  const setDelivery = useCallback((lineKey: string, delivery: DeliveryMode) => {
    const mode = parseDeliveryMode(delivery);
    setItems((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (!existing) return prev;
      const product = getProductById(existing.productId);
      if (!product || !product.inStock) {
        return prev.filter((i) => i.lineKey !== lineKey);
      }
      const newKey = cartLineKey(product.id, mode);
      const other = prev.find((i) => i.lineKey === newKey && i.lineKey !== lineKey);
      const mergedQty = Math.min(
        50,
        existing.qty + (other && other.lineKey !== lineKey ? other.qty : 0),
      );
      const line = lineFromProduct(product, mergedQty, mode);
      return [
        ...prev.filter((i) => i.lineKey !== lineKey && i.lineKey !== newKey),
        line,
      ];
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartSummaryText = useCallback(() => {
    if (items.length === 0) return "";
    return items
      .map(
        (i) =>
          `${i.qty}× ${i.size} ${i.name} ($${i.price.toFixed(2)}${
            i.delivery === "once" ? "" : ` · auto`
          })`,
      )
      .join("; ");
  }, [items]);

  const itemCount = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((n, i) => n + i.price * i.qty, 0),
    [items],
  );
  const checkoutGroupCount = useMemo(() => groupCount(items), [items]);

  const value: CartContextValue = {
    items,
    itemCount,
    subtotal,
    checkoutGroupCount,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    toggleCart: () => setIsOpen((o) => !o),
    addItem,
    setQty,
    setDelivery,
    removeItem,
    clearCart,
    cartSummaryText,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

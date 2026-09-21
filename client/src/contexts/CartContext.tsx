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
  getProductById,
  unitPriceForQty,
  type Product,
} from "@shared/products";
import { trackAddedToCart } from "@/lib/klaviyo";

export type CartItem = {
  productId: number;
  size: string;
  merv: number;
  price: number;
  name: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  cartSummaryText: () => string;
};

const STORAGE_KEY = "fpf-cart-v1";

const CartContext = createContext<CartContextValue | null>(null);

function lineLabel(product: Product) {
  return product.isCarbon
    ? `${product.name} · MERV 8 Carbon`
    : `${product.name} · MERV ${product.merv}`;
}

function lineFromProduct(product: Product, qty: number): CartItem {
  const safeQty = Math.min(50, Math.max(0, qty));
  return {
    productId: product.id,
    size: product.size,
    merv: product.merv,
    price: unitPriceForQty(product.price, safeQty, product),
    name: lineLabel(product),
    qty: safeQty,
  };
}

function normalizeCart(items: CartItem[]): CartItem[] {
  const byId = new Map<number, number>();
  for (const item of items) {
    if (!item || typeof item.productId !== "number" || item.qty <= 0) continue;
    byId.set(item.productId, Math.min(50, (byId.get(item.productId) ?? 0) + item.qty));
  }
  const next: CartItem[] = [];
  byId.forEach((qty, productId) => {
    const product = getProductById(productId);
    if (!product || !product.inStock) return;
    next.push(lineFromProduct(product, qty));
  });
  return next;
}

function loadCart(): { items: CartItem[]; dropped: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], dropped: 0 };
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return { items: [], dropped: 0 };
    const before = new Set(
      parsed
        .map((item) => item?.productId)
        .filter((id): id is number => typeof id === "number"),
    );
    const items = normalizeCart(parsed);
    const after = new Set(items.map((item) => item.productId));
    let dropped = 0;
    before.forEach((id) => {
      if (!after.has(id)) dropped += 1;
    });
    return { items, dropped };
  } catch {
    return { items: [], dropped: 0 };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, qty = 1) => {
    if (!product.inStock) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const nextQty = Math.min(50, (existing?.qty ?? 0) + qty);
      const line = lineFromProduct(product, nextQty);
      const next = existing
        ? prev.map((i) => (i.productId === product.id ? line : i))
        : [...prev, line];
      trackAddedToCart(product, qty, next);
      return next;
    });
    setIsOpen(true);
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.productId !== productId);
      const product = getProductById(productId);
      if (!product || !product.inStock) return prev.filter((i) => i.productId !== productId);
      const line = lineFromProduct(product, qty);
      return prev.map((i) => (i.productId === productId ? line : i));
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartSummaryText = useCallback(() => {
    if (items.length === 0) return "";
    return items
      .map((i) => `${i.qty}× ${i.size} ${i.name} ($${i.price.toFixed(2)})`)
      .join("; ");
  }, [items]);

  const itemCount = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((n, i) => n + i.price * i.qty, 0),
    [items],
  );

  const value: CartContextValue = {
    items,
    itemCount,
    subtotal,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    toggleCart: () => setIsOpen((o) => !o),
    addItem,
    setQty,
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

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { applyStockKeys, stockKeyCount, stockSyncedAt } from "@shared/stock";

type StockContextValue = {
  ready: boolean;
  count: number;
  syncedAt: string | null;
  refresh: () => Promise<void>;
};

const StockContext = createContext<StockContextValue>({
  ready: false,
  count: stockKeyCount(),
  syncedAt: stockSyncedAt(),
  refresh: async () => undefined,
});

const REFRESH_MS = 15 * 60 * 1000;

async function fetchStockOverlay(): Promise<{ keys: string[]; syncedAt: string | null; count: number }> {
  const res = await fetch("/api/catalog/stock", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`stock ${res.status}`);
  const json = (await res.json()) as {
    keys?: string[];
    syncedAt?: string | null;
    count?: number;
  };
  const keys = Array.isArray(json.keys) ? json.keys : [];
  return {
    keys,
    syncedAt: json.syncedAt ?? null,
    count: typeof json.count === "number" ? json.count : keys.length,
  };
}

export function StockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(stockKeyCount());
  const [syncedAt, setSyncedAt] = useState<string | null>(stockSyncedAt());

  const refresh = async () => {
    try {
      const overlay = await fetchStockOverlay();
      if (overlay.keys.length) {
        applyStockKeys(overlay.keys, overlay.syncedAt);
        setCount(overlay.count);
        setSyncedAt(overlay.syncedAt);
      }
    } catch {
      // Keep bootstrap stock from the committed catalog JSON.
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <StockContext.Provider value={{ ready, count, syncedAt, refresh }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock(): StockContextValue {
  return useContext(StockContext);
}

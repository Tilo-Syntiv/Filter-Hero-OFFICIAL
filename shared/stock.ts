/**
 * Live Filter King stock keys (carry / do-not-carry).
 * No on-hand quantity — the API only lists stock parent models.
 * Shopper tickets stay in pricing/engine.ts. Never put unit_price here for the client.
 */
import FILTERKING_CATALOG from "./filterking-catalog.json";

export type StockMervKey = "8" | "11" | "13" | "carbon";

export type StockCatalogItem = {
  parent_model: string;
  size: string;
  merv: string;
  actual_size?: string;
  filterKingUrl: string;
};

export type StockCatalogFile = {
  syncedAt?: string;
  count?: number;
  items: StockCatalogItem[];
};

export function normalizeStockSize(size: string): string {
  return size.toLowerCase().replace(/\s/g, "").replace(/[an]$/i, "");
}

export function normalizeParentModel(parent: string): string {
  return parent.replace(/[\u200B-\u200F\uFEFF]/g, "").trim();
}

export function parseFkMerv(raw: string): { merv: 8 | 11 | 13; isCarbon: boolean } | null {
  const v = raw.toLowerCase();
  if (v.includes("carbon") || v.includes("odor") || v === "co" || v === "carbon") {
    return { merv: 8, isCarbon: true };
  }
  if (v.includes("13")) return { merv: 13, isCarbon: false };
  if (v.includes("11")) return { merv: 11, isCarbon: false };
  if (v.includes("8")) return { merv: 8, isCarbon: false };
  return null;
}

export function stockKey(size: string, merv: 8 | 11 | 13, isCarbon = false): string {
  return `${normalizeStockSize(size)}|${isCarbon ? "carbon" : merv}`;
}

export function stockKeyFromItem(item: StockCatalogItem): string | null {
  const size = normalizeStockSize(item.size || "");
  const parsed = parseFkMerv(String(item.merv || ""));
  if (!size || !parsed) return null;
  return stockKey(size, parsed.merv, parsed.isCarbon);
}

type RuntimeMaps = {
  keys: Set<string>;
  parentByKey: Map<string, string>;
  urlByKey: Map<string, string>;
  syncedAt: string | null;
};

function mapsFromItems(items: StockCatalogItem[], syncedAt: string | null): RuntimeMaps {
  const keys = new Set<string>();
  const parentByKey = new Map<string, string>();
  const urlByKey = new Map<string, string>();
  for (const item of items) {
    const key = stockKeyFromItem(item);
    const parent = normalizeParentModel(item.parent_model || "");
    if (!key || !parent) continue;
    keys.add(key);
    parentByKey.set(key, parent);
    if (item.filterKingUrl) urlByKey.set(key, item.filterKingUrl);
  }
  return { keys, parentByKey, urlByKey, syncedAt };
}

const bootstrapFile = FILTERKING_CATALOG as StockCatalogFile;
const bootstrap = mapsFromItems(bootstrapFile.items || [], bootstrapFile.syncedAt || null);

let runtime: RuntimeMaps = {
  keys: new Set(bootstrap.keys),
  parentByKey: new Map(bootstrap.parentByKey),
  urlByKey: new Map(bootstrap.urlByKey),
  syncedAt: bootstrap.syncedAt,
};

const listeners = new Set<() => void>();

export function onStockChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyStockChange() {
  for (const listener of listeners) listener();
}

/** Replace the active stock set (server sync or client /api/catalog/stock overlay). */
export function applyStockCatalog(
  items: StockCatalogItem[],
  syncedAt?: string | null,
): void {
  if (!items.length) return;
  runtime = mapsFromItems(items, syncedAt ?? null);
  notifyStockChange();
}

/** Client overlay: only sellable keys, no parent models required. */
export function applyStockKeys(keys: string[], syncedAt?: string | null): void {
  if (!keys.length) return;
  const next = new Set(keys.map((k) => k.toLowerCase()));
  runtime = {
    keys: next,
    parentByKey: runtime.parentByKey,
    urlByKey: runtime.urlByKey,
    syncedAt: syncedAt ?? runtime.syncedAt,
  };
  notifyStockChange();
}

export function stockSyncedAt(): string | null {
  return runtime.syncedAt;
}

export function stockKeyCount(): number {
  return runtime.keys.size;
}

export function stockKeys(): string[] {
  return Array.from(runtime.keys).sort();
}

export function isStockKeyActive(size: string, merv: 8 | 11 | 13, isCarbon = false): boolean {
  return runtime.keys.has(stockKey(size, merv, isCarbon));
}

export function stockParentModel(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon = false,
): string | undefined {
  return runtime.parentByKey.get(stockKey(size, merv, isCarbon));
}

export function stockFilterKingUrl(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon = false,
): string | undefined {
  return runtime.urlByKey.get(stockKey(size, merv, isCarbon));
}

export function stockSizeSlugs(): string[] {
  const sizes = new Set<string>();
  for (const key of runtime.keys) {
    const size = key.split("|")[0];
    if (size) sizes.add(size);
  }
  return Array.from(sizes).sort();
}

export function bootstrapStockItems(): StockCatalogItem[] {
  return bootstrapFile.items || [];
}

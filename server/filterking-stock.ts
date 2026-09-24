/**
 * Live Filter King stock sync for the Express process.
 * Persists under DATA_DIR. unit_price stays server-only for wholesale fallback.
 */
import fs from "node:fs";
import { filterKingPdpUrl } from "../shared/filterking";
import { setWholesaleCostFallback } from "../shared/pricing/engine";
import {
  applyStockCatalog,
  bootstrapStockItems,
  normalizeParentModel,
  normalizeStockSize,
  parseFkMerv,
  stockKey,
  stockKeyCount,
  stockKeys,
  stockSyncedAt,
  type StockCatalogItem,
} from "../shared/stock";
import { dataFile } from "./data-store";
import { fetchAllParentModels, filterKingConfigured, type FilterKingParentModel } from "./filterking";

const SYNC_MS = 15 * 60 * 1000;
const STOCK_FILE = "filterking-stock.json";

export type StockDiskItem = StockCatalogItem & {
  /** Dealer unit — never send to the client stock API. */
  unitPrice?: number;
};

type StockDiskFile = {
  syncedAt: string;
  count: number;
  items: StockDiskItem[];
};

let parentModels = new Set<string>();
let costByKey = new Map<string, number>();
let syncedAt: string | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let syncing = false;

function stockPath(): string {
  return dataFile(STOCK_FILE);
}

function parseUnitPrice(raw: number | string | undefined): number | undefined {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function preferParent(existing: string | undefined, next: string): string {
  if (!existing) return next;
  const existingExact = /A-M|\dA-M/i.test(existing);
  const nextExact = /A-M|\dA-M/i.test(next);
  if (existingExact && !nextExact) return next;
  return existing;
}

export function normalizeStockRows(raw: FilterKingParentModel[]): StockDiskItem[] {
  const byKey = new Map<string, StockDiskItem>();
  for (const item of raw) {
    const parent = normalizeParentModel(item.parent_model || "");
    const size = normalizeStockSize(item.size || "");
    const parsed = parseFkMerv(String(item.merv || ""));
    if (!parent || !size || !parsed) continue;
    const mervKey = parsed.isCarbon ? "carbon" : String(parsed.merv);
    const key = stockKey(size, parsed.merv, parsed.isCarbon);
    const next: StockDiskItem = {
      parent_model: parent,
      size,
      merv: mervKey,
      actual_size: item.actual_size,
      filterKingUrl: filterKingPdpUrl(size, parsed.merv, parsed.isCarbon),
      unitPrice: parseUnitPrice(item.unit_price),
    };
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, next);
      continue;
    }
    byKey.set(key, {
      ...prev,
      parent_model: preferParent(prev.parent_model, next.parent_model),
      unitPrice: prev.unitPrice ?? next.unitPrice,
      actual_size: prev.actual_size || next.actual_size,
    });
  }
  return Array.from(byKey.values());
}

function applyDiskItems(items: StockDiskItem[], at: string, allParents?: string[]) {
  parentModels = new Set(
    (allParents && allParents.length
      ? allParents
      : items.map((i) => i.parent_model)
    ).map((p) => normalizeParentModel(p).toLowerCase()),
  );
  costByKey = new Map();
  for (const item of items) {
    const parsed = parseFkMerv(item.merv);
    if (!parsed) continue;
    const key = stockKey(item.size, parsed.merv, parsed.isCarbon);
    if (item.unitPrice != null) costByKey.set(key, item.unitPrice);
  }
  syncedAt = at;
  const publicItems: StockCatalogItem[] = items.map(
    ({ parent_model, size, merv, actual_size, filterKingUrl }) => ({
      parent_model,
      size,
      merv,
      actual_size,
      filterKingUrl,
    }),
  );
  applyStockCatalog(publicItems, at);
}

function loadFromDisk(): boolean {
  const path = stockPath();
  if (!fs.existsSync(path)) return false;
  try {
    const file = JSON.parse(fs.readFileSync(path, "utf8")) as StockDiskFile;
    if (!Array.isArray(file.items) || file.items.length === 0) return false;
    applyDiskItems(file.items, file.syncedAt || new Date().toISOString());
    return true;
  } catch (err) {
    console.warn("[filterking-stock] failed to read disk cache:", err);
    return false;
  }
}

function writeDisk(items: StockDiskItem[], at: string) {
  const payload: StockDiskFile = { syncedAt: at, count: items.length, items };
  fs.writeFileSync(stockPath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function refreshFilterKingStock(): Promise<{ count: number; syncedAt: string }> {
  if (!filterKingConfigured()) {
    throw new Error("FILTERKING_CLIENT_ID / FILTERKING_CLIENT_SECRET are not set");
  }
  const raw = await fetchAllParentModels();
  const allParents = raw
    .map((row) => normalizeParentModel(row.parent_model || ""))
    .filter(Boolean);
  const items = normalizeStockRows(raw);
  if (!items.length) throw new Error("Filter King stock returned 0 parent models");
  const at = new Date().toISOString();
  writeDisk(items, at);
  applyDiskItems(items, at, allParents);
  return { count: items.length, syncedAt: at };
}

export function isParentModelInStock(parentModel: string | undefined): boolean {
  if (!parentModel) return false;
  const needle = normalizeParentModel(parentModel).toLowerCase();
  if (parentModels.size > 0) return parentModels.has(needle);
  return false;
}

export function stockSyncedAtLive(): string | null {
  return syncedAt;
}

export function wholesaleCostFromStock(
  size: string,
  merv: 8 | 11 | 13,
  isCarbon = false,
): number | undefined {
  return costByKey.get(stockKey(size, merv, isCarbon));
}

export function catalogStockResponse(): {
  syncedAt: string | null;
  count: number;
  keys: string[];
} {
  return {
    syncedAt: syncedAt || stockSyncedAt(),
    count: stockKeyCount(),
    keys: stockKeys(),
  };
}

export async function startFilterKingStockSync(): Promise<void> {
  setWholesaleCostFallback(wholesaleCostFromStock);
  if (!loadFromDisk()) {
    const bootstrap = bootstrapStockItems();
    if (bootstrap.length) {
      applyDiskItems(bootstrap, stockSyncedAt() || new Date().toISOString());
    }
  }

  if (!filterKingConfigured()) {
    console.warn("[filterking-stock] credentials unset — using bootstrap / disk only");
    return;
  }

  const run = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const result = await refreshFilterKingStock();
      console.log(`[filterking-stock] synced ${result.count} parent models`);
    } catch (err) {
      console.warn(
        "[filterking-stock] sync failed; keeping last good cache:",
        err instanceof Error ? err.message : err,
      );
    } finally {
      syncing = false;
    }
  };

  await run();
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(run, SYNC_MS);
  if (typeof syncTimer.unref === "function") syncTimer.unref();
}

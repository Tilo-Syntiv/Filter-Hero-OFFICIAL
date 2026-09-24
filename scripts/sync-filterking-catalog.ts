/**
 * Sync Filter King parent models into shared/filterking-catalog.json.
 * Does not copy unit_price. Shopper tickets stay in engine.ts.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAllParentModels, filterKingConfigured } from "../server/filterking.ts";
import { filterKingPdpUrl } from "../shared/filterking.ts";
import { normalizeParentModel, normalizeStockSize, parseFkMerv } from "../shared/stock.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "shared", "filterking-catalog.json");

if (!filterKingConfigured()) {
  console.log("FILTERKING_CLIENT_ID / SECRET unset — skip API sync. Constructed PDP URLs still apply.");
  process.exit(0);
}

type Row = {
  parent_model: string;
  size: string;
  merv: string;
  actual_size?: string;
  filterKingUrl: string;
};

const items = await fetchAllParentModels();
const byKey = new Map<string, Row>();
for (const item of items) {
  const parent = normalizeParentModel(item.parent_model || "");
  const size = normalizeStockSize(item.size || "");
  const parsed = parseFkMerv(String(item.merv || ""));
  if (!parent || !size || !parsed) continue;
  const merv = parsed.isCarbon ? "carbon" : String(parsed.merv);
  const key = `${size}|${merv}`;
  const next: Row = {
    parent_model: parent,
    size,
    merv,
    actual_size: item.actual_size,
    filterKingUrl: filterKingPdpUrl(size, parsed.merv, parsed.isCarbon),
  };
  const prev = byKey.get(key);
  if (!prev) {
    byKey.set(key, next);
    continue;
  }
  const prevExact = /A-M|\dA-M/i.test(prev.parent_model);
  const nextExact = /A-M|\dA-M/i.test(next.parent_model);
  byKey.set(key, {
    ...prev,
    parent_model: prevExact && !nextExact ? next.parent_model : prev.parent_model,
    actual_size: prev.actual_size || next.actual_size,
  });
}
const rows = Array.from(byKey.values());

fs.writeFileSync(
  OUT,
  `${JSON.stringify({ syncedAt: new Date().toISOString(), count: rows.length, items: rows }, null, 2)}\n`,
  "utf8",
);
console.log(`Wrote ${rows.length} Filter King parent models (no unit_price) to ${path.relative(ROOT, OUT)}`);

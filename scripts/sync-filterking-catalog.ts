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

function mervKey(raw: string): { merv: 8 | 11 | 13; isCarbon: boolean } | null {
  const v = raw.toLowerCase();
  if (v.includes("carbon") || v.includes("odor")) return { merv: 8, isCarbon: true };
  if (v.includes("13")) return { merv: 13, isCarbon: false };
  if (v.includes("11")) return { merv: 11, isCarbon: false };
  if (v.includes("8")) return { merv: 8, isCarbon: false };
  return null;
}

const items = await fetchAllParentModels();
const rows: Row[] = [];
for (const item of items) {
  const parent = (item.parent_model || "").trim();
  const size = (item.size || "").trim().toLowerCase().replace(/\s/g, "");
  const parsed = mervKey(String(item.merv || ""));
  if (!parent || !size || !parsed) continue;
  rows.push({
    parent_model: parent,
    size,
    merv: parsed.isCarbon ? "carbon" : String(parsed.merv),
    actual_size: item.actual_size,
    filterKingUrl: filterKingPdpUrl(size, parsed.merv, parsed.isCarbon),
  });
}

fs.writeFileSync(
  OUT,
  `${JSON.stringify({ syncedAt: new Date().toISOString(), count: rows.length, items: rows }, null, 2)}\n`,
  "utf8",
);
console.log(`Wrote ${rows.length} Filter King parent models (no unit_price) to ${path.relative(ROOT, OUT)}`);

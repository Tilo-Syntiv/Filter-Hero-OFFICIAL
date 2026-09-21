/**
 * Rebuild shared/sellable-skus.json from the Model Pricing workbook CSV.
 * Sale Price is wholesale. Shopper tickets stay in shared/pricing/engine.ts.
 *
 * Usage: pnpm exec tsx scripts/build-sellable-skus.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterKingPdpUrl } from "../shared/filterking.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEET = path.join(ROOT, "shared", "pricing", "model-pricing.csv");
const CATALOG = path.join(ROOT, "shared", "filter-catalog.json");
const OUT = path.join(ROOT, "shared", "sellable-skus.json");

type SheetRow = {
  size: string;
  merv: 8 | 11 | 13;
  isCarbon?: boolean;
  wholesaleSku: string;
  parentModel: string;
  cost: number;
  actualWidth?: number;
  actualLength?: number;
  actualDepth?: number;
  filterKingUrl: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      if (row.some((part) => part.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((part) => part.trim())) rows.push(row);
  }
  return rows;
}

function parseMerv(raw: string): { merv: 8 | 11 | 13; isCarbon: boolean } | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  if (v.includes("CARBON") || v.includes("ODOR") || v.endsWith("-CO") || v === "CO") {
    return { merv: 8, isCarbon: true };
  }
  const n = Number(v.replace(/MERV\s*/i, "").replace(/[^\d]/g, ""));
  if (n === 8 || n === 11 || n === 13) return { merv: n, isCarbon: false };
  return null;
}

function parseActual(raw: string): { actualWidth: number; actualLength: number; actualDepth: number } | undefined {
  const parts = raw.toLowerCase().replace(/inches?/g, "").split(/x/).map((p) => Number(p.trim()));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return undefined;
  return { actualWidth: parts[0], actualLength: parts[1], actualDepth: parts[2] };
}

const table = parseCsv(fs.readFileSync(SHEET, "utf8"));
const header = table[0]?.map((h) => h.trim().toLowerCase()) ?? [];
const col = (name: string) => header.indexOf(name);
const parentIdx = col("parent model");
const sizeIdx = col("size");
const actualIdx = col("actual size");
const mervIdx = col("merv");
const priceIdx = col("sale price");
if ([parentIdx, sizeIdx, mervIdx, priceIdx].some((i) => i < 0)) {
  throw new Error(`Unexpected Model Pricing columns: ${header.join(", ")}`);
}

const parsed: SheetRow[] = [];
for (const cells of table.slice(1)) {
  const parentModel = (cells[parentIdx] || "").trim();
  const sizeRaw = (cells[sizeIdx] || "").trim().toLowerCase().replace(/\s/g, "");
  const size = sizeRaw.replace(/[an]$/i, "");
  const merv = parseMerv(cells[mervIdx] || "");
  const cost = Number(String(cells[priceIdx] || "").replace(/[$,]/g, ""));
  if (!parentModel || !size || !merv || !Number.isFinite(cost)) continue;
  const actual = actualIdx >= 0 ? parseActual(cells[actualIdx] || "") : undefined;
  parsed.push({
    size,
    merv: merv.merv,
    ...(merv.isCarbon ? { isCarbon: true } : {}),
    wholesaleSku: parentModel,
    parentModel,
    cost,
    ...actual,
    filterKingUrl: filterKingPdpUrl(size, merv.merv, merv.isCarbon),
  });
}

const grouped = new Map<string, SheetRow>();
for (const row of parsed) {
  const key = `${row.size}|${row.isCarbon ? "carbon" : row.merv}`;
  const prev = grouped.get(key);
  if (!prev || row.cost < prev.cost) grouped.set(key, row);
}

const skus = Array.from(grouped.values()).sort(
  (a, b) => a.size.localeCompare(b.size, "en") || Number(Boolean(a.isCarbon)) - Number(Boolean(b.isCarbon)) || a.merv - b.merv,
);

const catalog = new Set(
  (JSON.parse(fs.readFileSync(CATALOG, "utf8")) as Array<[number, number, number]>).map(
    ([w, l, d]) => `${w}x${l}x${d}`.toLowerCase(),
  ),
);
const missing = skus.filter((s) => !catalog.has(s.size));
if (missing.length) {
  console.warn(
    `Wholesale sizes not in filter-catalog.json (finder will still quote): ${missing
      .map((s) => s.size)
      .join(", ")}`,
  );
}

const payload = {
  source: "Model Pricing - Contractor Commerce.xlsx",
  extractedFrom: "shared/pricing/model-pricing.csv",
  note: "Wholesale cost only. Shopper tickets are Filtrete in shared/pricing/engine.ts. VITE_FULL_CATALOG=false restricts checkout to this list.",
  sheetRows: parsed.length,
  count: skus.length,
  sizes: new Set(skus.map((s) => s.size)).size,
  skus,
};

fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      wrote: path.relative(ROOT, OUT),
      sheetRows: payload.sheetRows,
      uniqueSkus: payload.count,
      uniqueSizes: payload.sizes,
    },
    null,
    2,
  ),
);

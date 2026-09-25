/**
 * Identity-only catalog mirrors. Never copy wholesale cost or API unit_price.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SITE_URL } from "../../shared/seo.ts";
import {
  catalogStripeProductId,
  packShotSrc,
  sellableSheetProducts,
} from "../../shared/products.ts";
import {
  loadStripeCatalogFile,
  stripeCatalogPath,
  stripeKeyIsLive,
  writeStripeCatalogFile,
} from "../../shared/stripe-catalog.ts";
import { buildKlaviyoCatalog, isKlaviyoEnabled, klaviyoApi } from "../../server/klaviyo.ts";

export type CatalogIdentity = {
  id: number;
  size: string;
  merv: number;
  isCarbon: boolean;
  image: string;
  filterHeroUrl: string;
  filterKingUrl: string;
  parentModel?: string;
};

function filterHeroProductUrl(
  product: { size: string; merv: number; isCarbon?: boolean },
  site: string,
): string {
  const merv = product.isCarbon ? "carbon" : String(product.merv);
  return `${site}/sizes/${encodeURIComponent(product.size)}?merv=${merv}`;
}

function origin(): string {
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function catalogIdentityRows(): CatalogIdentity[] {
  const site = origin();
  return sellableSheetProducts().map((product) => ({
    id: product.id,
    size: product.size,
    merv: product.merv,
    isCarbon: Boolean(product.isCarbon),
    image: `${site}${packShotSrc(product.merv, product.isCarbon)}`,
    filterHeroUrl: filterHeroProductUrl(product, site),
    filterKingUrl: product.filterKingUrl || "",
    parentModel: product.parentModel,
  }));
}

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || key.includes("...")) return null;
  return new Stripe(key);
}

export async function syncStripeCatalog(): Promise<{ count: number; skipped?: string }> {
  const stripe = stripeClient();
  const rows = catalogIdentityRows();
  if (!stripe) return { count: 0, skipped: "STRIPE_SECRET_KEY unset" };
  const map: Record<string, string> = { ...loadStripeCatalogFile().products };
  for (const row of rows) {
    const id = catalogStripeProductId(row.id);
    const payload = {
      name: row.isCarbon ? `${row.size} MERV 8 Carbon` : `${row.size} MERV ${row.merv}`,
      images: [row.image],
      url: row.filterHeroUrl,
      metadata: {
        size: row.size,
        merv: String(row.merv),
        filterKingUrl: row.filterKingUrl,
        parentModel: row.parentModel || "",
      },
    };
    try {
      await stripe.products.update(id, payload);
      map[String(row.id)] = id;
    } catch {
      const created = await stripe.products.create({ id, ...payload });
      map[String(row.id)] = created.id;
    }
  }
  writeStripeCatalogFile({
    syncedAt: new Date().toISOString(),
    account: null,
    livemode: stripeKeyIsLive(),
    count: Object.keys(map).length,
    products: map,
  });
  return { count: rows.length };
}

export async function syncSupabaseCatalog(): Promise<{ count: number; skipped?: string }> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return { count: 0, skipped: "Supabase unset" };
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = catalogIdentityRows().map((row) => ({
    id: row.id,
    size: row.size,
    merv: row.merv,
    is_carbon: row.isCarbon,
    image_url: row.image,
    filter_hero_url: row.filterHeroUrl,
    filter_king_url: row.filterKingUrl,
    parent_model: row.parentModel ?? null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from("catalog_skus").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(error.message);
  return { count: rows.length };
}

export async function syncKlaviyoCatalog(): Promise<{ count: number; skipped?: string }> {
  if (!isKlaviyoEnabled()) return { count: 0, skipped: "Klaviyo disabled" };
  const catalog = buildKlaviyoCatalog(origin());
  const existing = new Map<string, string>();
  let next: string | null = "/api/catalog-items?page[size]=100";
  let pages = 0;
  while (next && pages < 40) {
    const res: {
      ok: boolean;
      status: number;
      data: {
        data?: Array<{ id?: string; attributes?: { external_id?: string } }>;
        links?: { next?: string | null };
      } | null;
      error?: string;
    } = await klaviyoApi("GET", next);
    if (!res.ok || !res.data?.data) break;
    for (const item of res.data.data) {
      if (item.id && item.attributes?.external_id) {
        existing.set(item.attributes.external_id, item.id);
      }
    }
    next = res.data.links?.next ? res.data.links.next.replace("https://a.klaviyo.com", "") : null;
    pages += 1;
  }
  const want = new Set(catalog.items.map((item) => item.id));
  for (const item of catalog.items) {
    const body = {
      type: "catalog-item",
      attributes: {
        external_id: item.id,
        integration_type: "$custom",
        title: item.title,
        description: item.description,
        url: item.link,
        image_full_url: item.image_link,
        published: true,
        price: item.price,
      },
    };
    const klaviyoId = existing.get(item.id);
    if (klaviyoId) {
      await klaviyoApi("PATCH", `/api/catalog-items/${klaviyoId}/`, { data: { ...body, id: klaviyoId } });
    } else {
      await klaviyoApi("POST", "/api/catalog-items/", { data: body });
    }
  }
  for (const [externalId, klaviyoId] of existing) {
    if (!want.has(externalId)) {
      await klaviyoApi("DELETE", `/api/catalog-items/${klaviyoId}/`);
    }
  }
  return { count: catalog.items.length };
}

export { stripeCatalogPath };

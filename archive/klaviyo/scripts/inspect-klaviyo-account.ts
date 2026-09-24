import "dotenv/config";
import { isKlaviyoEnabled, klaviyoApi } from "../server/klaviyo.ts";

type Named = { id?: string; attributes?: Record<string, unknown> };
type Page<T> = { data?: T[]; links?: { next?: string | null } };

async function collect<T extends Named>(firstPath: string): Promise<T[]> {
  const out: T[] = [];
  let path: string | null = firstPath;
  let pages = 0;
  while (path && pages < 40) {
    const res: { ok: boolean; error?: string; data: Page<T> | null } = await klaviyoApi<Page<T>>(
      "GET",
      path,
    );
    if (!res.ok || !res.data?.data) {
      if (res.error) console.error("collect fail", path, res.error);
      break;
    }
    out.push(...res.data.data);
    const next = res.data.links?.next;
    path = next ? next.replace("https://a.klaviyo.com", "") : null;
    pages += 1;
  }
  return out;
}

async function main() {
  if (!isKlaviyoEnabled()) {
    console.error("Klaviyo disabled");
    process.exit(1);
  }

  const wanted = [
    "Viewed Product",
    "Viewed Size",
    "Selected MERV",
    "Added to Cart",
    "Started Checkout",
    "Checkout Expired",
    "Placed Order",
    "Ordered Product",
    "Requested Quote",
    "Requested Support",
    "Signed Up Reminder",
  ];

  const [metrics, flows, templates, lists, items, segments] = await Promise.all([
    collect<Named>("/api/metrics"),
    collect<Named>("/api/flows?filter=equals(archived,false)"),
    collect<Named>("/api/templates?page[size]=10"),
    collect<Named>("/api/lists?page[size]=10"),
    collect<Named>("/api/catalog-items?page[size]=100"),
    collect<Named>("/api/segments?page[size]=10"),
  ]);
  const catalogJobs = await klaviyoApi<{
    data?: Array<{ id?: string; attributes?: Record<string, unknown> }>;
  }>("GET", "/api/catalog-item-bulk-create-jobs");

  const key = process.env.KLAVIYO_PRIVATE_API_KEY?.trim() || "";
  const domainRes = await fetch("https://a.klaviyo.com/api/sending-domains", {
    headers: {
      Authorization: `Klaviyo-API-Key ${key}`,
      accept: "application/vnd.api+json",
      revision: "2026-07-15.pre",
    },
  });
  const domainText = await domainRes.text();
  let sendingDomains: unknown = { error: domainText.slice(0, 240) };
  if (domainRes.ok) {
    const parsed = JSON.parse(domainText) as {
      data?: Array<{ attributes?: { domain?: string; status?: string; purpose?: string } }>;
    };
    sendingDomains = (parsed.data || []).map((row) => ({
      domain: row.attributes?.domain,
      status: row.attributes?.status,
      purpose: row.attributes?.purpose,
    }));
  }

  const byName = new Map(metrics.map((row) => [String(row.attributes?.name || ""), row.id || ""]));

  console.log(
    JSON.stringify(
      {
        metrics: wanted.map((name) => ({ name, id: byName.get(name) || null })),
        metricCount: metrics.length,
        flows: flows.map((row) => ({
          id: row.id,
          name: row.attributes?.name,
          status: row.attributes?.status,
          trigger: row.attributes?.trigger_type,
        })),
        templates: templates.map((row) => row.attributes?.name),
        lists: lists.map((row) => ({ id: row.id, name: row.attributes?.name })),
        segments: segments.map((row) => ({ id: row.id, name: row.attributes?.name })),
        catalogItemCount: items.length,
        catalogJobs: (catalogJobs.data?.data || []).map((row) => ({
          id: row.id,
          status: row.attributes?.status,
          completed: row.attributes?.completed_count,
          failed: row.attributes?.failed_count,
          total: row.attributes?.total_count,
        })),
        sendingDomains,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "dotenv/config";
import { isKlaviyoEnabled, klaviyoApi } from "../server/klaviyo.ts";

const MAPS = [
  { mapping: "revenue", metric: "Placed Order" },
  { mapping: "ordered_product", metric: "Ordered Product" },
  { mapping: "started_checkout", metric: "Started Checkout" },
  { mapping: "added_to_cart", metric: "Added to Cart" },
  { mapping: "viewed_product", metric: "Viewed Product" },
  { mapping: "refunded_sales", metric: "Refunded Payment" },
] as const;

type MetricRow = { id?: string; attributes?: { name?: string } };
type Page = { data?: MetricRow[]; links?: { next?: string | null } };

async function collectMetrics() {
  const out: MetricRow[] = [];
  let path: string | null = "/api/metrics";
  let pages = 0;
  while (path && pages < 20) {
    const res: { ok: boolean; data: Page | null } = await klaviyoApi<Page>("GET", path);
    if (!res.ok || !res.data?.data) break;
    out.push(...res.data.data);
    const next: string | null | undefined = res.data.links?.next;
    path = next ? next.replace("https://a.klaviyo.com", "") : null;
    pages += 1;
  }
  return new Map(
    out
      .filter((row) => row.id && row.attributes?.name)
      .map((row) => [String(row.attributes?.name), String(row.id)]),
  );
}

async function currentMapping(id: string) {
  const res = await klaviyoApi<{ data?: { id?: string } }>(
    "GET",
    `/api/mapped-metrics/${id}/relationships/metric`,
  );
  return { ok: res.ok, metricId: res.data?.data?.id || null, error: res.error };
}

async function main() {
  if (!isKlaviyoEnabled()) {
    console.error("Klaviyo disabled");
    process.exit(1);
  }
  const metrics = await collectMetrics();
  const report = [];
  for (const row of MAPS) {
    const metricId = metrics.get(row.metric) || null;
    const before = await currentMapping(row.mapping);
    let patched: { ok: boolean; error?: string } = { ok: true };
    if (metricId && before.metricId !== metricId) {
      patched = await klaviyoApi("PATCH", `/api/mapped-metrics/${row.mapping}`, {
        data: {
          type: "mapped-metric",
          id: row.mapping,
          relationships: {
            metric: { data: { type: "metric", id: metricId } },
          },
        },
      });
    }
    const after = await currentMapping(row.mapping);
    report.push({
      mapping: row.mapping,
      metric: row.metric,
      metricId,
      alreadyMapped: before.metricId === metricId,
      patched: patched.ok,
      mappedTo: after.metricId,
      ok: after.metricId === metricId,
      error: patched.error || after.error,
    });
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  console.log(JSON.stringify({ mappedMetrics: report }, null, 2));
  if (report.some((row) => !row.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

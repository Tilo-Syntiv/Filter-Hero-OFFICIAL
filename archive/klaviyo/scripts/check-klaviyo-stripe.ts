import "dotenv/config";
import { getKlaviyoAccount, klaviyoApi } from "../server/klaviyo.ts";
import { klaviyoStripeStatus } from "../server/klaviyo-stripe.ts";

const STRIPE_METRICS = [
  "Successfully Paid",
  "Failed Payment",
  "Refunded Payment",
  "Issued Invoice",
];

type Named = { id?: string; attributes?: { name?: string } };
type Page = { data?: Named[]; links?: { next?: string | null } };

async function collect(firstPath: string): Promise<Named[]> {
  const out: Named[] = [];
  let path: string | null = firstPath;
  let pages = 0;
  while (path && pages < 10) {
    const res: { ok: boolean; error?: string; data: Page | null } = await klaviyoApi<Page>(
      "GET",
      path,
    );
    if (!res.ok || !res.data?.data) {
      throw new Error(res.error || "Klaviyo metrics request failed");
    }
    out.push(...res.data.data);
    const nextUrl = res.data.links?.next ?? null;
    path = nextUrl ? nextUrl.replace("https://a.klaviyo.com", "") : null;
    pages += 1;
  }
  return out;
}

async function main() {
  const profileFilter = encodeURIComponent('equals(email,"klaviyo-stripe-check@filterhero.net")');
  const [account, stripeStatus, metrics, profile] = await Promise.all([
    getKlaviyoAccount(),
    klaviyoStripeStatus(),
    collect(`/api/metrics?filter=${encodeURIComponent('equals(integration.name,"Stripe")')}`),
    klaviyoApi<{ data?: Array<{ id?: string }> }>(
      "GET",
      `/api/profiles?filter=${profileFilter}&fields[profile]=email`,
    ),
  ]);
  const byName = new Map(
    metrics.map((row) => [String(row.attributes?.name || ""), row.id || ""]),
  );
  const stripeMetrics = STRIPE_METRICS.map((name) => ({
    name,
    id: byName.get(name) || null,
  }));
  const report = {
    klaviyo: {
      ok: account.ok,
      organization: account.organization || null,
      accountId: account.accountId || null,
    },
    stripeWebhook: {
      nativeWebhook: stripeStatus.nativeWebhook,
      nativeConflict: stripeStatus.nativeConflict,
      fulfillmentConflict: stripeStatus.fulfillmentConflict,
      url: stripeStatus.url,
      webhookId: stripeStatus.webhookId,
      stripeAccountId: stripeStatus.stripeAccountId,
      stripeAccountName: stripeStatus.stripeAccountName,
      oauthAccountMatch: stripeStatus.oauthAccountMatch,
    },
    stripeMetrics,
    testProfile: {
      ok: profile.ok,
      found: Boolean(profile.data?.data?.length),
      id: profile.data?.data?.[0]?.id || null,
    },
  };
  console.log(JSON.stringify(report, null, 2));

  const missing = stripeMetrics.filter((row) => !row.id).map((row) => row.name);
  if (!account.ok) throw new Error(account.error || "Klaviyo account ping failed");
  if (stripeStatus.nativeConflict) {
    throw new Error("Sandbox must not host the Klaviyo native webhook. Run pnpm setup:stripe-webhook.");
  }
  if (stripeStatus.fulfillmentConflict) {
    throw new Error("This Stripe key must not post checkout events to filterhero.net. Run pnpm setup:stripe-webhook.");
  }
  if (stripeStatus.oauthAccountMatch && !stripeStatus.nativeWebhook) {
    throw new Error("Native Klaviyo Stripe webhook is missing on FILTER HERO");
  }
  if (missing.length) {
    throw new Error(`Stripe metrics missing: ${missing.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

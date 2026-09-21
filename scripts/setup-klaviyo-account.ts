import "dotenv/config";
import { BRAND_EMAIL, BRAND_NAME } from "../shared/const.ts";
import { EMAIL_BRAND, emailLogoUrl } from "../shared/email-brand.ts";
import { DEFAULT_SITE_URL } from "../shared/seo.ts";
import {
  buildKlaviyoCatalog,
  getKlaviyoAccount,
  isKlaviyoEnabled,
  klaviyoApi,
  resolveMarketingListId,
  subscribeMarketingEmail,
  trackKlaviyoEvent,
  upsertKlaviyoProfile,
} from "../server/klaviyo.ts";

const CATALOG_ORIGIN = DEFAULT_SITE_URL;
const FROM_EMAIL = process.env.CONTACT_TO?.trim() || BRAND_EMAIL;
const TEST_EMAIL = "klaviyo-wire-check@filterhero.net";
/** Resend already claims `send.filterhero.net` (FH-172). Do not reuse that host. */
const KLAVIYO_SEND_DOMAIN = "klv.filterhero.net";
const RESEND_SEND_DOMAIN = "send.filterhero.net";

type Named = { id?: string; attributes?: { name?: string } };
type Page<T> = { data?: T[]; links?: { next?: string | null } };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collect<T extends Named>(firstPath: string): Promise<T[]> {
  const out: T[] = [];
  let path: string | null = firstPath;
  let pages = 0;
  while (path && pages < 40) {
    let res: { ok: boolean; error?: string; data: Page<T> | null } = await klaviyoApi<Page<T>>(
      "GET",
      path,
    );
    if (!res.ok && /throttled/i.test(res.error || "")) {
      await sleep(1500);
      res = await klaviyoApi<Page<T>>("GET", path);
    }
    if (!res.ok || !res.data?.data) {
      if (res.error) console.error("[collect]", path, res.error);
      break;
    }
    out.push(...res.data.data);
    const next: string | null | undefined = res.data.links?.next;
    path = next ? next.replace("https://a.klaviyo.com", "") : null;
    pages += 1;
  }
  return out;
}

async function collectMetrics(): Promise<Named[]> {
  return collect<Named>("/api/metrics");
}

function metricMap(metrics: Named[]): Map<string, string> {
  return new Map(
    metrics
      .filter((row) => row.id && row.attributes?.name)
      .map((row) => [String(row.attributes?.name), String(row.id)]),
  );
}

function htmlEmail(title: string, body: string): string {
  const logo = emailLogoUrl();
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:${EMAIL_BRAND.canvas};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_BRAND.deep}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:${EMAIL_BRAND.white};border-radius:12px;overflow:hidden">
        <tr><td align="center" style="background:${EMAIL_BRAND.white};padding:24px 28px 16px;border-bottom:4px solid ${EMAIL_BRAND.navy}">
          <a href="${CATALOG_ORIGIN}" style="text-decoration:none">
            <img alt="${BRAND_NAME}" width="${EMAIL_BRAND.logoWidth}" height="${EMAIL_BRAND.logoHeight}" src="${logo}" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none">
          </a>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 16px;font-size:22px;color:${EMAIL_BRAND.navy}">${title}</h1>
          ${body}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#5b6475">
        ${BRAND_NAME} · This is a marketing email.
        <a href="{% unsubscribe_link %}">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

const TEMPLATES = [
  {
    name: "FH Welcome D0",
    subject: "You're on the Filter Hero list",
    html: htmlEmail(
      "You're on the list",
      `<p>Hi {{ first_name|default:'there' }},</p>
<p>We'll send filter tips and restock offers here. Quote replies and order confirmations come separately — this is not a receipt.</p>
<p>Replacement reminders start after you buy, not from Filter Clock.</p>
<p><a href="${CATALOG_ORIGIN}">Shop filters</a></p>`,
    ),
  },
  {
    name: "FH Welcome D1",
    subject: "How to read your filter size",
    html: htmlEmail(
      "Find the size on the frame",
      `<p>The printed size is usually width × length × depth, like 20x25x1. Measure the slot if the label is gone.</p>
<p><a href="${CATALOG_ORIGIN}/#finder">Open the size finder</a></p>`,
    ),
  },
  {
    name: "FH Welcome D3",
    subject: "A pack that lasts the year",
    html: htmlEmail(
      "Most homes buy a pack",
      `<p>A 4- or 6-pack of your size covers a typical year. Buy after you know the size — we'll remind you from that order.</p>
<p><a href="${CATALOG_ORIGIN}">Shop packs</a></p>`,
    ),
  },
  {
    name: "FH Abandon 1h",
    subject: "Your filters are still in the cart",
    html: htmlEmail(
      "Still want these filters?",
      `<p>You started checkout and left it open. Finish here:</p>
<p><a href="{{ event.CheckoutURL|default:'https://filterhero.net' }}">Return to checkout</a></p>`,
    ),
  },
  {
    name: "FH Abandon 24h",
    subject: "Your Filter Hero cart is waiting",
    html: htmlEmail(
      "Last nudge on that cart",
      `<p>Same cart, same checkout link. If you already paid, ignore this.</p>
<p><a href="{{ event.CheckoutURL|default:'https://filterhero.net' }}">Finish checkout</a></p>`,
    ),
  },
  {
    name: "FH Post install",
    subject: "Seat the filter so air actually moves",
    html: htmlEmail(
      "How to seat the new filter",
      `<p>Arrow on the frame points the way the air flows. Slide it in until the gasket sits flush. This is not another order confirmation.</p>
<p><a href="${CATALOG_ORIGIN}/how-often-to-change-air-filter">Change guide</a></p>`,
    ),
  },
  {
    name: "FH Post review",
    subject: "How did the filters fit?",
    html: htmlEmail(
      "Tell us if the size was right",
      `<p>If the fit was off, reply and we'll help. If it was right, a short review helps the next home.</p>
<p><a href="${CATALOG_ORIGIN}">Back to Filter Hero</a></p>`,
    ),
  },
  {
    name: "FH Replenish T-7",
    subject: "Filters are due in a week",
    html: htmlEmail(
      "Swap week is coming",
      `<p>Your next change is around {{ person.next_change_date|default:'soon' }}. This reminder started because you already bought — not from Filter Clock.</p>
<p><a href="${CATALOG_ORIGIN}">Reorder your size</a></p>`,
    ),
  },
  {
    name: "FH Replenish T-2",
    subject: "Two days until filter swap",
    html: htmlEmail(
      "Almost swap day",
      `<p>If you already restocked, you can ignore this. A new order resets the date.</p>
<p><a href="${CATALOG_ORIGIN}">Shop now</a></p>`,
    ),
  },
  {
    name: "FH Replenish due",
    subject: "Today is filter-change day",
    html: htmlEmail(
      "Change the filter today",
      `<p>Pull the old one, seat the new one, and you're set. We'll remind you again after the next purchase.</p>
<p><a href="${CATALOG_ORIGIN}">Need another pack?</a></p>`,
    ),
  },
  {
    name: "FH Winback D0",
    subject: "Still the same filter size?",
    html: htmlEmail(
      "It's been a while",
      `<p>If the house still uses the same size, a pack is a short click. Unsubscribe anytime — this is marketing, not an order receipt.</p>
<p><a href="${CATALOG_ORIGIN}">Shop your size</a></p>`,
    ),
  },
  {
    name: "FH Winback D14",
    subject: "Last restock note from Filter Hero",
    html: htmlEmail(
      "We'll leave your inbox alone after this",
      `<p>If you already switched brands or sizes, no need to do anything. If you still need filters, we're here.</p>
<p><a href="${CATALOG_ORIGIN}">Shop filters</a></p>`,
    ),
  },
] as const;

const SEED_METRICS = [
  { metric: "Viewed Product", properties: { ProductName: "20x25x1 MERV 8", ProductID: "seed", Size: "20x25x1" } },
  { metric: "Viewed Size", properties: { Size: "20x25x1" } },
  { metric: "Selected MERV", properties: { MERV: "8" } },
  { metric: "Added to Cart", properties: { AddedItemProductName: "20x25x1 MERV 8", $value: 12.99 }, value: 12.99 },
  {
    metric: "Started Checkout",
    properties: { CheckoutURL: `${CATALOG_ORIGIN}/checkout/cancel`, ItemNames: ["20x25x1 MERV 8"] },
    value: 12.99,
  },
  { metric: "Checkout Expired", properties: { CheckoutSessionId: "cs_test_seed" } },
  { metric: "Placed Order", properties: { OrderId: "seed-order", ItemNames: ["20x25x1 MERV 8"] }, value: 21.59 },
  { metric: "Ordered Product", properties: { ProductName: "20x25x1 MERV 8", ProductID: "seed" }, value: 21.59 },
  { metric: "Requested Quote", properties: { Intent: "quote", FilterSize: "20x25x1" } },
  { metric: "Requested Support", properties: { Intent: "support" } },
  { metric: "Signed Up Reminder", properties: { house_type: "quiet", change_interval_days: 90 } },
] as const;

async function seedMetrics() {
  await upsertKlaviyoProfile({
    email: TEST_EMAIL,
    firstName: "Filter",
    lastName: "Hero",
    properties: { source: "account-setup", next_change_date: "2026-12-03" },
  });
  const results: Array<{ metric: string; ok: boolean; error?: string }> = [];
  for (const row of SEED_METRICS) {
    const sent = await trackKlaviyoEvent({
      metric: row.metric,
      email: TEST_EMAIL,
      uniqueId: `setup:${row.metric}:${new Date().toISOString().slice(0, 10)}`,
      properties: row.properties as Record<string, unknown>,
      value: "value" in row ? row.value : undefined,
    });
    results.push({ metric: row.metric, ok: sent.ok, error: sent.error });
  }
  return results;
}

async function waitForMetrics(names: string[], timeoutMs = 60000): Promise<Map<string, string>> {
  const start = Date.now();
  let latest = new Map<string, string>();
  while (Date.now() - start < timeoutMs) {
    latest = metricMap(await collectMetrics());
    if (names.every((name) => latest.has(name))) return latest;
    await sleep(4000);
  }
  return latest;
}

async function ensureTemplates() {
  const existing = await collect<Named>("/api/templates?page[size]=10");
  const byName = new Map(existing.map((row) => [row.attributes?.name || "", row.id || ""]));
  const ids: Record<string, string> = {};
  for (const tpl of TEMPLATES) {
    const already = byName.get(tpl.name);
    if (already) {
      ids[tpl.name] = already;
      continue;
    }
    const created = await klaviyoApi<{ data?: { id?: string } }>("POST", "/api/templates", {
      data: {
        type: "template",
        attributes: {
          name: tpl.name,
          editor_type: "CODE",
          html: tpl.html,
          text: tpl.name,
        },
      },
    });
    if (created.ok && created.data?.data?.id) ids[tpl.name] = created.data.data.id;
    else console.error("[template]", tpl.name, created.error);
  }
  return ids;
}

async function catalogJobSnapshot() {
  const res = await klaviyoApi<{
    data?: Array<{
      id?: string;
      attributes?: {
        status?: string;
        completed_count?: number;
        failed_count?: number;
        total_count?: number;
      };
    }>;
  }>("GET", "/api/catalog-item-bulk-create-jobs");
  return (res.data?.data || []).map((row) => ({
    id: row.id,
    status: row.attributes?.status || "unknown",
    completed: row.attributes?.completed_count ?? 0,
    failed: row.attributes?.failed_count ?? 0,
    total: row.attributes?.total_count ?? 0,
  }));
}

async function waitForCatalogJobs(timeoutMs = 90000) {
  const start = Date.now();
  let jobs = await catalogJobSnapshot();
  while (jobs.some((job) => job.status === "processing") && Date.now() - start < timeoutMs) {
    await sleep(5000);
    jobs = await catalogJobSnapshot();
  }
  return jobs;
}

async function syncCatalog() {
  const catalog = buildKlaviyoCatalog(CATALOG_ORIGIN);
  const jobs = await waitForCatalogJobs();
  const existing = await collect<{ id?: string }>("/api/catalog-items?page[size]=100");
  if (existing.length >= catalog.items.length) {
    return { skipped: true, count: existing.length, jobs };
  }
  if (jobs.some((job) => job.status === "processing" || job.status === "complete")) {
    return { skipped: true, count: existing.length, jobs, note: "catalog jobs already submitted" };
  }
  const chunks: typeof catalog.items[] = [];
  for (let i = 0; i < catalog.items.length; i += 100) {
    chunks.push(catalog.items.slice(i, i + 100));
  }
  let createdJobs = 0;
  for (const chunk of chunks) {
    const res = await klaviyoApi("POST", "/api/catalog-item-bulk-create-jobs", {
      data: {
        type: "catalog-item-bulk-create-job",
        attributes: {
          items: {
            data: chunk.map((item) => ({
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
            })),
          },
        },
      },
    });
    if (!res.ok) {
      console.error("[catalog]", res.error);
      return { skipped: false, count: existing.length, error: res.error, jobs: await catalogJobSnapshot() };
    }
    createdJobs += 1;
  }
  const after = await waitForCatalogJobs();
  const count = (await collect<{ id?: string }>("/api/catalog-items?page[size]=100")).length;
  return { skipped: false, count, createdJobs, jobs: after };
}

function delayAction(
  id: string,
  next: string,
  value: number,
  unit: "hours" | "days",
) {
  return {
    temporary_id: id,
    type: "time-delay",
    links: { next },
    data: { unit, value, secondary_value: 0, timezone: "profile" },
  };
}

function targetDateAction(id: string, next: string) {
  return {
    temporary_id: id,
    type: "target-date",
    links: { next },
    data: { timezone: "profile", target_time: "09:00:00" },
  };
}

function emailAction(
  id: string,
  next: string | null,
  name: string,
  subject: string,
  templateId: string,
) {
  return {
    temporary_id: id,
    type: "send-email",
    links: { next },
    data: {
      status: "draft",
      message: {
        from_email: FROM_EMAIL,
        from_label: BRAND_NAME,
        reply_to_email: FROM_EMAIL,
        subject_line: subject,
        preview_text: "",
        template_id: templateId,
        smart_sending_enabled: true,
        transactional: false,
        add_tracking_params: true,
        name,
      },
    },
  };
}

async function ensureFlow(
  name: string,
  definition: Record<string, unknown>,
  existing: Named[],
) {
  const found = existing.find((row) => row.attributes?.name === name);
  if (found?.id) return { name, id: found.id, created: false };
  let created = await klaviyoApi<{ data?: { id?: string } }>("POST", "/api/flows", {
    data: { type: "flow", attributes: { name, definition } },
  });
  if (!created.ok && /throttled/i.test(created.error || "")) {
    await sleep(1500);
    created = await klaviyoApi<{ data?: { id?: string } }>("POST", "/api/flows", {
      data: { type: "flow", attributes: { name, definition } },
    });
  }
  if (!created.ok) return { name, id: null, created: false, error: created.error };
  return { name, id: created.data?.data?.id || null, created: true };
}

function noMetricSinceStart(metricId: string) {
  return {
    condition_groups: [
      {
        conditions: [
          {
            type: "profile-metric",
            metric_id: metricId,
            measurement: "count",
            measurement_filter: { type: "numeric", operator: "equals", value: 0 },
            timeframe_filter: { type: "date", operator: "flow-start" },
          },
        ],
      },
    ],
  };
}

async function ensureSegment(name: string, definition: Record<string, unknown>) {
  const segments = await collect<Named>("/api/segments?page[size]=10");
  const found = segments.find((row) => row.attributes?.name === name);
  if (found?.id) return { name, id: found.id, created: false };
  const created = await klaviyoApi<{ data?: { id?: string } }>("POST", "/api/segments", {
    data: { type: "segment", attributes: { name, definition } },
  });
  if (!created.ok) return { name, id: null, created: false, error: created.error };
  return { name, id: created.data?.data?.id || null, created: true };
}

function dateTrigger(property: string, daysBefore: number) {
  return {
    type: "date",
    date_field_type: "profile-property",
    date_profile_property: property,
    timedelta_unit_before_date: "days",
    timedelta_value_before_date: daysBefore,
    recurrence_frequency: "never",
    timezone: "profile",
    trigger_time: "09:00:00",
  };
}

async function createFlows(templates: Record<string, string>, metrics: Map<string, string>) {
  const checkoutId = metrics.get("Started Checkout") || null;
  const placedId = metrics.get("Placed Order") || null;
  const listId = await resolveMarketingListId();
  const existingFlows = await collect<Named>("/api/flows");
  const results: Array<Record<string, unknown>> = [];

  if (listId && templates["FH Welcome D0"]) {
    results.push(
      await ensureFlow("FH Welcome", {
        triggers: [{ type: "list", id: listId }],
        profile_filter: null,
        entry_action_id: "w0",
        actions: [
          emailAction("w0", "wd1", "Welcome D0", "You're on the Filter Hero list", templates["FH Welcome D0"]),
          delayAction("wd1", "w1", 1, "days"),
          emailAction("w1", "wd3", "Welcome D1", "How to read your filter size", templates["FH Welcome D1"]),
          delayAction("wd3", "w3", 2, "days"),
          emailAction("w3", null, "Welcome D3", "A pack that lasts the year", templates["FH Welcome D3"]),
        ],
      }, existingFlows),
    );
  } else {
    results.push({ name: "FH Welcome", skipped: true, reason: "missing list or welcome template" });
  }

  if (checkoutId && templates["FH Abandon 1h"]) {
    results.push(
      await ensureFlow("FH Abandoned checkout", {
        triggers: [{ type: "metric", id: checkoutId }],
        profile_filter: placedId ? noMetricSinceStart(placedId) : null,
        entry_action_id: "ad1",
        actions: [
          delayAction("ad1", "a1", 1, "hours"),
          emailAction("a1", "ad2", "Abandon 1h", "Your filters are still in the cart", templates["FH Abandon 1h"]),
          delayAction("ad2", "a2", 23, "hours"),
          emailAction("a2", null, "Abandon 24h", "Your Filter Hero cart is waiting", templates["FH Abandon 24h"]),
        ],
      }, existingFlows),
    );
  } else {
    results.push({ name: "FH Abandoned checkout", skipped: true, reason: "Started Checkout metric not ready" });
  }

  if (placedId && templates["FH Post install"]) {
    results.push(
      await ensureFlow("FH Post-purchase nurture", {
        triggers: [{ type: "metric", id: placedId }],
        profile_filter: null,
        entry_action_id: "pd1",
        actions: [
          delayAction("pd1", "p1", 2, "days"),
          emailAction("p1", "pd2", "Install", "Seat the filter so air actually moves", templates["FH Post install"]),
          delayAction("pd2", "p2", 8, "days"),
          emailAction("p2", null, "Review", "How did the filters fit?", templates["FH Post review"]),
        ],
      }, existingFlows),
    );
  } else {
    results.push({ name: "FH Post-purchase nurture", skipped: true, reason: "Placed Order metric not ready" });
  }

  const replenish = [
    { name: "FH Replenish T-7", days: 7, template: "FH Replenish T-7", subject: "Filters are due in a week", wait: "td7", action: "r7" },
    { name: "FH Replenish T-2", days: 2, template: "FH Replenish T-2", subject: "Two days until filter swap", wait: "td2", action: "r2" },
    { name: "FH Replenish due", days: 0, template: "FH Replenish due", subject: "Today is filter-change day", wait: "tdd", action: "rd" },
  ] as const;
  for (const row of replenish) {
    if (!templates[row.template]) continue;
    results.push(
      await ensureFlow(
        row.name,
        {
          // Date trigger only. Clock saves write clock_next_change_date, so they
          // cannot enter these flows (FH-131 / FH-178). Do not also trigger on
          // Signed Up Reminder.
          triggers: [dateTrigger("next_change_date", row.days)],
          profile_filter: null,
          entry_action_id: row.wait,
          actions: [
            targetDateAction(row.wait, row.action),
            emailAction(row.action, null, row.name, row.subject, templates[row.template]),
          ],
        },
        existingFlows,
      ),
    );
  }

  if (placedId && templates["FH Winback D0"]) {
    const segment = await ensureSegment("FH Lapsed 120", {
      condition_groups: [
        {
          conditions: [
            {
              type: "profile-metric",
              metric_id: placedId,
              measurement: "count",
              measurement_filter: { type: "numeric", operator: "greater-than", value: 0 },
              timeframe_filter: { type: "date", operator: "alltime" },
            },
            {
              type: "profile-metric",
              metric_id: placedId,
              measurement: "count",
              measurement_filter: { type: "numeric", operator: "equals", value: 0 },
              timeframe_filter: { type: "date", operator: "in-the-last", unit: "day", quantity: 120 },
            },
            {
              type: "profile-marketing-consent",
              consent: {
                channel: "email",
                can_receive_marketing: true,
                consent_status: { subscription: "subscribed" },
              },
            },
          ],
        },
      ],
    });
    results.push(segment);
    if (segment.id) {
      results.push(
        await ensureFlow("FH Win-back", {
          triggers: [{ type: "segment", id: segment.id }],
          profile_filter: null,
          entry_action_id: "wb0",
          actions: [
            emailAction("wb0", "wbd", "Winback D0", "Still the same filter size?", templates["FH Winback D0"]),
            delayAction("wbd", "wb14", 14, "days"),
            emailAction("wb14", null, "Winback D14", "Last restock note from Filter Hero", templates["FH Winback D14"]),
          ],
        }, existingFlows),
      );
    } else {
      results.push({ name: "FH Win-back", skipped: true, reason: segment.error || "segment missing" });
    }
  }

  return results;
}

async function sendingDomainRequest(method: string, path: string, body?: unknown) {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY?.trim();
  if (!key) return { ok: false, status: 0, data: null as unknown, error: "no key" };
  const res = await fetch(`https://a.klaviyo.com${path}`, {
    method,
    headers: {
      Authorization: `Klaviyo-API-Key ${key}`,
      accept: "application/vnd.api+json",
      revision: "2026-07-15.pre",
      ...(body ? { "content-type": "application/vnd.api+json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const err = parsed as { errors?: Array<{ detail?: string; title?: string }> } | null;
    return {
      ok: false,
      status: res.status,
      data: null,
      error: err?.errors?.map((row) => row.detail || row.title).filter(Boolean).join("; ") || text.slice(0, 240),
    };
  }
  return { ok: true, status: res.status, data: parsed, error: undefined };
}

type SendingDomainRow = {
  id?: string;
  attributes?: {
    domain?: string;
    status?: string;
    purpose?: string;
    dns_records?: unknown;
  };
};

function domainSummary(row: SendingDomainRow) {
  return {
    domain: row.attributes?.domain,
    status: row.attributes?.status,
    purpose: row.attributes?.purpose,
    dns: row.attributes?.dns_records,
  };
}

async function verifyAndActivateDomain(id: string) {
  const verify = await sendingDomainRequest("POST", "/api/sending-domain-verification-jobs", {
    data: {
      type: "sending-domain-verification-job",
      relationships: {
        "sending-domain": { data: { type: "sending-domain", id } },
      },
    },
  });
  const verifyAttrs = (
    verify.data as {
      data?: {
        attributes?: {
          verification_state?: string;
          dns_records?: unknown;
          error_code?: string;
        };
      };
    } | null
  )?.data?.attributes;
  if (!verify.ok || verifyAttrs?.verification_state !== "verified") {
    return {
      verified: false,
      verification: verify.ok
        ? verifyAttrs
        : { error: verify.error },
    };
  }
  const activate = await sendingDomainRequest("POST", "/api/sending-domain-activation-jobs", {
    data: {
      type: "sending-domain-activation-job",
      relationships: {
        "sending-domain": { data: { type: "sending-domain", id } },
      },
    },
  });
  return {
    verified: true,
    activated: activate.ok,
    activationError: activate.error || null,
    verification: verifyAttrs,
  };
}

async function ensureSendingDomain() {
  const domainFields =
    "/api/sending-domains?fields[sending-domain]=domain,status,purpose,dns_records,configuration";
  const listed = await sendingDomainRequest("GET", domainFields);
  if (!listed.ok) return { error: listed.error };
  const rows = ((listed.data as { data?: SendingDomainRow[] }).data || []);
  for (const row of rows) {
    if (row.attributes?.domain === RESEND_SEND_DOMAIN && row.id) {
      await sendingDomainRequest("DELETE", `/api/sending-domains/${row.id}`);
    }
  }
  const afterDelete = await sendingDomainRequest("GET", domainFields);
  const remaining = ((afterDelete.data as { data?: SendingDomainRow[] } | null)?.data || []).filter(
    (row) => row.attributes?.domain !== RESEND_SEND_DOMAIN,
  );
  let target = remaining.find((row) => row.attributes?.domain === KLAVIYO_SEND_DOMAIN);
  let created = false;
  if (!target) {
    const createdRes = await sendingDomainRequest("POST", "/api/sending-domains", {
      data: {
        type: "sending-domain",
        attributes: {
          domain: KLAVIYO_SEND_DOMAIN,
          configuration: "static",
          purpose: "marketing",
        },
      },
    });
    if (!createdRes.ok) {
      return { domains: remaining.map(domainSummary), created: false, error: createdRes.error };
    }
    created = true;
    const createdRow = (createdRes.data as { data?: SendingDomainRow }).data;
    if (createdRow) target = createdRow;
  }
  const verify = target?.id ? await verifyAndActivateDomain(target.id) : { verified: false };
  const refreshed = await sendingDomainRequest("GET", domainFields);
  const latest = ((refreshed.data as { data?: SendingDomainRow[] } | null)?.data || []).filter(
    (row) => row.attributes?.domain !== RESEND_SEND_DOMAIN,
  );
  return {
    created,
    ...verify,
    domains: latest.map(domainSummary),
  };
}

const LIVE_FLOW_IDS = [
  { name: "FH Welcome", id: "UMtCJP" },
  { name: "FH Abandoned checkout", id: "SN8epW" },
  { name: "FH Post-purchase nurture", id: "WVmMG9" },
  { name: "FH Replenish T-7", id: "WPU3gW" },
  { name: "FH Replenish T-2", id: "RZ2b2J" },
  { name: "FH Replenish due", id: "TaqZUA" },
  { name: "FH Win-back", id: "UkEkSf" },
];

const METRIC_MAPPINGS = [
  { mapping: "revenue", metric: "Placed Order" },
  { mapping: "ordered_product", metric: "Ordered Product" },
  { mapping: "started_checkout", metric: "Started Checkout" },
  { mapping: "added_to_cart", metric: "Added to Cart" },
  { mapping: "viewed_product", metric: "Viewed Product" },
  { mapping: "refunded_sales", metric: "Refunded Payment" },
] as const;

async function ensureMappedMetrics(metrics: Map<string, string>) {
  const out: Array<{
    mapping: string;
    metric: string;
    metricId: string | null;
    ok: boolean;
    error?: string;
  }> = [];
  for (const row of METRIC_MAPPINGS) {
    const metricId = metrics.get(row.metric) || null;
    if (!metricId) {
      out.push({ mapping: row.mapping, metric: row.metric, metricId, ok: false, error: "metric missing" });
      continue;
    }
    const result = await klaviyoApi("PATCH", `/api/mapped-metrics/${row.mapping}`, {
      data: {
        type: "mapped-metric",
        id: row.mapping,
        relationships: {
          metric: { data: { type: "metric", id: metricId } },
        },
      },
    });
    out.push({
      mapping: row.mapping,
      metric: row.metric,
      metricId,
      ok: result.ok,
      error: result.error,
    });
    await sleep(1100);
  }
  return out;
}

async function goLiveFlows(domainActive: boolean) {
  if (!domainActive) {
    return LIVE_FLOW_IDS.map((row) => ({ ...row, live: false, reason: "sending domain not active" }));
  }
  const out: Array<{ name: string; id: string; live: boolean; status?: string; error?: string }> = [];
  for (const row of LIVE_FLOW_IDS) {
    const result = await klaviyoApi<{ data?: { attributes?: { status?: string } } }>(
      "PATCH",
      `/api/flows/${row.id}`,
      {
        data: {
          type: "flow",
          id: row.id,
          attributes: { status: "live" },
        },
      },
    );
    out.push({
      name: row.name,
      id: row.id,
      live: result.ok && result.data?.data?.attributes?.status === "live",
      status: result.data?.data?.attributes?.status,
      error: result.error,
    });
    await sleep(350);
  }
  return out;
}

async function main() {
  if (!isKlaviyoEnabled()) {
    console.error("Set KLAVIYO_PRIVATE_API_KEY in .env");
    process.exit(1);
  }

  const account = await getKlaviyoAccount();
  const listId = await resolveMarketingListId();
  const subscribe = await subscribeMarketingEmail(TEST_EMAIL, "account-setup");
  const seeds = await seedMetrics();
  const templates = await ensureTemplates();
  const catalog = await syncCatalog();
  const metrics = await waitForMetrics(SEED_METRICS.map((row) => row.metric));
  const flows = await createFlows(templates, metrics);
  const domains = await ensureSendingDomain();
  const domainActive = Boolean(
    (domains as { domains?: Array<{ domain?: string; status?: string }> }).domains?.some(
      (row) => row.domain === KLAVIYO_SEND_DOMAIN && row.status === "active",
    ),
  );
  const liveFlows = await goLiveFlows(domainActive);
  const mappedMetrics = await ensureMappedMetrics(metrics);

  const report = {
    account: account.organization || account.accountId,
    publicKey: account.publicKey,
    listId,
    fromEmail: FROM_EMAIL,
    subscribeOk: subscribe.ok,
    subscribeError: subscribe.error || null,
    seeded: seeds,
    templates: Object.keys(templates),
    catalog,
    flows,
    liveFlows,
    mappedMetrics,
    metricsPresent: SEED_METRICS.map((row) => ({
      name: row.metric,
      present: metrics.has(row.metric),
      id: metrics.get(row.metric) || null,
    })),
    sendingDomains: domains,
    note: "Do not add an order-confirmation or quote-receipt flow. Resend and Stripe already send those.",
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

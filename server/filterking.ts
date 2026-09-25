const DEFAULT_BASE = "https://filterking.com";

export type FilterKingParentModel = {
  parent_model?: string;
  size?: string;
  actual_size?: string;
  merv?: string;
  thickness?: string;
  unit_price?: number | string;
  sku_items?: FilterKingParentModel[];
};

function apiBase(): string {
  return (process.env.FILTERKING_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
}

export function filterKingConfigured(): boolean {
  return Boolean(
    process.env.FILTERKING_CLIENT_ID?.trim() && process.env.FILTERKING_CLIENT_SECRET?.trim(),
  );
}

async function token(): Promise<string> {
  const id = process.env.FILTERKING_CLIENT_ID?.trim();
  const secret = process.env.FILTERKING_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new Error("FILTERKING_CLIENT_ID / FILTERKING_CLIENT_SECRET are not set");
  }
  const payload = {
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  };
  // Docs use JSON. Some OAuth stacks still want form. Try JSON first.
  const attempts: Array<{ headers: Record<string, string>; body: string }> = [
    {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(payload).toString(),
    },
  ];
  let lastError = "no access_token";
  for (const attempt of attempts) {
    const res = await fetch(`${apiBase()}/oauth/token`, {
      method: "POST",
      headers: attempt.headers,
      body: attempt.body,
    });
    const json = (await res.json()) as { access_token?: string; error?: string };
    if (res.ok && json.access_token) return json.access_token;
    lastError = `${res.status}: ${json.error || "no access_token"}`;
  }
  throw new Error(`Filter King token failed (${lastError})`);
}

/** Full stock catalog. Caller must ignore unit_price for shopper tickets. */
export async function fetchAllParentModels(): Promise<FilterKingParentModel[]> {
  const access = await token();
  const res = await fetch(`${apiBase()}/api/v1/get-all-parent-models`, {
    headers: { Authorization: `Bearer ${access}`, Accept: "application/json" },
  });
  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    sku_items?: FilterKingParentModel[];
    data?: FilterKingParentModel[] | { sku_items?: FilterKingParentModel[] };
  };
  if (!res.ok || json.success === false) {
    throw new Error(`Filter King catalog failed (${res.status}${json.message ? `: ${json.message}` : ""})`);
  }
  if (Array.isArray(json.sku_items)) return json.sku_items;
  if (Array.isArray(json.data)) return json.data;
  if (json.data && Array.isArray(json.data.sku_items)) return json.data.sku_items;
  return [];
}

export type FilterKingShipTo = {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type FilterKingQuoteItem = {
  parent_model: string;
  quantity: number;
};

export type FilterKingOrderQuote = {
  estimatedShippingCost: number;
  currency: string;
};

/**
 * Dropship freight quote. Shopper tax stays on Stripe Tax — ignore FK tax here.
 * Requires Idempotency-Key (FH API).
 */
export async function quoteOrderShipping(input: {
  shipTo: FilterKingShipTo;
  items: FilterKingQuoteItem[];
  idempotencyKey: string;
}): Promise<FilterKingOrderQuote> {
  if (input.items.length === 0) {
    throw new Error("Shipping quote needs at least one item");
  }
  const access = await token();
  const res = await fetch(`${apiBase()}/api/v1/order/quotes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      shipping_method: "fedex",
      ship_to: {
        address_line_1: input.shipTo.address_line_1,
        ...(input.shipTo.address_line_2
          ? { address_line_2: input.shipTo.address_line_2 }
          : {}),
        city: input.shipTo.city,
        state: input.shipTo.state,
        zip: input.shipTo.zip,
        country: input.shipTo.country,
      },
      items: input.items.map((item) => ({
        parent_model: item.parent_model,
        quantity: item.quantity,
      })),
    }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      total?: {
        estimated_shipping_cost?: number | string;
        currency?: string;
      };
    };
  };
  if (!res.ok || json.success === false) {
    throw new Error(
      `Filter King shipping quote failed (${res.status}${json.message ? `: ${json.message}` : ""})`,
    );
  }
  const raw = json.data?.total?.estimated_shipping_cost;
  const cost = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error("Filter King shipping quote returned no freight amount");
  }
  return {
    estimatedShippingCost: cost,
    currency: (json.data?.total?.currency || "USD").toUpperCase(),
  };
}

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
    sku_items?: FilterKingParentModel[];
    data?: FilterKingParentModel[];
  };
  if (!res.ok) {
    throw new Error(`Filter King catalog failed (${res.status})`);
  }
  if (Array.isArray(json.sku_items)) return json.sku_items;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

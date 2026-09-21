import { authedFetch } from "@/lib/admin-api";
import { safeNextPath } from "@shared/account-paths";

export { safeNextPath };

/**
 * Browser half of the customer account.
 *
 * Auth uses the same Supabase client as /admin so one inbox has one session.
 * Every read and write goes through /api/account with the access token.
 * The browser never queries Postgres.
 */

export async function accountFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return authedFetch<T>("/api/account", path, init);
}

export type AccountProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
};

export type SavedFilter = {
  id: string;
  product_id: number;
  size: string;
  merv: number;
  name: string | null;
  notes: string | null;
  source: "manual" | "purchase";
};

export type AccountOrder = {
  id: string;
  paidAt: string;
  amountTotal: number | null;
  currency: string | null;
  items: Array<{
    productId: number;
    quantity: number;
    size: string | null;
    name: string | null;
  }>;
};

export type AccountSnapshot = {
  profile: AccountProfile;
  filters: SavedFilter[];
  orders: AccountOrder[];
};

export const getAccount = () => accountFetch<AccountSnapshot>("/");

export const patchAccount = (patch: Record<string, unknown>) =>
  accountFetch<AccountProfile>("/", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const saveAccountFilter = (productId: number, notes?: string) =>
  accountFetch<SavedFilter>("/filters", {
    method: "POST",
    body: JSON.stringify({ productId, notes }),
  });

export const removeAccountFilter = (id: string) =>
  accountFetch<{ id: string }>(`/filters/${id}`, { method: "DELETE" });

export function formatOrderTotal(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  return (amount / 100).toLocaleString("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  });
}

import fs from "node:fs";
import { CC_API_BASE } from "../../shared/constant-contact-oauth";
import {
  constantContactMayRecord,
  type ContactIntent,
} from "../../shared/email-channels";
import { dataFile } from "../data-store";
import { constantContactOAuth } from "./oauth";

export const FILTER_HERO_LIST_NAME = "Filter Hero";

const LIST_FILE = "constant-contact-list.json";

export type OptInInput = {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  marketingConsent?: boolean;
  intent?: ContactIntent;
};

export type OptInResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; action: "created" | "updated"; listId: string }
  | { ok: false; skipped: false; error: string };

type ListRecord = { listId: string; name: string };

type TokenResult = { ok: true; data: { accessToken: string } } | { ok: false; message?: string };

type Deps = {
  accessToken?: () => Promise<TokenResult>;
  fetch?: typeof fetch;
  readList?: () => ListRecord | null;
  saveList?: (record: ListRecord) => void;
  listIdFromEnv?: () => string;
};

function readListFile(): ListRecord | null {
  const file = dataFile(LIST_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as ListRecord;
    if (!parsed?.listId) return null;
    return { listId: parsed.listId, name: parsed.name || FILTER_HERO_LIST_NAME };
  } catch {
    return null;
  }
}

function writeListFile(record: ListRecord): void {
  fs.writeFileSync(dataFile(LIST_FILE), JSON.stringify(record, null, 2), "utf-8");
}

export function splitPersonName(name: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  if (parts.length === 1) return { firstName: parts[0].slice(0, 50) };
  return {
    firstName: parts[0].slice(0, 50),
    lastName: parts.slice(1).join(" ").slice(0, 50),
  };
}

export function phoneForConstantContact(phone: string | null | undefined): string | undefined {
  const digits = (phone || "").replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length < 10 || local.length > 15) return undefined;
  return local;
}

function listsFromBody(body: unknown): Array<{ listId: string; name: string }> {
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { lists?: unknown }).lists)
      ? (body as { lists: unknown[] }).lists
      : [];
  const lists: Array<{ listId: string; name: string }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as { list_id?: string; name?: string };
    if (!record.list_id) continue;
    lists.push({ listId: record.list_id, name: record.name || "" });
  }
  return lists;
}

async function ensureList(
  accessToken: string,
  doFetch: typeof fetch,
  deps: Deps,
): Promise<string | null> {
  const fromEnv = (deps.listIdFromEnv ?? (() => (process.env.CONSTANT_CONTACT_LIST_ID || "").trim()))();
  if (fromEnv) return fromEnv;
  const readList = deps.readList ?? readListFile;
  const saveList = deps.saveList ?? writeListFile;
  const cached = readList();
  if (cached?.listId) return cached.listId;

  const listed = await doFetch(`${CC_API_BASE}/contact_lists?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (listed.ok) {
    const body = await listed.json().catch(() => ({}));
    const match = listsFromBody(body).find(
      (list) => list.name.trim().toLowerCase() === FILTER_HERO_LIST_NAME.toLowerCase(),
    );
    if (match) {
      saveList(match);
      return match.listId;
    }
  }

  const created = await doFetch(`${CC_API_BASE}/contact_lists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FILTER_HERO_LIST_NAME,
      description: "Shoppers who asked for tips and restock offers.",
    }),
  });
  if (!created.ok) return null;
  const body = (await created.json().catch(() => ({}))) as { list_id?: string; name?: string };
  if (!body.list_id) return null;
  const record = { listId: body.list_id, name: body.name || FILTER_HERO_LIST_NAME };
  saveList(record);
  return record.listId;
}

export async function recordConstantContactOptIn(
  input: OptInInput,
  deps: Deps = {},
): Promise<OptInResult> {
  if (!constantContactMayRecord(input)) return { ok: true, skipped: true };
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 50) {
    return { ok: false, skipped: false, error: "email" };
  }

  const accessToken = deps.accessToken ?? (() => constantContactOAuth.accessToken());
  const doFetch = deps.fetch ?? fetch;
  const token = await accessToken();
  if (!token.ok) return { ok: false, skipped: false, error: "not_connected" };

  const listId = await ensureList(token.data.accessToken, doFetch, deps);
  if (!listId) return { ok: false, skipped: false, error: "list" };

  const name = splitPersonName(input.name);
  const phone = phoneForConstantContact(input.phone);
  const res = await doFetch(`${CC_API_BASE}/contacts/sign_up_form`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.data.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      list_memberships: [listId],
      ...name,
      ...(phone ? { phone_number: phone } : {}),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { action?: string };
  if (res.status !== 200 && res.status !== 201) {
    return { ok: false, skipped: false, error: "signup" };
  }
  return {
    ok: true,
    skipped: false,
    action: body.action === "updated" ? "updated" : "created",
    listId,
  };
}

export async function constantContactLiveCheck(deps: Deps = {}): Promise<{
  ok: boolean;
  organizationName: string | null;
  contactEmail: string | null;
  listId: string | null;
  listName: string | null;
}> {
  const accessToken = deps.accessToken ?? (() => constantContactOAuth.accessToken());
  const doFetch = deps.fetch ?? fetch;
  const token = await accessToken();
  if (!token.ok) {
    return { ok: false, organizationName: null, contactEmail: null, listId: null, listName: null };
  }
  const accountRes = await doFetch(`${CC_API_BASE}/account/summary`, {
    headers: { Authorization: `Bearer ${token.data.accessToken}`, Accept: "application/json" },
  });
  const account = accountRes.ok
    ? ((await accountRes.json().catch(() => ({}))) as {
        organization_name?: string;
        contact_email?: string;
      })
    : {};
  const listId = await ensureList(token.data.accessToken, doFetch, deps);
  return {
    ok: accountRes.ok && Boolean(listId),
    organizationName: account.organization_name?.trim() || null,
    contactEmail: account.contact_email?.trim() || null,
    listId,
    listName: listId ? FILTER_HERO_LIST_NAME : null,
  };
}

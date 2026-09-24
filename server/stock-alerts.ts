/**
 * Back-in-stock waitlist. Persisted under DATA_DIR.
 * Notified via Resend when Filter King stock sync brings the SKU back.
 */
import fs from "node:fs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { stockKey } from "../shared/stock";
import { dataFile } from "./data-store";
import { sendBackInStockAlert } from "./mailer";
import { isHoneypotTripped, shouldEnforceTurnstile, verifyTurnstile } from "./security";

const ALERTS_FILE = "stock-alerts.json";

export const stockAlertSchema = z.object({
  email: z.string().trim().email().max(200),
  size: z.string().trim().min(3).max(40),
  merv: z.union([z.literal(8), z.literal(11), z.literal(13)]),
  isCarbon: z.boolean().optional().default(false),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  turnstileToken: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type StockAlertPayload = z.infer<typeof stockAlertSchema>;

export type StoredStockAlert = {
  id: string;
  email: string;
  size: string;
  merv: 8 | 11 | 13;
  isCarbon: boolean;
  key: string;
  createdAt: string;
  notifiedAt?: string;
};

function alertsPath(): string {
  return dataFile(ALERTS_FILE);
}

function ensureFile() {
  const file = alertsPath();
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf-8");
}

function readAll(): StoredStockAlert[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(alertsPath(), "utf-8")) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredStockAlert[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: StoredStockAlert[]) {
  ensureFile();
  fs.writeFileSync(alertsPath(), `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function submitStockAlert(raw: unknown, ip?: string) {
  const parsed = stockAlertSchema.parse(raw);
  if (isHoneypotTripped(parsed.website)) {
    return { ok: true as const, id: "ignored" };
  }
  if (shouldEnforceTurnstile("stock-alert", parsed.turnstileToken || undefined)) {
    const human = await verifyTurnstile(parsed.turnstileToken || undefined, ip);
    if (!human.ok) {
      throw new Error("Could not verify that form.");
    }
  }

  const email = normalizeEmail(parsed.email);
  const size = parsed.size.toLowerCase().replace(/\s/g, "");
  const isCarbon = Boolean(parsed.isCarbon);
  const key = stockKey(size, parsed.merv, isCarbon);
  const rows = readAll();
  const existing = rows.find(
    (row) =>
      !row.notifiedAt &&
      normalizeEmail(row.email) === email &&
      row.key === key,
  );
  if (existing) {
    return { ok: true as const, id: existing.id };
  }

  const row: StoredStockAlert = {
    id: nanoid(),
    email,
    size,
    merv: parsed.merv,
    isCarbon,
    key,
    createdAt: new Date().toISOString(),
  };
  rows.push(row);
  writeAll(rows);
  return { ok: true as const, id: row.id };
}

/**
 * After a stock sync, email waiters whose keys are now active.
 * Fail-soft: one bad send does not block the rest.
 */
export async function notifyStockAlertsForKeys(
  activeKeys: Set<string> | string[],
): Promise<{ notified: number }> {
  const active = activeKeys instanceof Set ? activeKeys : new Set(activeKeys);
  const rows = readAll();
  let notified = 0;
  let changed = false;

  for (const row of rows) {
    if (row.notifiedAt) continue;
    if (!active.has(row.key)) continue;
    try {
      const result = await sendBackInStockAlert(row);
      if (result.sent) {
        row.notifiedAt = new Date().toISOString();
        notified += 1;
        changed = true;
      }
    } catch (err) {
      console.warn("[stock-alerts] notify failed", row.id, err);
    }
  }

  if (changed) writeAll(rows);
  return { notified };
}

export function pendingStockAlertCount(): number {
  return readAll().filter((row) => !row.notifiedAt).length;
}

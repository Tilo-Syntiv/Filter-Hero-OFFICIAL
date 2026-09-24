import fs from "node:fs";
import { dataFile } from "../data-store";
import { OAUTH_STATE_TTL_MS } from "../../shared/constant-contact-oauth";

export type StoredConstantContactTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  scope: string | null;
  organizationName: string | null;
  contactEmail: string | null;
  connectedAt: string;
  connectedBy: string | null;
  needsReauthorize: boolean;
  lastError: string | null;
};

export type PendingOauth = {
  state: string;
  createdAt: number;
  staffEmail: string | null;
};

const TOKEN_FILE = "constant-contact-oauth.json";
const PENDING_FILE = "constant-contact-oauth-pending.json";

type PendingFile = { states: PendingOauth[] };

export type TokenStore = {
  load(): StoredConstantContactTokens | null;
  save(tokens: StoredConstantContactTokens): void;
  clear(): void;
};

export type PendingStore = {
  put(record: PendingOauth): void;
  take(state: string, now: number): PendingOauth | null;
};

function readJson<T>(name: string, fallback: T): T {
  const file = dataFile(name);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch (err) {
    console.error(`[constant-contact] ${name} is invalid`, err);
    return fallback;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.writeFileSync(dataFile(name), JSON.stringify(value, null, 2), "utf-8");
}

export function fileTokenStore(): TokenStore {
  return {
    load() {
      const raw = readJson<StoredConstantContactTokens | null>(TOKEN_FILE, null);
      if (!raw || typeof raw.accessToken !== "string" || typeof raw.refreshToken !== "string") {
        return null;
      }
      return raw;
    },
    save(tokens) {
      writeJson(TOKEN_FILE, tokens);
    },
    clear() {
      const file = dataFile(TOKEN_FILE);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    },
  };
}

export function filePendingStore(): PendingStore {
  return {
    put(record) {
      const current = readJson<PendingFile>(PENDING_FILE, { states: [] });
      const states = current.states.filter((entry) => entry.state !== record.state);
      states.push(record);
      writeJson(PENDING_FILE, { states });
    },
    take(state, now) {
      const current = readJson<PendingFile>(PENDING_FILE, { states: [] });
      const next: PendingOauth[] = [];
      let found: PendingOauth | null = null;
      for (const entry of current.states) {
        if (now - entry.createdAt > OAUTH_STATE_TTL_MS) continue;
        if (!found && entry.state === state) {
          found = entry;
          continue;
        }
        next.push(entry);
      }
      writeJson(PENDING_FILE, { states: next });
      return found;
    },
  };
}

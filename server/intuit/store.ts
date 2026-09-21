import fs from "node:fs";
import { dataFile } from "../data-store";
import { OAUTH_STATE_TTL_MS } from "../../shared/intuit-oauth";

export type StoredIntuitTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  realmId: string | null;
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

const TOKEN_FILE = "intuit-oauth.json";
const PENDING_FILE = "intuit-oauth-pending.json";

type PendingFile = { states: PendingOauth[] };

export type TokenStore = {
  load(): StoredIntuitTokens | null;
  save(tokens: StoredIntuitTokens): void;
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
    console.error(`[intuit] ${name} is invalid`, err);
    return fallback;
  }
}

function writeJson(name: string, value: unknown): void {
  fs.writeFileSync(dataFile(name), JSON.stringify(value, null, 2), "utf-8");
}

export function fileTokenStore(): TokenStore {
  return {
    load() {
      const raw = readJson<StoredIntuitTokens | null>(TOKEN_FILE, null);
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

export function memoryTokenStore(initial: StoredIntuitTokens | null = null): TokenStore {
  let tokens = initial;
  return {
    load: () => tokens,
    save: (next) => {
      tokens = next;
    },
    clear: () => {
      tokens = null;
    },
  };
}

export function memoryPendingStore(initial: PendingOauth[] = []): PendingStore {
  const states = [...initial];
  return {
    put(record) {
      const index = states.findIndex((entry) => entry.state === record.state);
      if (index >= 0) states.splice(index, 1);
      states.push(record);
    },
    take(state, now) {
      const index = states.findIndex(
        (entry) => entry.state === state && now - entry.createdAt <= OAUTH_STATE_TTL_MS,
      );
      if (index < 0) return null;
      const [found] = states.splice(index, 1);
      return found ?? null;
    },
  };
}

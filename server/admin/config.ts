import fs from "node:fs";
import { dataFile } from "../data-store";
import {
  DEFAULT_SITE_CONFIG,
  siteConfigPatchSchema,
  siteConfigSchema,
  toPublicSiteConfig,
  type PublicSiteConfig,
  type SiteConfig,
} from "../../shared/site-config";

const CONFIG_NAME = "site-config.json";

function configPath(): string {
  return dataFile(CONFIG_NAME);
}

export function loadSiteConfig(): SiteConfig {
  const file = configPath();
  if (!fs.existsSync(file)) return DEFAULT_SITE_CONFIG;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as unknown;
    return siteConfigSchema.parse(parsed);
  } catch (err) {
    console.error("[admin] site-config.json is invalid — using defaults", err);
    return DEFAULT_SITE_CONFIG;
  }
}

export function publicSiteConfig(): PublicSiteConfig {
  return toPublicSiteConfig(loadSiteConfig());
}

export function isCheckoutPaused(): boolean {
  return loadSiteConfig().maintenanceMode;
}

export function saveSiteConfig(
  patch: unknown,
  actorEmail: string,
): SiteConfig {
  const current = loadSiteConfig();
  const raw =
    patch && typeof patch === "object" && !Array.isArray(patch)
      ? { ...(patch as Record<string, unknown>) }
      : {};
  for (const key of ["tagline", "heroKicker", "heroHeadline", "heroLede", "maintenanceMessage"]) {
    if (typeof raw[key] === "string" && !String(raw[key]).trim()) delete raw[key];
  }
  const updates = siteConfigPatchSchema.parse(raw);
  const next = siteConfigSchema.parse({
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
}

import { z } from "zod";
import { BRAND_TAGLINE } from "./const";
import { getFilterSize, popularSizeSlugs } from "./products";

/**
 * Runtime site copy and operational flags.
 *
 * Stored in server/data/site-config.json and edited from /admin/content.
 * Empty FAQ / featured-size lists mean "use the code defaults" so a fresh
 * install does not snapshot the whole catalog into JSON.
 */

export const DEFAULT_HERO_KICKER = "Exact-fit HVAC filters";
export const DEFAULT_HERO_HEADLINE =
  "The first line of defense for your indoor air.";
export const DEFAULT_HERO_LEDE =
  "Filter Hero's Filter King filters are exact-fit replacements for Trane, Carrier, Rheem, and 30+ major HVAC brands. Measure Width, Length, and Depth — then shop MERV 8, 11, or 13.";
export const DEFAULT_MAINTENANCE_MESSAGE =
  "We're updating the shop. Checkout will be back shortly.";

export const faqActionSchema = z.object({
  href: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(80),
});

export const faqItemSchema = z.object({
  question: z.string().trim().min(1).max(240),
  answer: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(40).optional(),
  action: faqActionSchema.optional(),
});

export const siteConfigSchema = z.object({
  announcementEnabled: z.boolean().default(false),
  announcement: z.string().trim().max(280).default(""),
  tagline: z.string().trim().min(1).max(160).default(BRAND_TAGLINE),
  heroKicker: z.string().trim().min(1).max(80).default(DEFAULT_HERO_KICKER),
  heroHeadline: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .default(DEFAULT_HERO_HEADLINE),
  heroLede: z.string().trim().min(1).max(800).default(DEFAULT_HERO_LEDE),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z
    .string()
    .trim()
    .max(280)
    .default(DEFAULT_MAINTENANCE_MESSAGE),
  featuredSizeSlugs: z.array(z.string().trim().max(40)).max(24).default([]),
  faqs: z.array(faqItemSchema).max(40).default([]),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const siteConfigPatchSchema = siteConfigSchema.partial();

export type SiteFaqItem = z.infer<typeof faqItemSchema>;
export type SiteConfig = z.infer<typeof siteConfigSchema>;

export const DEFAULT_SITE_CONFIG: SiteConfig = siteConfigSchema.parse({});

/** Fields the storefront is allowed to see. No staff emails, no secrets. */
export type PublicSiteConfig = {
  announcementEnabled: boolean;
  announcement: string;
  tagline: string;
  heroKicker: string;
  heroHeadline: string;
  heroLede: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  featuredSizeSlugs: string[];
  faqs: SiteFaqItem[];
};

export function toPublicSiteConfig(config: SiteConfig): PublicSiteConfig {
  return {
    announcementEnabled: config.announcementEnabled,
    announcement: config.announcement,
    tagline: config.tagline,
    heroKicker: config.heroKicker,
    heroHeadline: config.heroHeadline,
    heroLede: config.heroLede,
    maintenanceMode: config.maintenanceMode,
    maintenanceMessage: config.maintenanceMessage,
    featuredSizeSlugs: config.featuredSizeSlugs,
    faqs: config.faqs,
  };
}

export function featuredSizesFromConfig(
  slugs: string[] | undefined,
  limit = 16,
): string[] {
  const valid = (slugs ?? [])
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => Boolean(getFilterSize(slug)));
  if (valid.length === 0) return popularSizeSlugs(limit);
  return valid.slice(0, limit);
}

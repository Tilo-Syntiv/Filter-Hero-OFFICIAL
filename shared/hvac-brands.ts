import HVAC_BRANDS from "./hvac-brands.json";
import { getArchivedFilterSize, getFilterSize, type FilterSize } from "./products";

export type BrandCodeMap = {
  code: string;
  size: string;
};

export type HvacBrand = {
  slug: string;
  name: string;
  featured: boolean;
  sizes: string[];
  models: BrandCodeMap[];
  oemParts: BrandCodeMap[];
};

export const HVAC_BRAND_LIST = HVAC_BRANDS as HvacBrand[];

const BY_SLUG = new Map(HVAC_BRAND_LIST.map((b) => [b.slug, b]));

export function getHvacBrand(slug: string): HvacBrand | undefined {
  return BY_SLUG.get(slug.toLowerCase());
}

export function brandLogoSrc(slug: string): string {
  return `/brands/${slug}.svg`;
}

export function featuredHvacBrands(): HvacBrand[] {
  return HVAC_BRAND_LIST.filter((b) => b.featured);
}

export type BrandFamily = {
  id: string;
  label: string;
  brands: HvacBrand[];
};

const BRAND_FAMILIES: Array<{ id: string; label: string; slugs: string[] }> = [
  {
    id: "trane",
    label: "Trane",
    slugs: ["trane", "american-standard"],
  },
  {
    id: "carrier",
    label: "Carrier",
    slugs: ["carrier", "bryant", "payne", "day-and-night", "bdp", "totaline"],
  },
  {
    id: "rheem",
    label: "Rheem",
    slugs: ["rheem", "ruud"],
  },
  {
    id: "goodman",
    label: "Goodman",
    slugs: ["goodman", "amana"],
  },
  {
    id: "lennox",
    label: "Lennox",
    slugs: ["lennox", "armstrong"],
  },
  {
    id: "york",
    label: "York",
    slugs: ["york", "coleman"],
  },
  {
    id: "nordyne",
    label: "Nordyne",
    slugs: [
      "nordyne",
      "frigidaire",
      "gibson",
      "kelvinator",
      "maytag",
      "philco",
      "tappan",
      "westinghouse",
    ],
  },
  {
    id: "honeywell",
    label: "Honeywell",
    slugs: ["honeywell"],
  },
  {
    id: "trion",
    label: "Trion",
    slugs: ["air-bear"],
  },
  {
    id: "emerson",
    label: "Emerson",
    slugs: ["emerson", "white-rodgers"],
  },
  {
    id: "generalaire",
    label: "GeneralAire",
    slugs: ["general-aire", "general"],
  },
  {
    id: "media",
    label: "Filter media",
    slugs: [
      "accumulair",
      "air-kontrol",
      "comfort-plus",
      "electro-air",
      "five-seasons",
      "purolator",
      "skuttle",
      "ultravation",
    ],
  },
];

function brandsForSlugs(slugs: string[]): HvacBrand[] {
  return slugs
    .map((slug) => getHvacBrand(slug))
    .filter((brand): brand is HvacBrand => Boolean(brand));
}

export function featuredBrandFamilies(): BrandFamily[] {
  const featured = new Set(featuredHvacBrands().map((b) => b.slug));
  return BRAND_FAMILIES.map((family) => ({
    id: family.id,
    label: family.label,
    brands: brandsForSlugs(family.slugs).filter((brand) => featured.has(brand.slug)),
  })).filter((family) => family.brands.length > 0);
}

export function allBrandFamilies(): BrandFamily[] {
  const used = new Set<string>();
  const groups = BRAND_FAMILIES.map((family) => {
    const brands = brandsForSlugs(family.slugs);
    for (const brand of brands) used.add(brand.slug);
    return { id: family.id, label: family.label, brands };
  }).filter((family) => family.brands.length > 0);

  const leftover = HVAC_BRAND_LIST.filter((brand) => !used.has(brand.slug));
  if (leftover.length) {
    groups.push({ id: "other", label: "Other brands", brands: leftover });
  }
  return groups;
}

export function otherBrandFamilies(): BrandFamily[] {
  const featured = new Set(featuredHvacBrands().map((b) => b.slug));
  return allBrandFamilies()
    .map((family) => ({
      ...family,
      brands: family.brands.filter((brand) => !featured.has(brand.slug)),
    }))
    .filter((family) => family.brands.length > 0);
}

export function catalogSizeForSlug(slug: string): FilterSize | undefined {
  return getArchivedFilterSize(slug);
}

export function brandsForSize(sizeSlug: string): HvacBrand[] {
  const key = sizeSlug.toLowerCase();
  return HVAC_BRAND_LIST.filter((b) => b.sizes.some((s) => s.toLowerCase() === key));
}

export function searchBrandCodes(query: string): Array<{
  brand: HvacBrand;
  kind: "model" | "oem";
  code: string;
  size: string;
}> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: Array<{
    brand: HvacBrand;
    kind: "model" | "oem";
    code: string;
    size: string;
  }> = [];
  for (const brand of HVAC_BRAND_LIST) {
    for (const m of brand.models) {
      if (m.code.toLowerCase().includes(q)) {
        hits.push({ brand, kind: "model", code: m.code, size: m.size });
      }
    }
    for (const p of brand.oemParts) {
      if (p.code.toLowerCase().includes(q)) {
        hits.push({ brand, kind: "oem", code: p.code, size: p.size });
      }
    }
  }
  return hits.slice(0, 24);
}

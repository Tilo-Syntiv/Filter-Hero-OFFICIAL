import fs from "fs";
import path from "path";

const dir = ".firecrawl";
const files = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith("filterking.com-brands-") && f.endsWith(".md"));

function extractSection(md, heading) {
  const start = md.indexOf(`### ${heading}`);
  if (start < 0) return "";
  const rest = md.slice(start + heading.length + 4);
  const next = rest.search(/\n### |\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

function parseLinks(section) {
  const items = [];
  const re =
    /\[([^\]]+)\]\(https:\/\/filterking\.com\/air-filter-sizes\/[^/]+\/([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(section))) {
    const size = m[2].replace(/[a-z]+$/i, "");
    items.push({ code: m[1], size });
  }
  return items;
}

const NAMES = {
  "air-bear": "Trion Air Bear",
  amana: "Amana",
  "american-standard": "American Standard",
  armstrong: "Armstrong",
  bdp: "BDP",
  bryant: "Bryant",
  carrier: "Carrier",
  "day-and-night": "Day and Night",
  goodman: "Goodman",
  honeywell: "Honeywell",
  lennox: "Lennox",
  payne: "Payne",
  trane: "Trane",
  york: "York",
  rheem: "Rheem",
  ruud: "Ruud",
  coleman: "Coleman",
  accumulair: "Accumulair",
  "air-kontrol": "Air Kontrol",
  "comfort-plus": "Comfort Plus",
  "electro-air": "Electro-Air",
  emerson: "Emerson",
  "five-seasons": "Five Seasons",
  frigidaire: "Frigidaire",
  general: "General",
  "general-aire": "GeneralAire",
  gibson: "Gibson",
  kelvinator: "Kelvinator",
  maytag: "Maytag",
  nordyne: "Nordyne",
  philco: "Philco",
  purolator: "Purolator",
  skuttle: "Skuttle",
  tappan: "Tappan",
  totaline: "Totaline",
  ultravation: "Ultravation",
  westinghouse: "Westinghouse",
  "white-rodgers": "White-Rodgers",
};

const FEATURED = [
  "air-bear",
  "amana",
  "american-standard",
  "armstrong",
  "bdp",
  "bryant",
  "carrier",
  "day-and-night",
  "goodman",
  "honeywell",
  "lennox",
  "payne",
  "trane",
];

const EXTRA = [
  "accumulair",
  "air-kontrol",
  "coleman",
  "comfort-plus",
  "electro-air",
  "emerson",
  "five-seasons",
  "frigidaire",
  "general",
  "general-aire",
  "gibson",
  "kelvinator",
  "maytag",
  "nordyne",
  "philco",
  "purolator",
  "rheem",
  "ruud",
  "skuttle",
  "tappan",
  "totaline",
  "ultravation",
  "westinghouse",
  "white-rodgers",
  "york",
];

const bySlug = {};
for (const f of files) {
  const slug = f.replace("filterking.com-brands-", "").replace(".md", "");
  const md = fs.readFileSync(path.join(dir, f), "utf8");
  const sizes = [...new Set(parseLinks(extractSection(md, "Shop by Size")).map((i) => i.size))];
  bySlug[slug] = {
    slug,
    name: NAMES[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    featured: FEATURED.includes(slug),
    sizes,
    models: parseLinks(extractSection(md, "Shop by HVAC model number")),
    oemParts: parseLinks(extractSection(md, "Shop by OEM part number")),
  };
}

const brands = [];
for (const slug of [...FEATURED, ...EXTRA]) {
  if (bySlug[slug]) brands.push(bySlug[slug]);
  else {
    brands.push({
      slug,
      name: NAMES[slug] || slug,
      featured: FEATURED.includes(slug),
      sizes: [],
      models: [],
      oemParts: [],
    });
  }
}

fs.writeFileSync("shared/hvac-brands.json", JSON.stringify(brands, null, 2));
console.log(
  brands
    .map((b) => `${b.slug}: ${b.sizes.length} sizes, ${b.models.length} models, ${b.oemParts.length} oem`)
    .join("\n"),
);

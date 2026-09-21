import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "client", "public", "brands");
fs.mkdirSync(OUT, { recursive: true });

const BRANDS = [
  "accumulair",
  "air-bear",
  "air-kontrol",
  "amana",
  "american-standard",
  "armstrong",
  "bdp",
  "bryant",
  "carrier",
  "coleman",
  "comfort-plus",
  "day-and-night",
  "electro-air",
  "emerson",
  "five-seasons",
  "frigidaire",
  "general",
  "general-aire",
  "gibson",
  "goodman",
  "honeywell",
  "kelvinator",
  "lennox",
  "maytag",
  "nordyne",
  "payne",
  "philco",
  "purolator",
  "rheem",
  "ruud",
  "skuttle",
  "tappan",
  "totaline",
  "trane",
  "ultravation",
  "westinghouse",
  "white-rodgers",
  "york",
];

const WAYBACK_TS = {
  "air-bear": "20260603034042",
  amana: "20260410210402",
  "american-standard": "20260603034040",
  armstrong: "20260426190530",
  bdp: "20260603034042",
  bryant: "20260329064132",
  carrier: "20231027082021",
  "day-and-night": "20260426190629",
  frigidaire: "20231102033844",
  goodman: "20260603034032",
  honeywell: "20241007202750",
  lennox: "20230903234540",
  payne: "20260603034042",
  philco: "20260329020433",
  rheem: "20210822052253",
  ruud: "20210822160210",
  trane: "20260603034042",
};

function isSvg(buf) {
  const text = buf.slice(0, 500).toString("utf8").replace(/^\uFEFF/, "").trim();
  return text.startsWith("<svg") || text.includes("<svg");
}

function decode(buf) {
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    try {
      return zlib.gunzipSync(buf);
    } catch {
      return buf;
    }
  }
  return buf;
}

function existingOk(slug) {
  const p = path.join(OUT, `${slug}.svg`);
  if (!fs.existsSync(p)) return false;
  const buf = decode(fs.readFileSync(p));
  if (!isSvg(buf) || buf.length < 80) return false;
  fs.writeFileSync(p, buf);
  return true;
}

async function get(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        accept: "image/svg+xml,*/*;q=0.8",
      },
      redirect: "follow",
    });
    const buf = decode(Buffer.from(await res.arrayBuffer()));
    return { ok: res.ok, status: res.status, buf };
  } finally {
    clearTimeout(t);
  }
}

const report = [];
for (const slug of BRANDS) {
  if (existingOk(slug)) {
    console.log("kept", slug);
    report.push({ slug, status: "kept" });
    continue;
  }
  const ts = WAYBACK_TS[slug];
  if (!ts) {
    console.log("skip-wayback", slug);
    report.push({ slug, status: "missing" });
    continue;
  }
  const url = `https://web.archive.org/web/${ts}id_/https://filterking.com/img/wh-brands-svg/${slug}.svg`;
  try {
    const r = await get(url);
    if (r.ok && isSvg(r.buf) && r.buf.length > 80) {
      fs.writeFileSync(path.join(OUT, `${slug}.svg`), r.buf);
      console.log("got", slug, r.buf.length);
      report.push({ slug, status: "downloaded" });
      continue;
    }
    console.log("bad", slug, r.status, r.buf.length);
  } catch (e) {
    console.log("err", slug, e.name || e.message);
  }
  report.push({ slug, status: "missing" });
}

const missing = report.filter((r) => r.status === "missing").map((r) => r.slug);
console.log("\nHAVE", report.filter((r) => r.status !== "missing").length);
console.log("MISSING", missing.length, missing.join(", "));

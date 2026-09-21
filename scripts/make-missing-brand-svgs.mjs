import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "public", "brands");

function wordmark({
  slug,
  label,
  color,
  italic = false,
  weight = 800,
  size = 28,
  tracking = 0,
  width = 220,
  height = 56,
  y = 38,
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}">
  <text x="${width / 2}" y="${y}" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" font-style="${italic ? "italic" : "normal"}" letter-spacing="${tracking}" fill="${color}">${label}</text>
</svg>
`;
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
}

const files = {
  york: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 64" width="220" height="64" role="img" aria-label="York">
  <circle cx="32" cy="32" r="28" fill="#003DA5"/>
  <path d="M22 18h8.4l9.2 16.6V18H48v28h-8.4L30.4 29.2V46H22V18z" fill="#fff"/>
  <text x="72" y="42" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="32" font-weight="800" letter-spacing="3" fill="#003DA5">YORK</text>
</svg>
`,
  emerson: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 56" width="260" height="56" role="img" aria-label="Emerson">
  <path d="M8 44 L28 10 L48 44 L40.5 44 L28 22.5 L15.5 44 Z" fill="#00B5E2"/>
  <path d="M20 44 L28 30 L36 44 Z" fill="#00313C"/>
  <text x="62" y="38" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#00313C">Emerson</text>
</svg>
`,
  "white-rodgers": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 56" width="280" height="56" role="img" aria-label="White-Rodgers">
  <rect x="2" y="10" width="36" height="36" rx="4" fill="#003366"/>
  <text x="20" y="35" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="14" fill="#fff">WR</text>
  <text x="50" y="38" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#003366">White-Rodgers</text>
</svg>
`,
  nordyne: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 56" width="240" height="56" role="img" aria-label="Nordyne">
  <text x="120" y="38" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="2" fill="#004B87">NORDYNE</text>
</svg>
`,
  gibson: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 56" width="200" height="56" role="img" aria-label="Gibson">
  <text x="100" y="40" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="34" font-weight="700" font-style="italic" fill="#C8102E">Gibson</text>
</svg>
`,
  tappan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 56" width="200" height="56" role="img" aria-label="Tappan">
  <text x="100" y="40" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="34" font-weight="700" font-style="italic" fill="#B31B1B">Tappan</text>
</svg>
`,
  accumulair: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 64" width="260" height="64" role="img" aria-label="Accumulair">
  <circle cx="28" cy="32" r="22" fill="none" stroke="#2E7D32" stroke-width="4"/>
  <path d="M16 32c8-12 16-12 24 0" fill="none" stroke="#2E7D32" stroke-width="3" stroke-linecap="round"/>
  <path d="M16 32c8 12 16 12 24 0" fill="none" stroke="#81C784" stroke-width="3" stroke-linecap="round"/>
  <text x="60" y="40" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#2E7D32">Accumulair</text>
</svg>
`,
  "comfort-plus": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" width="240" height="64" role="img" aria-label="Comfort Plus">
  <text x="120" y="28" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#1F3A5F">Comfort</text>
  <text x="120" y="52" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#E31837">PLUS</text>
</svg>
`,
  "electro-air": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 56" width="240" height="56" role="img" aria-label="Electro-Air">
  <text x="120" y="38" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#D52B1E">ELECTRO-AIR</text>
</svg>
`,
  "five-seasons": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 68" width="240" height="68" role="img" aria-label="Five Seasons">
  <circle cx="88" cy="14" r="6" fill="#F4B400"/>
  <circle cx="104" cy="14" r="6" fill="#0F9D58"/>
  <circle cx="120" cy="14" r="6" fill="#DB4437"/>
  <circle cx="136" cy="14" r="6" fill="#4285F4"/>
  <circle cx="152" cy="14" r="6" fill="#AB47BC"/>
  <text x="120" y="48" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#1F3A5F">Five Seasons</text>
</svg>
`,
  skuttle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 56" width="220" height="56" role="img" aria-label="Skuttle">
  <text x="110" y="38" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="1" fill="#1A365D">SKUTTLE</text>
</svg>
`,
  ultravation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 64" width="260" height="64" role="img" aria-label="Ultravation">
  <g transform="translate(8,8)" fill="#00A9CE">
    <circle cx="20" cy="20" r="8"/>
    <g stroke="#00A9CE" stroke-width="3" stroke-linecap="round">
      <line x1="20" y1="2" x2="20" y2="8"/>
      <line x1="20" y1="32" x2="20" y2="38"/>
      <line x1="2" y1="20" x2="8" y2="20"/>
      <line x1="32" y1="20" x2="38" y2="20"/>
      <line x1="7" y1="7" x2="11" y2="11"/>
      <line x1="29" y1="29" x2="33" y2="33"/>
      <line x1="33" y1="7" x2="29" y2="11"/>
      <line x1="11" y1="29" x2="7" y2="33"/>
    </g>
  </g>
  <text x="56" y="40" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#005F73">Ultravation</text>
</svg>
`,
  general: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 56" width="240" height="56" role="img" aria-label="General">
  <text x="120" y="38" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="1" fill="#C8102E">GENERAL</text>
</svg>
`,
};

for (const [slug, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  console.log("wrote", slug);
}
console.log("done", Object.keys(files).length);

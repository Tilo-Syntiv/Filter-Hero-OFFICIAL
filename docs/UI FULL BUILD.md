# UI FULL BUILD

**Filter Hero storefront — how the UI is installed, wired, connected, and kept.**

This is not a generic React/shadcn tutorial. It is the exact architecture of this repository: the files that mount the shop, the order they boot, the contracts they honor, and the issues that settled those contracts. If a later change fights this document, the live code plus [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md) win — then this file must be updated.

**Canonical issue log:** every `FH-XXX` with full **Do / Do NOT / Files / Verify** lives in `docs/ISSUES-AND-FIXES.md`. This guide includes the complete index, every open item in full, and the UI laws those tickets produced. Next unused id is **FH-307**. There is no FH-036 (never assigned). FH-001–FH-030 were never logged.

---

## 1. What “the UI” is in this project

The shop is a **Vite + React 19 SPA** living in `client/`, served in development by Vite on **port 3000**, talking to an Express API on **port 3001**. In production a single Node process serves the built SPA from `dist/public` and injects per-route SEO into `index.html` before the browser hydrates.

There is **no Next.js, no Remix, no shared `<Layout>` route wrapper, and no `tailwind.config.js`**. Pages compose themselves. Design tokens live in CSS. Catalog, prices, brand lists, and SEO copy live in `shared/` so the client and the server cannot drift.

Three UIs share one React tree:

| Surface | Routes | Chrome |
|---|---|---|
| Shop | `/`, `/sizes`, `/filters`, `/brands`, `/custom-air-filters`, `/how-often-to-change-air-filter`, checkout | `SiteHeader` + `CartDrawer` mounted **by each page** |
| Shopper account | `/login`, `/account` | Same shop chrome |
| Staff console | `/admin/*` | `AdminShell` (navy sidebar). No shop header. `noindex`. |

The staff gate in `AdminShell` is convenience. Real authorization is `requireStaff` on `/api/admin`, `/api/crm`, and `/api/intuit`.

---

## 2. Install — how this UI actually boots

### 2.1 Dependencies (the kit that is live)

From `package.json`. Do not add a second UI framework.

**Runtime UI**

- `react` / `react-dom` 19
- `wouter` 3 (client router; patched — see §7)
- `framer-motion` (hero copy, finder entrance)
- `lucide-react` (icons)
- `embla-carousel-react` + `embla-carousel-autoplay`
- `vaul` (cart drawer)
- Radix: accordion, checkbox, dialog, label, select, slot, switch, tooltip
- `class-variance-authority` + `clsx` + `tailwind-merge` (`cn()`)
- `sonner` (toasts; must portal to `document.body` — FH-215)
- `react-hook-form` + `@hookform/resolvers` + `zod` (contact / quote)
- `@supabase/supabase-js` (auth only; browser never queries Postgres)
- `recharts` (staff analytics)

**Build**

- `vite` 7, `@vitejs/plugin-react`, `@tailwindcss/vite` 4
- `tailwindcss` 4, `tw-animate-css`, `tailwindcss-animate`
- `typescript` 5.6, `tsx`, `esbuild` (server bundle)

**Not installed (FH-238 retired them):** the rest of the shadcn/ui kit (dropdown-menu, tabs, table, popover, scroll-area, command, calendar, …). Do not `npx shadcn add` a primitive “just in case.” Add one only when a live screen uses it.

### 2.2 Commands

```bash
pnpm install          # lockfile is pnpm. packageManager is pinned.
pnpm dev              # concurrently: API 3001 + Vite 3000
pnpm dev:client       # Vite only --host
pnpm dev:server       # tsx watch server/index.ts
pnpm build            # vite build → dist/public  AND  esbuild server → dist/index.js
pnpm start            # NODE_ENV=production node dist/index.js  (one process, PORT or 3000)
pnpm check            # tsc --noEmit
pnpm smoke            # Playwright storefront invariants
pnpm browse           # click-ui.ts — headed/headless shopper path with screenshots
```

Local shoppers use **http://127.0.0.1:3000**. The API is never opened in the browser except for crawler HTML injection in development (`server/index.ts` can still serve `client/index.html` with SEO tags on port 3001).

### 2.3 Environment the UI reads

Vite `envDir` is the **repo root**, not `client/`. Only `VITE_*` keys are baked into the browser bundle. Changing a `VITE_` var requires a rebuild (dev: restart Vite; prod: rebuild the image).

Declared in `client/src/vite-env.d.ts`:

| Variable | Used by |
|---|---|
| `VITE_SITE_URL` | Canonical URLs, JSON-LD, Klaviyo product links (`useSeo.getSiteUrl`) |
| `VITE_FULL_CATALOG` | Must stay `false` with `FULL_CATALOG` (Model Pricing allowlist — FH-217 / FH-303) |
| `VITE_SUPABASE_URL` | Shopper + staff auth client |
| `VITE_SUPABASE_ANON_KEY` | Same |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Not required for Checkout redirect (session URL comes from `/api/checkout`) |
| `VITE_TURNSTILE_SITE_KEY` | Contact / quote bot gate. Empty = widget does not render (smoke can still post locally) |

`ThemeProvider` is **light and not switchable**. Do not wire a dark-mode toggle.

---

## 3. Directory map

```
FILTER HERO/
├── client/
│   ├── index.html              # SPA shell, fonts, default SEO, #root
│   ├── public/                 # static files copied as-is to dist/public
│   │   ├── logo.png, favicon.png
│   │   ├── fonts/plus-jakarta-extrabold-italic.woff2
│   │   ├── hero/               # character-sheet, pack-merv8/11/13, showcase-carbon
│   │   ├── products/           # pack shots + galleries (packShotSrc)
│   │   ├── life/               # LIFE photo set
│   │   └── brands/*.svg        # OEM marks
│   └── src/
│       ├── main.tsx            # createRoot(#root) + index.css
│       ├── App.tsx             # providers + wouter Switch
│       ├── index.css           # Tailwind v4 @theme + every shop class
│       ├── const.ts            # re-exports @shared/const
│       ├── components/         # shop sections (not pages)
│       ├── components/ui/      # the 15 live shadcn primitives
│       ├── contexts/           # Theme, Account, SiteConfig, Cart
│       ├── hooks/              # SEO, hash scroll, carousel, scroll-to-top
│       ├── lib/                # klaviyo, admin-api, merv-pref, cadence, cn()
│       ├── data/life-photos.ts
│       └── pages/              # route components (each owns chrome)
├── shared/                     # catalog, SEO, site-config, brands, pricing
├── server/index.ts             # API + production static + SEO HTML inject
├── vite.config.ts
├── components.json             # shadcn new-york aliases
├── tsconfig.json               # paths @/* and @shared/*
├── patches/wouter@3.7.1.patch
└── docs/ISSUES-AND-FIXES.md
```

Aliases (must match in **both** `tsconfig.json` and `vite.config.ts`):

```
@/*        → client/src/*
@shared/*  → shared/*
```

FH-042: do **not** put `baseUrl` back in tsconfig. Paths stand alone.

---

## 4. The boot sequence (exact order)

### 4.1 HTML

`client/index.html` is the only HTML document. It:

1. Sets viewport, theme-color `#203868`, robots, Open Graph, Twitter, canonical `https://filterhero.net/`.
2. Loads Plus Jakarta Sans (700/800 italic) and Manrope from Google Fonts.
3. Self-hosts ExtraBold Italic as `FilterHero` via CSS `@font-face` (FH-065) so the lockup does not depend on Google italic succeeding.
4. Leaves an empty `<div id="root">`.
5. Loads `/src/main.tsx` as a module (Vite transforms this).

### 4.2 JavaScript entry

`client/src/main.tsx`:

```ts
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

No StrictMode wrapper. No router at this layer.

### 4.3 App tree (this is the wiring)

```
ErrorBoundary
  ThemeProvider defaultTheme="light"          // not switchable
    AccountProvider                           // Supabase session for /login and header
      SiteConfigProvider                      // GET /api/site-config (falls back to defaults)
        CartProvider                          // localStorage fpf-cart-v1
          TooltipProvider
            Toaster                           // sonner → document.body portal
            Router                            // wouter Switch
```

On mount, `App` also `bootKlaviyo()`: fetch `/api/klaviyo/config`, patch HTTP→HTTPS Klaviyo client URLs on localhost (FH-231), inject `klaviyo.js`.

**Order is load-bearing.** Account must wrap Cart so checkout can prefill email. SiteConfig must wrap pages so FAQs / featured sizes / maintenance mode exist. TooltipProvider must wrap anything using Radix Tooltip (header icon labels — FH-174). Toaster must live outside the cart drawer and portal to `body` so Radix `aria-hidden` / inert on `#root` cannot swallow checkout errors (FH-215).

### 4.4 Production vs development serve

`vite.config.ts`:

- `root` = `client/`
- `build.outDir` = `dist/public`
- `server.port` = 3000, `proxy["/api"]` → `http://127.0.0.1:3001`
- Same proxy for `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/ai.txt`
- Dev CSP headers from `shared/security-headers.ts`

`pnpm build` then `pnpm start`:

- Express listens on `PORT` or 3000
- `express.static(dist/public, { index: false })`
- `GET *` reads `index.html`, runs `injectSeoIntoHtml(html, resolveDocumentSeo(req.path, siteUrl))`, sends HTML
- React then hydrates and `useSeo` replaces the same tags for SPA navigations

Development Express (3001) does the same inject against `client/index.html` so `pnpm smoke` hitting the API origin still sees size-page JSON-LD (FH-198).

---

## 5. CSS architecture — how the look is installed

There is **one stylesheet**: `client/src/index.css` (~4,000 lines). Tailwind v4 is compiled by `@tailwindcss/vite`. There is no PostCSS config beyond what the Vite plugin owns.

### 5.1 Token install

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-navy: var(--navy);
  --color-ice: var(--ice);
  --color-hero: var(--hero);
  /* …maps shadcn CSS variables onto Tailwind color-* */
}

:root {
  --navy: #203868;
  --ice: #8eb0d8;
  --mesh: #3a66a3;
  --hero: #7f2328;
  --deep: #141e30;
  --primary: #203868;
  --accent: #7f2328;
  --background: #f6f7f9;
  --radius: 0.75rem;
}
```

Brand law: navy `#203868` and burgundy `#7F2328` are the same colors used on Stripe, Klaviyo, and Resend. Do not invent a third navy for the hero (FH-145, FH-220, FH-221, FH-270). Hero stage and `.brand-band` share:

```
linear-gradient(90deg, #1a3058 0%, #2a4d82 48%, #3a66a3 100%)
```

Type:

- Body: **Manrope**
- Headings: **Plus Jakarta Sans**
- Lockup FILTER / HERO: ExtraBold Italic (`FilterHero` face + `.hero-lockup`)

### 5.2 Layout classes (use these; do not invent parallel systems)

| Class | Meaning |
|---|---|
| `.container` | Centered column, safe-area padding, `max-width: 1200px` at `lg` |
| `.sheet-section` | White shop sheet (`#ffffff`) |
| `.brand-band` | Full-bleed navy stage (brands, some FAQs, CTA) |
| `.surface-panel` | Frosted white card |
| `.section-label` | Small kicker above an `h2` |
| `.hero-shop-btn` | Crimson slanted CTA — header FIND, hero Shop, size-page add |
| `.site-header` / `.site-footer` | Navy chrome |
| `.home-lock` / `.home-first` | First viewport = header + hero + trust marquee |
| `.pdp-*` | Size-page buy panel |
| `.merv-tile` / `--merv-wash` | Rating color wash (FH-248 / FH-249) |

`html` uses `scroll-padding-top: calc(var(--site-header-h, 6.5rem) + 0.5rem)`. `SiteHeader` publishes `--site-header-h` via `ResizeObserver`. Hash jumps must use that offset (FH-207). **Do not** lock `html`/`body`/`#root` to `100dvh` + `overflow: hidden` (FH-084).

### 5.3 shadcn install

`components.json`:

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

Live primitives in `client/src/components/ui/`:

`accordion` `button` `carousel` `chart` `checkbox` `dialog` `drawer` `input` `label` `select` `sheet` `sonner` `switch` `textarea` `tooltip`

`Button` is CVA + Radix `Slot` (`asChild`). Default radius is `rounded-xl`. Shop CTAs that must match the hero add `className="hero-shop-btn"`.

`cn()` in `client/src/lib/utils.ts` is `twMerge(clsx(...))`. Always compose classes through `cn` so later Tailwind utilities win.

---

## 6. Router — wouter, not React Router

`App.tsx` `Switch` is first-match. Param routes use a thin wrapper because wouter does not pass params as React Router would.

| Path | Page |
|---|---|
| `/` | `Home` |
| `/sizes` | `AllSizesPage` |
| `/sizes/:size` | `SizeDetailPage` (`sizeSlug`) |
| `/filters/:thickness` | `ThicknessHubPage` (strips `-inch`) |
| `/brands` | `AllBrandsPage` |
| `/brands/:slug` | `BrandDetailPage` |
| `/custom-air-filters` | `CustomAirFiltersPage` |
| `/how-often-to-change-air-filter` | `FilterChangeGuidePage` |
| `/checkout/success` | `CheckoutSuccess` (noindex; verifies `session_id`) |
| `/checkout/cancel` | `CheckoutCancel` (noindex; cart kept) |
| `/login` `/account` | Shopper auth |
| `/admin` … | Staff console |
| `/404` and unmatched | `NotFound` |

`useScrollToTop` runs inside `Router`: wouter keeps the previous scroll offset, so every path change (without a hash) snaps to `0`. Hash landings are owned by `useHashScroll`.

**Patch:** `patches/wouter@3.7.1.patch` records every `Route path` onto `window.__WOUTER_ROUTES__`. Do not remove the patch; `pnpm.patchedDependencies` applies it on install.

**Navigation helpers**

- Shop a size or quote if off-catalog: `shopOrQuotePath(size)` in `client/src/lib/filter-size.ts`
- Header / finder always append `?merv=` from `getPreferredMerv()` when the destination is a size PDP
- Same-page section jumps: `jumpToHashTarget(id)` (retries; `replaceState` does not fire `hashchange` — FH-119 / FH-087)

---

## 7. The page composition law (the most important install rule)

**There is no `<Layout>`.** Every shop page that a customer sees must itself render:

```tsx
<>
  <SiteHeader />
  <main>…</main>
  <CartDrawer onRequestQuote={…} />
</>
```

Home is the only page that wraps those in `.home-lock` / `.home-first` and inlines the footer. Inner pages typically use `PageHero` + a footer or rely on header nav to leave.

`onRequestQuote` is not optional in spirit:

- **Home:** stash is unnecessary; `scrollToContact` fills the on-page `ContactForm`
- **Everywhere else:** `window.location.href = "/#contact"` **or** `stashQuoteHandoff` then go to `/custom-air-filters` / `/#contact`

Quote handoff (`client/src/lib/quote-handoff.ts`) writes `sessionStorage` keys `fh-quote-size`, `fh-quote-message`, `fh-quote-cart`. The destination **takes** (read + delete) on mount. FH-117: do not `take` in the cart before the destination paints. FH-127: checkout-cancel “quote instead” must not race Home’s empty form.

Checkout + 404 + admin **do not** mount `SiteHeader` / `CartDrawer`.

---

## 8. Contexts — how state is connected

### 8.1 Cart (`contexts/CartContext.tsx`)

- Storage key: `fpf-cart-v1`
- Lines are `{ productId, size, merv, price, name, qty }`
- On hydrate, `normalizeCart` drops SKUs that are missing or `inStock: false` and toasts (FH-128)
- `addItem` opens the drawer and fires Klaviyo **Added to Cart**
- Qty 1–50; unit price from `unitPriceForQty` in `@shared/products`
- Checkout: `POST /api/checkout` with `{ items: [{ productId, quantity }], email, marketingConsent }` then `window.location.href = data.url`
- Success page **must** confirm `GET /api/checkout/session?session_id=` `paid: true` before `clearCart()` (FH-121)
- Maintenance: `SiteConfig.maintenanceMode` blocks the Checkout button

**Open:** FH-302 — clicking Add to cart leaves focus on the CTA while Radix marks the page `aria-hidden`. Fix: move focus into the drawer (or blur the CTA) before the overlay hides the rest of the page. Do not remove `aria-hidden` from the overlay.

### 8.2 Site config (`contexts/SiteConfigContext.tsx`)

`GET /api/site-config` → FAQs, featured size slugs, hero kicker/lede, maintenance flag. Failure keeps `DEFAULT_SITE_CONFIG`. Home FAQs are `config.faqs.length ? config.faqs : SITE_FAQS`.

### 8.3 Account (`contexts/AccountContext.tsx`)

One Supabase browser client (`lib/admin-api.ts` `authClient()`), PKCE, `detectSessionInUrl`. Exchange `?code=` on non-`/admin` paths. Header user icon routes to `/account` or `/login`. Staff magic-link `?code=` is exchanged inside `AdminShell` (FH-208).

### 8.4 MERV preference (`lib/merv-pref.ts`)

- `sessionStorage fh-preferred-merv` — `"8" | "11" | "13" | "carbon"`
- URL `?merv=` **wins** (FH-244)
- Pack qty from Filter Clock: `fh-power-pack`
- Hero pack clicks `setPreferredMerv` then go to `/sizes/20x25x1?merv=…` if that rating is on sale, else `/custom-air-filters`

---

## 9. Shop chrome

### 9.1 Header (`components/SiteHeader.tsx`)

Navy bar, first in the tree, never hidden on Home (FH-074 / FH-086).

Publishes `--site-header-h`. Phone header must stay short (FH-206, FH-275–277). How to Measure is a **nav chip**, not inside the finder (FH-032, FH-168, FH-179). Filter Clock label is **FILTER CLOCK** and hashes `#clock` (FH-033, FH-169). Custom CTA is “Need a custom size” → `/custom-air-filters#custom-quote`, shortened to **Custom** below `2xl` (FH-034, FH-255). Account and cart icons have hover labels (FH-174). FIND uses `.hero-shop-btn` and `shopOrQuotePath` + preferred MERV (FH-087).

Desktop mega menus: Shop / Brands / Contact. Mobile: Radix `Sheet`.

Emblem is `/logo.png` running crop + title-case Filter Hero (`BrandLockup`). White is knocked out in canvas so the mascot sits on navy (FH-260 / FH-261). Do not route the header mark through a tight crop that blanks the portrait (FH-075). Do not put `/hero/nav-icon.png` back as the shopper bar mark (FH-086).

### 9.2 Cart drawer (`components/CartDrawer.tsx`)

Vaul `Drawer`. Email + `MarketingOptIn` + Checkout. Quote path stashes the cart summary. Thumbnails from `packShotSrc`. Sticky mobile add-to-cart on the size PDP must not leak onto desktop (FH-180).

### 9.3 Footer

Home only, as coded today. Shop / Support columns, `BrandLockup tone="footer"`, `BRAND_EMAIL`. Hash links to `#finder` `#clock` `#delivery` `#faq` `#contact`.

---

## 10. Homepage — first screen and the rest

`pages/Home.tsx` section order is the product:

1. `SiteHeader`
2. `.home-first` = `Hero` + `TrustMarquee` (chips visible without scroll — FH-085)
3. `#finder` `FilterFinder` (`showPopular={false}`)
4. `FamilyAirSection`
5. `#clock` `FilterPower`
6. `OverdueCostsBand` (replaced popular-sizes — FH-288 / FH-289)
7. `SizeDirectory`
8. `MervCarousel` (“What should your filter catch?”)
9. `DeliverySection` (2–3 day — FH-295; no free shipping — FH-253)
10. `#brands` `BrandFamilyGrid`
11. `TrustSection` (Why Filter Hero; second card **Built to last** + layers diagram — FH-296–299)
12. `FaqSection`
13. CTA photo band → `#contact`
14. `#contact` `ContactForm intent="support"`
15. Footer
16. `CartDrawer`

### Hero — settled state (after FH-052…FH-280)

Live `Hero.tsx` is **HTML**, not a painted banner (FH-052). No flight video (FH-216, FH-238). No Filter King “now at” lockup (FH-233).

- Sky fill: `character-sheet.png` as atmosphere
- Copy column: ice **Filter** + crimson **Hero** with mascot at sign height on the word Hero (FH-265, FH-271, FH-279, FH-280)
- H1: “The first line *of defense* for your *indoor air.*”
- Kicker/lede from site-config
- CTAs: Find your filter size → `/sizes`; Start your clock → change-guide
- Right: four pack shots (`/hero/pack-merv8.png`, `showcase-carbon.png`, `pack-merv11.png`, `pack-merv13.png`) with slanted rating tickets (FH-092). Cache-bust query `?v=fh178`
- Brand strip: Trane / Carrier / Rheem / Goodman / Lennox + “Guaranteed to fit 30+ major brands and we can customize them” (FH-114, FH-115)
- `prefers-reduced-motion` is respected wherever motion remains

Do not remount `HeroFlight` / `HeroSkyFlight`. Do not restore `hero-banner.webp`, overlapping fans, graph-paper mesh, or a hero-only locked page (FH-059 is **wontfix**; reversed by FH-084).

---

## 11. Size PDP (`pages/SizeDetail.tsx`)

The buy page. `getFilterSize(slug)` decides shop vs empty/quote.

**Must have**

- MERV chips full-column, washed with `--merv-wash` / `badgeColor` (FH-038, FH-039, FH-248, FH-250)
- Capture dots + efficiency + capacity/resistance copy (FH-040, FH-249, FH-284)
- Gallery resets to shot 0 when MERV changes (FH-245)
- Qty 1–12 via stepper, not only 1/2/4/6/12 buttons (FH-252)
- Pack shot from `packShotSrc(merv, isCarbon)` — Filter Hero branded, same photo for every qty (FH-044–049, FH-239–243)
- How to Measure guide including off-catalog empty state (FH-035)
- How to Replace (FH-283)
- Overdue-cost panel in navy, named repairs (FH-285–287)
- Sticky Add on small screens only (FH-180)
- JSON-LD via `sizeSeo` + `buildProductSchema` (FH-194)

Carbon Capture dots are black, not silver (FH-041).

---

## 12. Finder, measure, clock, brands

**FilterFinder** — Width × Length × Depth selects from `finderWidths()` / `finderLengths()` / `THICKNESSES`. Submit → `shopOrQuotePath`. Optional popular carousel.

**HowToMeasureGuide + MeasureFilterDiagram** — tape diagram on Home finder and every size page. Framer opacity must be animatable (FH-232).

**FilterPower + ClockDeck** — household inputs → cadence. Snap days to **30 / 60 / 90 / 180 only** (FH-031, **still open**). May `identifyShopper` with email; must **not** send replacement campaigns before a purchase (FH-131). MERV is MERV, not “filter size” (FH-126).

**BrandDirectory / BrandBrowse** — OEM families from `@shared/hvac-brands`. Off-catalog model search must not dump the shopper on `/sizes` (FH-140).

---

## 13. Forms, Turnstile, contact

`ContactForm` and `CustomQuoteForm` share the pattern:

- react-hook-form + zod
- honeypot field `website`
- `TurnstileField` — IntersectionObserver, mounts within ~200px of viewport so the homepage footer does not start a Cloudflare challenge on every landing (FH-247)
- `POST /api/contact` with `intent: "quote" | "support"`
- Rate limit is real: 5 / 15 min. Smoke must treat 429 as `rate_limited_contact`, not a Turnstile miss (FH-301)
- Identify to Klaviyo on submit; Resend sends the branded receipt. **Do not** add a Klaviyo quote-receipt flow.

---

## 14. SEO — two writers, one document

1. **First paint (crawlers):** `shared/seo.ts` `resolveDocumentSeo(pathname)` + `injectSeoIntoHtml` in Express.
2. **SPA navigations:** `useSeo` in the page updates `title`, description, robots, canonical, OG, Twitter, JSON-LD. It removes `#jsonld-ssr` so the client block replaces the server block. `og:type=article` must survive client nav (FH-129).

Admin pages force `noindex, nofollow` in `AdminShell`. Checkout success/cancel and 404 are noindex.

---

## 15. Tracking the UI is allowed to fire

`lib/klaviyo.ts` talks to onsite JS **and** `POST /api/identify` / `POST /api/track`. Client metrics are allowlisted server-side (`isClientMetric`).

Shopper events: Viewed Product, Viewed Size, Selected MERV, Added to Cart. Identify on email fields (cart, clock, contact).

Do not fire welcome / abandon / replenish / receipt from **Successfully Paid**. Stripe sends the payment receipt; Resend sends the branded order confirmation; Klaviyo owns marketing. See `shared/email-channels.ts`.

CSP must allow `https://*.klaviyo.com` and, in development, `http://a.klaviyo.com` (FH-209, FH-212). Local HTTP shops rewrite Klaviyo requests to HTTPS (FH-231).

---

## 16. Staff UI

`pages/admin/AdminShell.tsx` + `nav.ts`:

- Operate: Overview, Quotes, Contacts, Orders, Customers
- Catalog: Products, Content
- Insights: Analytics, Tracking
- System: Staff, Security, Settings, Maintenance

Shared chrome in `pages/admin/ui.tsx` (`AdminPanel`, `StatCard`, `AdminTable`, …). Data via `authedFetch("/api/admin" | "/api/crm" | "/api/account", …)` with the Supabase access token. `useAdminLoad` debounces search so Contacts cannot burn the rate limit (FH-214).

Settings Connect (Intuit) must not crash the error boundary (FH-225). Staff OTP toasts need the body-portal Toaster (FH-215).

---

## 17. Client ↔ server contracts the UI depends on

| Method | Path | UI caller |
|---|---|---|
| GET | `/api/site-config` | SiteConfigProvider |
| GET | `/api/klaviyo/config` | bootKlaviyo |
| POST | `/api/checkout` | CartDrawer |
| GET | `/api/checkout/session` | CheckoutSuccess |
| POST | `/api/contact` | ContactForm, CustomQuoteForm |
| POST | `/api/identify` | klaviyo.ts |
| POST | `/api/track` | klaviyo.ts |
| GET/POST | `/api/account/*` | account pages |
| GET/POST | `/api/admin/*` | staff pages |
| GET/POST | `/api/crm/*` | staff CRM |
| GET/POST | `/api/intuit/*` | Settings Connect |

Catalog truth is `@shared/products` + `shared/sellable-skus.json`. The UI does not fetch a product list for the shopper PDP; it imports the JSON module. Checkout refuses `inStock: false`. Off-catalog sizes route to the quote form (FH-043, FH-217).

---

## 18. How to add UI the Filter Hero way

### New shop page

1. Create `client/src/pages/YourPage.tsx`.
2. Mount `SiteHeader` + `CartDrawer` + `useSeo`.
3. Register a `<Route>` in `App.tsx` `Switch` **above** the catch-all.
4. If crawlers need unique title/JSON-LD, add a branch in `shared/seo.ts` `resolveDocumentSeo`.
5. Hash targets: give the section a stable `id` and `scroll-mt-28`.
6. Verify with `pnpm smoke` and `pnpm browse` if the shopper can click it.

### New section on Home

Insert it in the Home order in §10. Use `.sheet-section` or `.brand-band`. Do not steal the first viewport from header + hero + marquee.

### New shadcn primitive

Only if a live screen needs it. `npx shadcn add X` with `components.json` pointing at `client/src/index.css`. Do not restore the 38 retired files.

### New token / color

Add to `:root` and `@theme inline` so both raw CSS and `bg-navy` / `text-hero` work. Keep `#203868` / `#7F2328`.

### New photo

Put files under `client/public/…`, register in `life-photos.ts` or `packShotSrc`, cache-bust with `?v=fhXXX`. Catch cards share one aspect; layers diagrams use `object-contain` on studio gray inside `aspect-[5/4]` (FH-297–299).

---

## 19. Verify before calling UI done

```bash
pnpm check
pnpm smoke
pnpm browse          # or BROWSE_HEADED=1
```

`scripts/click-ui.ts` asserts, among other things: no “free shipping” on Home, hero MERV 11 uses `pack-merv11.png`, size-page MERV wash colors, pack shots stay official when qty changes.

If no headed browser is available, smoke + `click-ui` are the substitute. A single screenshot is not verification.

---

## 20. Issues and fixes

**Canonical full text (Do / Do NOT / Files / Verify / dates):** [ISSUES-AND-FIXES.md](ISSUES-AND-FIXES.md).

Ids: **FH-031 … FH-306** (277 tickets). Gap: **FH-036**. Prefix never reused. Next: **FH-307**.

Statuses used: `open` | `fixed` | `mitigated` | `wontfix` | `superseded`.

### 20.1 Open (full entries)

#### FH-031 — Filter Clock days must be 30 / 60 / 90 / 180 only

- **Status:** open
- **Area:** clock
- **Symptom:** Clock and calendar can show other intervals (120 / 270 / 330 bases, 7- or 15-day rounding).
- **Do NOT:** Keep those bases or that rounding.
- **Do:** Snap every day count, label, and calendar date to 30, 60, 90, or 180.
- **Files:** `client/src/lib/filter-cadence.ts`, `client/src/components/ClockDeck.tsx`, `scripts/verify-filter-clock.ts`
- **Verify:** Every MERV × thickness × household combo uses only those four days; then assert it in `verify-filter-clock.ts`.
- **Added:** 2026-08-20

#### FH-135 — Full-catalog Filtrete match still leaves pack, MERV, and thick-size gaps

- **Status:** open
- **Area:** pricing
- **Symptom:** Even matching Filtrete on compared rungs, pack, MERV, and thick-size gaps remain versus the peer set.
- **Do NOT:** Pretend the Model Pricing allowlist is a full Filtrete match.
- **Do:** Document remaining gaps; do not silently fill them with modeled ladders.
- **Files:** pricing engine / live-price JSON
- **Added:** 2026-08-29 (see canonical log for the full Do block)

#### FH-254 — Stripe Checkout still prints Free next to a $0 shipping option

- **Status:** open
- **Area:** cart
- **Symptom:** Shop copy no longer promises free shipping, but Stripe Checkout can still render “Free” beside a $0 shipping option.
- **Do NOT:** Put “free shipping” back on the shop (FH-253).
- **Do:** Fix the Checkout shipping option label in Stripe, not by lying on the PDP.
- **Files:** `server/stripe.ts` / Stripe Dashboard shipping
- **Added:** 2026-09-20

#### FH-300 — Production Klaviyo JSON feed still serves a 299-SKU mix

- **Status:** open
- **Area:** other
- **Symptom:** Local catalog.json is Model Pricing SKUs; live `https://filterhero.net/api/klaviyo/catalog.json` is still 299.
- **Do NOT:** Point Klaviyo’s custom catalog at the live JSON feed while production is on the old mix.
- **Do:** Deploy the current shop so the public feed is 293.
- **Files:** `scripts/smoke-site.ts`, `server/klaviyo.ts`
- **Added:** 2026-09-20

#### FH-302 — Add to cart leaves focus on a button Radix then marks aria-hidden

- **Status:** open
- **Area:** cart
- **Symptom:** Clicking **Add 6 to cart** on `/sizes/20x25x1` opens the cart dialog while the CTA still has focus. Chromium warns that `.pdp-checkout` is `aria-hidden` with a focused descendant.
- **Do NOT:** Remove `aria-hidden` from the dialog overlay or disable the Radix cart drawer.
- **Do:** Move focus into the cart dialog (or blur the CTA) before the rest of the page is `aria-hidden`.
- **Files:** `client/src/pages/SizeDetail.tsx`, cart drawer
- **Verify:** `/sizes/20x25x1` → Add 6 to cart → no `aria-hidden` console warning; heading `Your cart`.
- **Added:** 2026-09-20

#### FH-303 — Railway FULL_CATALOG=true conflicts with the Model Pricing shop

- **Status:** open · **Area:** catalog
- **Do NOT:** Leave Railway `VITE_FULL_CATALOG=true`. Do not `railway up` a dirty branch to “fix” the feed.
- **Do:** Set both flags `false` on FILTER-HERO, rebuild from `main`.
- **Files:** `.env.example`, [2 CATALOG.md](./2%20CATALOG.md)

#### FH-304 — GitHub autodeploy and `railway up` both own FILTER-HERO

- **Status:** open · **Area:** other
- **Do NOT:** `railway up` this branch while GitHub watches the repo. Do not attach `www` on Railway. Do not scale a second region (FH-182).
- **Do:** Pin `source.branch=main`. Production deploys from `main` only.

#### FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO

- **Status:** open · **Area:** other
- **Do NOT:** Copy local `STRIPE_SECRET_KEY` onto Railway. Do not point sandbox webhooks at `https://filterhero.net/api/stripe/webhook`. Do not connect Klaviyo to sandbox.
- **Do:** Live `sk_live_` / `pk_live_` / `VITE_STRIPE_PUBLISHABLE_KEY` on Railway; webhook secret from `pnpm setup:stripe-webhook` against that live key. Local `.env` stays sandbox.

#### FH-306 — Railway has no HTTP healthcheck

- **Status:** open · **Area:** other
- **Do NOT:** Add a second region to attach healthchecks. Do not healthcheck `/`.
- **Do:** `deploy.healthcheckPath=/api/health`, `healthcheckTimeout=30`, one replica `us-east4-eqdc4a`.

### 20.2 UI law extracted from the log (do not regress)

These are the invariants the tickets paid for. Re-opening the old layout is how the bug comes back.

**Header**

- Shopper bar stays on the first screen. Emblem is `/logo.png` + title-case Filter Hero (FH-074, FH-086).
- Nav: Shop, Brands, FILTER CLOCK, How to Measure, Contact. Measure is not inside the size finder (FH-032, FH-033).
- FIND / custom use `.hero-shop-btn`. FIND sends preferred `?merv=` (FH-087).
- Phone header stays short; `--site-header-h` drives hash offset (FH-206, FH-207, FH-275–277).
- Custom label shortens to “Custom” below 2xl (FH-255). Account/cart have hover names (FH-174). Measure chip is large enough to tap and does not crush Width/Length (FH-168, FH-179). FILTER CLOCK on Home actually scrolls (FH-169).

**Hero**

- Live HTML stage, still character + four packs, chrome navy matching `.brand-band` (FH-052, FH-216, FH-220, FH-270, FH-238).
- No painted banner, no flight stack, no Filter King now-at lockup, no graph mesh, no outlined giant HERO (FH-080, FH-104, FH-233).
- Mascot sits on the word Hero at sign height, knockout white, ice outline on navy (FH-260–265, FH-279–280).
- Packs: official Filter Hero shots, slanted tickets, MERV 8/Carbon/11/13, click writes preferred MERV (FH-088, FH-092, FH-118, FH-239–243).
- Home still scrolls: first screen is header + hero + marquee; rest is normal flow (FH-059 wontfix, FH-084, FH-085).
- CTAs are the crimson slant, not a mixed pill (FH-112). Claim names 30+ brands and custom (FH-114, FH-115).

**Size / catalog UI**

- Contractor allowlist only until the sheet grows (FH-043, FH-217). Off-catalog → quote.
- One official pack shot per MERV for every size and qty; no Filter King wordmark; no vertical MERV plate on the stack (FH-044–049, FH-239–243).
- MERV picker is catch-section language on white, full-width chips, rating-color wash, Capture dots that change with the chip (FH-038–041, FH-248–250).
- Qty any integer 1–12 (FH-252). Gallery follows MERV (FH-244, FH-245).
- How to measure on every size page (FH-035). How to replace (FH-283). Overdue repairs named, navy panel (FH-285–287).
- No 30-day guarantee (FH-282). No free-shipping promise (FH-177, FH-178, FH-186, FH-253). Delivery is 2–3 day (FH-295).

**Photos / trust / catch cards**

- Catch cards share one frame size; Carbon is cooking (pot in frame), not pets; MERV 11 is not the sleeping pets shot; MERV 13 is not the nebulizer (FH-143, FH-144, FH-148, FH-161–164, FH-173).
- Why Filter Hero card 2 is **Built to last** + `/products/merv-8-layers.png`, `object-contain` on `#e8ecf2`, all four frames `aspect-[5/4]` (FH-296–299).
- Delivery card is not a wall-install photo (FH-281). Family section is not a white sheet (FH-166). FAQ has no photo mosaic (FH-037).
- Delivery map is not a solid blue square (FH-165).

**Cart / checkout UI**

- Toast portal to `body` (FH-215). Unsellable lines toast on hydrate (FH-128). Success clears cart only after paid (FH-121).
- Quote handoff is stash-then-take (FH-117, FH-127). Sticky add is mobile-only (FH-180).
- Checkout collects shipping address (FH-120). Stripe Tax is a product decision (FH-132, FH-211, FH-251) — do not show fake tax in the drawer.
- Focus into the cart when it opens (FH-302, open).

**Contact / Turnstile**

- Turnstile lazy-mounts near viewport; missing token is 400 `bot_check_failed`; 429 is `rate_limited_contact` (FH-190, FH-247, FH-200, FH-301).
- Honeypot + form reset are live JS (FH-197). Lead is saved even if mail fails (FH-124).

**Measure / clock**

- Tape diagram on size pages (FH-035). No non-animatable opacity logs (FH-232).
- Clock cadence 30/60/90/180 (FH-031, open). No pre-purchase replacement mail (FH-131).

**SEO / a11y copy**

- Navy FAQ answers are white, not ice-on-navy (FH-050). `og:type=article` on SPA nav (FH-129). Size JSON-LD is the product, not the homepage (FH-194).

**Admin**

- Full console, not quotes-only (FH-213). Debounced loads (FH-214). Connect errors stay on the page (FH-225). `noindex`.

### 20.3 Complete index (FH-031 – FH-306)

| Id | Status | Area | Title |
|---|---|---|---|
| FH-031 | open | clock | Filter Clock days must be 30 / 60 / 90 / 180 only |
| FH-032 | mitigated | header | How to Measure chip belongs with Shop / Brands / Clock / Contact |
| FH-033 | mitigated | header | Clock nav still says Clock, not FILTER CLOCK |
| FH-034 | fixed | header | Custom CTA should read Need a custom size |
| FH-035 | mitigated | measure | Tape-measure diagram missing from product pages |
| FH-037 | mitigated | photos | FAQ heading collage |
| FH-038 | mitigated | catalog | Size-page MERV picker matches catch-section columns |
| FH-039 | mitigated | catalog | MERV chips span their column |
| FH-040 | mitigated | catalog | Size-page MERV note uses catch-page Capture |
| FH-041 | mitigated | catalog | Carbon Capture dots read as black on white |
| FH-042 | mitigated | other | tsconfig `baseUrl` flagged as an error |
| FH-043 | mitigated | catalog | Shop listed SKUs with no wholesale cost |
| FH-044 | mitigated | photos | Pack shot said MERV 8 on every size page |
| FH-045 | mitigated | photos | Pack shots had a vertical MERV plate on the stack |
| FH-046 | mitigated | photos | Every MERV 8 size used the raw Filter King 6-pack |
| FH-047 | mitigated | photos | Official MERV 8 pack shot for every size and pack |
| FH-048 | mitigated | photos | Official MERV 13 pack shot for every size and pack |
| FH-049 | mitigated | photos | Official MERV 11 pack shot for every size and pack |
| FH-050 | mitigated | seo | Navy FAQ answers were too close to the background |
| FH-051 | mitigated | pricing | Leftover Filter King ladders were modeled, not live |
| FH-052 | mitigated | photos | Home hero rebuilt as a live stage, not a painted banner |
| FH-053 | mitigated | photos | Hero art was a pile of overlapping cutouts |
| FH-054 | mitigated | photos | Hero filters were trapped in a glass tray |
| FH-055 | mitigated | photos | Home hero is character only |
| FH-056 | mitigated | photos | Hero used a chopped crop instead of the solo character |
| FH-057 | mitigated | photos | Home hero was a tall scroll region |
| FH-058 | mitigated | photos | Hero product showcase uses clean pack shots |
| FH-059 | wontfix | photos | Home is a single locked hero screen |
| FH-060 | mitigated | photos | MERV 13 hero cutout must keep the original product |
| FH-061 | mitigated | photos | Home hero felt like a static catalog row |
| FH-062 | mitigated | photos | Hero character crowded out the filter shots |
| FH-063 | mitigated | photos | Hero filters and brands sat in separate corners |
| FH-064 | mitigated | photos | Hero headline did not use the logo font |
| FH-065 | mitigated | photos | Logo font change was not visible in the hero |
| FH-066 | mitigated | photos | Hero cast sat too far left over the copy |
| FH-067 | mitigated | photos | Hero cast needed another nudge right |
| FH-068 | mitigated | photos | Hero filters sat too close to the character |
| FH-069 | mitigated | photos | Hero filters needed a guarantee line above them |
| FH-070 | mitigated | photos | Hero character sat too low under the filters |
| FH-071 | mitigated | photos | Carbon and MERV 13 hero captions duplicated the boxes |
| FH-072 | mitigated | photos | Hero brand fit claim was easy to miss |
| FH-073 | mitigated | photos | Hero character was a frozen still |
| FH-074 | mitigated | photos | Hero restaged left, header stays on the first screen |
| FH-075 | mitigated | header | Header character icon looked blank after the public swap |
| FH-076 | mitigated | photos | Hero character sat too far forward |
| FH-077 | mitigated | photos | Hero background hugged the left crop |
| FH-078 | mitigated | photos | Hero stage wash no longer matched the preview |
| FH-079 | mitigated | photos | Hero looked like two different backgrounds |
| FH-080 | mitigated | photos | Hero graph-paper grid came off |
| FH-081 | mitigated | photos | Leftover hero line overlays stayed on |
| FH-082 | mitigated | photos | Hero type and packs read too small |
| FH-083 | mitigated | photos | Filter King claim sat under the packs |
| FH-084 | mitigated | other | Home hid everything below the hero |
| FH-085 | mitigated | other | Trust marquee sat below the first screen |
| FH-086 | mitigated | header | Header lockup left the 8:09 shopper bar |
| FH-087 | mitigated | header | Header CTAs drifted from the shop buttons |
| FH-088 | mitigated | photos | Hero packs sat in a small overlapping fan |
| FH-089 | mitigated | photos | Hero MERV 13 used the older pack shot |
| FH-090 | mitigated | photos | Hero packs sat still after the lineup |
| FH-091 | mitigated | photos | Hero captions did not match catch bubbles |
| FH-092 | mitigated | photos | Hero captions redesigned off the pill |
| FH-093 | mitigated | photos | Hero Filter King pill was not a statement |
| FH-094 | mitigated | photos | Hero tag now uses both brand marks |
| FH-095 | mitigated | photos | Dual-logo tag sat on a white plate |
| FH-096 | mitigated | photos | Dual-logo tag said FROM, which implied Filter Hero makes Filter King |
| FH-097 | mitigated | photos | Hero character was a frozen still again |
| FH-098 | mitigated | photos | Dual-logo claim sat in a darker navy strip |
| FH-099 | mitigated | photos | Dual-logo claim lost its fade |
| FH-100 | mitigated | photos | Hero character sat under the headline |
| FH-101 | mitigated | photos | Hero character sat too far forward |
| FH-102 | mitigated | photos | Hero character sat too far right of the lockup |
| FH-103 | mitigated | photos | Hero foreground sat too far right of the mascot |
| FH-104 | mitigated | photos | Giant outlined HERO sat where the mascot belongs |
| FH-105 | mitigated | photos | Hero character sat behind the packs instead of the middle lane |
| FH-106 | mitigated | photos | Hero character needed a flight loop in his exact form |
| FH-107 | mitigated | photos | Hero Filter King packs sat too close together |
| FH-108 | mitigated | photos | Hero Filter King packs sat too low |
| FH-109 | mitigated | photos | Hero Filter King packs still sat a little low |
| FH-110 | mitigated | brands | Hero brand row sat low and only showed three marks |
| FH-111 | mitigated | other | Trust marquee chips sat too small after the hero lift |
| FH-112 | mitigated | other | Hero CTAs mixed a pill with the site slant |
| FH-113 | mitigated | photos | Hero character used a warped still instead of a real flight clip |
| FH-114 | mitigated | other | Hero claim line named Trane, Carrier, Rheem + 30 more |
| FH-115 | mitigated | brands | Hero brand strip did not mention custom sizes |
| FH-116 | mitigated | photos | Hero video used invalid React `defaultMuted` prop |
| FH-117 | mitigated | cart | Cart quote handoff was cleared before the destination page could read it |
| FH-118 | mitigated | photos | Hero pack tiles ignored the selected MERV |
| FH-119 | mitigated | other | Hash scroll only ran on first mount |
| FH-120 | mitigated | other | Stripe Checkout did not collect a shipping address |
| FH-121 | mitigated | cart | Success page cleared the cart without verifying payment |
| FH-122 | mitigated | other | Production leads and orders wrote into `dist/data` |
| FH-123 | mitigated | other | Stripe webhook wrote duplicate orders on retry |
| FH-124 | mitigated | contact | Contact email failure returned 400 after the lead was saved |
| FH-125 | mitigated | pricing | Carbon carousel showed a “from $” price while quote-only |
| FH-126 | mitigated | clock | Filter Clock reminder stored MERV as “filter size” |
| FH-127 | mitigated | cart | Checkout cancel “quote instead” raced Home paint |
| FH-128 | mitigated | cart | Unsellable cart lines vanished on reload with no notice |
| FH-129 | mitigated | seo | SPA navigation dropped `og:type=article` |
| FH-130 | mitigated | seo | Stale public robots.txt and llms.txt lagged the server |
| FH-131 | mitigated | clock | Filter Clock must not send replacement emails before a purchase |
| FH-132 | mitigated | cart | Checkout collected no sales tax and no Stripe customer |
| FH-133 | mitigated | catalog | Full Filter King catalog stayed behind a code flag the .env did not read |
| FH-134 | mitigated | pricing | 1-inch carbon qty 1 did not match Filtrete odor |
| FH-135 | open | pricing | Full-catalog Filtrete match still leaves pack, MERV, and thick-size gaps |
| FH-136 | mitigated | pricing | Match the cheaper of Filtrete and Filter King on compared rungs |
| FH-137 | mitigated | pricing | Filtrete-gap rungs: cheapest peer is FilterBuy; HDX undercuts MERV 8 store-brand |
| FH-138 | mitigated | pricing | Match FilterBuy on confirmed cheaper 2-inch / 4-inch rungs |
| FH-139 | mitigated | cart | Checkout 400 when Stripe Tax had no head office |
| FH-140 | mitigated | brands | Brand model/OEM search always opened /sizes, even off-catalog |
| FH-141 | mitigated | other | Hero character sat planted instead of flying the sky |
| FH-142 | mitigated | other | Hero flyer looked dragged because the pose never flew |
| FH-143 | mitigated | photos | MERV 11 catch card used the sleeping cat-and-dog photo |
| FH-144 | mitigated | photos | MERV 8 Carbon catch card showed the woman-with-pets photo |
| FH-145 | mitigated | photos | Hero stage used a darker blue than the rest of the site |
| FH-146 | mitigated | other | Hero flyer was still one locked pose on a path |
| FH-147 | mitigated | other | Hero flyer vanished after the pose-machine swap |
| FH-148 | mitigated | photos | MERV 8 Carbon catch card had no cooking photo |
| FH-149 | mitigated | photos | Hero fly clip used the old sheet and baked-in particle effects |
| FH-150 | mitigated | photos | Hero flyer sat too large in the middle lane |
| FH-151 | mitigated | photos | Hero flyer still a touch large after FH-150 |
| FH-152 | mitigated | photos | Hero fly clip had a ghost second cape and locked-pose motion |
| FH-153 | mitigated | photos | Hero fly plate sat in a boxed slot |
| FH-154 | mitigated | photos | Hero flyer read a notch too large on the full-bleed plate |
| FH-155 | mitigated | photos | Hero fly plate was 720p on a full-bleed stage |
| FH-156 | mitigated | photos | Hero flyer still a tad large after FH-154 |
| FH-157 | mitigated | photos | Hero flyer still a tad large after FH-156 |
| FH-158 | mitigated | photos | Scaled fly plate showed a square in the navy |
| FH-159 | mitigated | photos | Fly clip still read as a boxed plate inside the lineup |
| FH-160 | mitigated | photos | Flyer grew off-screen; last pose was not the logo |
| FH-161 | mitigated | photos | MERV 8 Carbon catch card used the pizza-topping kitchen photo |
| FH-162 | mitigated | photos | MERV 8 Carbon cooking photo cropped the pot out |
| FH-163 | mitigated | photos | Catch-card photos were not one size |
| FH-164 | mitigated | photos | Capture dots were smaller than MERV 13 |
| FH-165 | mitigated | photos | Delivery map sat in a solid blue square |
| FH-166 | fixed | photos | Who you're protecting sat on a white sheet |
| FH-167 | fixed | photos | Everyday Home card still used the girl-and-dog photo |
| FH-168 | fixed | header | Header How to Measure chip squeezed Width / Length numbers |
| FH-169 | fixed | header | Header Filter Clock on the home page did not scroll |
| FH-170 | fixed | photos | Pets card inset was the woman with dog and cat |
| FH-171 | fixed | other | Sign-in vanished after switching to family-section-blue |
| FH-172 | fixed | pricing | MERV deck “from $” used Filter King undercut, not shop tickets |
| FH-173 | fixed | photos | MERV 13 catch card still used the child nebulizer photo |
| FH-174 | fixed | header | Header account and cart icons did not label on hover |
| FH-175 | fixed | pricing | Site-wide product prices must be live tickets |
| FH-176 | fixed | other | `pnpm check` died on NodeList spread in hero sky flight |
| FH-177 | fixed | seo | FAQ said free shipping only over $50 |
| FH-178 | fixed | other | Free shipping was missing on delivery, cart, and checkout |
| FH-179 | fixed | header | Header Measure chip was too short to tap |
| FH-180 | fixed | cart | Size-page sticky Add to cart leaked onto desktop |
| FH-181 | mitigated | seo | www.filterhero.net does not load the shop |
| FH-182 | fixed | other | Railway trial deploy failed when a second region was set |
| FH-183 | fixed | other | Cloudflare API token cannot create the filterhero.net zone |
| FH-184 | mitigated | seo | Recheck 2026-09-07 02:02: apex shop is live; NS and www are not unanimous |
| FH-185 | mitigated | seo | Debug 2026-09-07 02:08: apex shop is 100%; www default and live $50 FAQ are not |
| FH-186 | fixed | seo | Live FAQ and crawler copy still said shipping over $50 |
| FH-187 | fixed | photos | Live site still showed the old main build, not the local shop |
| FH-188 | fixed | other | Supabase CRM and accounts were half-wired on this branch |
| FH-189 | fixed | other | `pnpm check` failed and Vite env was incomplete |
| FH-190 | fixed | contact | Quote intake had no bot gate, and CRM routes imported a missing security module |
| FH-191 | fixed | other | Local `.env` had no live verifier and `.env.example` omitted live keys |
| FH-192 | fixed | other | Klaviyo onsite never loaded if config fetch failed once |
| FH-193 | fixed | other | Cart Klaviyo pack shots used an unsafe MERV cast |
| FH-194 | fixed | seo | Size JSON-LD spoke as the homepage and omitted free-shipping Offer fields |
| FH-195 | fixed | pricing | Filter King `n` size keys in live-price JSON never matched the catalog |
| FH-196 | fixed | contact | This branch had Klaviyo keys and DNS but no live integration |
| FH-197 | fixed | contact | Custom quote honeypot and form reset were not live JS |
| FH-198 | fixed | seo | Local API 404ed size-page SSR that smoke now requires |
| FH-199 | fixed | other | Python tooling crashed on cwd, imports, and wholesale print |
| FH-200 | fixed | contact | Smoke died on a hot contact limiter, and empty checkout leaked Zod |
| FH-201 | fixed | contact | Production shop had Klaviyo keys but no live routes |
| FH-202 | fixed | contact | Lead mail still used the Resend sandbox From |
| FH-203 | fixed | other | Stripe Dashboard had no fulfillment webhook |
| FH-204 | fixed | other | Checkout created a new Stripe Customer on every email |
| FH-205 | fixed | other | Public API had no headers, leaked parser text, and left browser grants on Postgres |
| FH-206 | fixed | header | Phone header was 308px and crushed the first screen |
| FH-207 | fixed | header | Hash jumps landed under the two-row phone header |
| FH-208 | fixed | other | Production staff magic links could not land on /admin |
| FH-209 | fixed | other | Local CSP blocked Klaviyo onsite identify |
| FH-210 | fixed | other | Production still ran an older main build |
| FH-211 | fixed | other | Stripe Tax was calculating (and billing) at Checkout |
| FH-212 | fixed | other | Local CSP still blocked Klaviyo identify after FH-209 |
| FH-213 | fixed | other | Staff console was quotes-only |
| FH-214 | fixed | other | Admin console bugs after the first landing |
| FH-215 | fixed | cart | Toasts never mounted; staff OTP hidden until a second send |
| FH-216 | fixed | other | Homepage hero looped a background flight video |
| FH-217 | fixed | catalog | Shop sold the archive instead of the Model Pricing list |
| FH-218 | fixed | photos | Hero still was too small to read |
| FH-219 | fixed | photos | Hero still blended into the navy sky |
| FH-220 | fixed | photos | Hero sky was Seedance navy, not site chrome |
| FH-221 | fixed | photos | Hero still was flat `#203868` over chrome navy |
| FH-222 | fixed | photos | Hero still rebuilt from the official character sheet |
| FH-223 | fixed | catalog | Stripe, Klaviyo, CRM, and accounts still had the old catalog |
| FH-224 | fixed | other | Intuit OAuth questionnaire item 6 was not implemented |
| FH-225 | fixed | other | Settings Connect crashed with Something went wrong |
| FH-226 | mitigated | other | Intuit rejected Filter Hero redirect_uri |
| FH-227 | mitigated | other | QuickBooks Connect was sandbox-only |
| FH-228 | mitigated | other | Klaviyo had no native Stripe charge/invoice webhook |
| FH-229 | mitigated | other | Native Klaviyo Stripe app accepts webhooks but does not record metrics |
| FH-230 | fixed | other | Klaviyo Stripe checker treated metrics as missing |
| FH-231 | fixed | other | Local Klaviyo onsite CORS failed on HTTP→HTTPS redirect |
| FH-232 | fixed | measure | Measure diagram logged non-animatable opacity |
| FH-233 | fixed | other | Remove Filter King now-at lockup from the hero |
| FH-234 | fixed | other | Klaviyo emails used text wordmark instead of the Filter Hero logo |
| FH-235 | fixed | contact | Resend mail was unbranded plain text |
| FH-236 | fixed | other | Live Klaviyo flows still sent the ice wordmark |
| FH-237 | fixed | other | Live Klaviyo flow clones reject template PATCH |
| FH-238 | fixed | other | Retired hero flight stacks and unused shadcn kit still shipped |
| FH-239 | fixed | photos | MERV 8 pack shots still said Filter King |
| FH-240 | fixed | photos | Carbon pack shots still said Filter King |
| FH-241 | fixed | photos | MERV 11 pack shots still said Filter King |
| FH-242 | fixed | photos | MERV 13 pack shots still said Filter King |
| FH-243 | fixed | photos | MERV 8 pack shots still used the branded Filter Hero lockup |
| FH-244 | fixed | photos | Size page ignored `?merv=13` after another rating |
| FH-245 | fixed | photos | Switching MERV left the gallery on the previous rating's thumb |
| FH-246 | fixed | contact | Resend verify never sent the real templates |
| FH-247 | fixed | contact | Turnstile loaded on every homepage view and skipped a missing token |
| FH-248 | fixed | catalog | MERV picker chips sat on white instead of their rating color |
| FH-249 | fixed | catalog | Capture note stayed gray after a MERV chip was chosen |
| FH-250 | fixed | catalog | One-rating size pages left the MERV chip in a four-column hole |
| FH-251 | fixed | cart | Checkout collected no sales tax (Stripe Tax was off) |
| FH-252 | fixed | catalog | Size page only sold 1, 2, 4, 6, or 12 filters |
| FH-253 | fixed | cart | Free shipping was still promised on the shop |
| FH-254 | open | cart | Stripe Checkout still prints Free next to a $0 shipping option |
| FH-255 | fixed | header | Header custom tab shortened to Custom below 2xl |
| FH-256 | fixed | photos | Hero MERV packs sat about an inch too low |
| FH-257 | fixed | photos | Hero MERV packs needed a quarter-inch drop after FH-256 |
| FH-258 | fixed | brands | Hero 30+ brand strip sat a quarter inch too low |
| FH-259 | fixed | photos | Hero MERV packs needed another quarter-inch drop |
| FH-260 | fixed | photos | Hero mascot still had an opaque plate |
| FH-261 | fixed | photos | Hero mascot lost its white outline on navy |
| FH-262 | fixed | photos | Hero mascot did not match the header lockup |
| FH-263 | fixed | photos | Hero mascot sat a quarter inch too far right |
| FH-264 | fixed | photos | Hero mascot needed another quarter-inch left nudge |
| FH-265 | fixed | photos | Hero mascot sat in the headline gap instead of right of HERO |
| FH-266 | fixed | photos | Hero FILTER HERO lockup and mascot were hard to read |
| FH-267 | fixed | photos | Revert the brighter FILTER HERO lockup glow |
| FH-268 | fixed | photos | Revert the mascot off the HERO lockup |
| FH-269 | fixed | photos | Putting the mascot back in the sky shifted the hero |
| FH-270 | fixed | photos | Hero stage used a different navy than the brand bands |
| FH-271 | fixed | photos | Lockup mascot was not the same size as FILTER HERO |
| FH-272 | superseded | photos | FILTER HERO lockup and mascot were clipped |
| FH-273 | fixed | photos | FILTER HERO lockup clip was a filter box, not type size |
| FH-274 | fixed | photos | Copy-column padding made the hero navy feel bigger |
| FH-275 | fixed | header | Header bar was crowding the hero lockup |
| FH-276 | fixed | header | Header needed another tad shorter |
| FH-277 | fixed | header | Header needed one more tad shorter |
| FH-278 | superseded | photos | Lockup mascot needed a hair smaller |
| FH-279 | fixed | photos | Revert lockup mascot back to sign height |
| FH-280 | fixed | photos | Lockup mascot sat a hair high |
| FH-281 | fixed | photos | 2-day delivery card used a wall-install photo |
| FH-282 | fixed | other | Shop still promised a 30-day guarantee |
| FH-283 | fixed | other | Size pages had no how-to-replace section |
| FH-284 | fixed | other | MERV pick copy skipped capacity / resistance |
| FH-285 | fixed | other | Size PDP left navy column empty under trust chips |
| FH-286 | fixed | other | Overdue-filter costs were vague buckets, not named repairs |
| FH-287 | fixed | photos | Size PDP overdue panel used off-brand burgundy wash |
| FH-288 | fixed | other | Home popular-sizes band replaced with overdue repair costs |
| FH-289 | fixed | other | Home overdue band buried the filter-vs-repair punchline |
| FH-290 | fixed | other | Verify overdue-cost + how-to invariants in store checks |
| FH-291 | fixed | contact | Resend verify died on Turnstile |
| FH-292 | fixed | contact | Stripe webhook could send a second Resend confirmation |
| FH-293 | fixed | other | Klaviyo refunds unmapped and welcome-list fallback could split Email List |
| FH-294 | fixed | other | Sandbox Stripe webhooks impersonated live FILTER HERO |
| FH-295 | fixed | other | Delivery promise said 2-day instead of 2-3 day |
| FH-296 | fixed | photos | Why Filter Hero fit card should say Built to last |
| FH-297 | fixed | photos | Built to last layers graphic did not fill the trust card |
| FH-298 | fixed | photos | Built to last layers crop clipped the diagram and labels |
| FH-299 | fixed | photos | Built to last card was taller than the other trust photos |
| FH-300 | open | other | Production Klaviyo JSON feed still serves a 299-SKU mix |
| FH-301 | fixed | contact | Smoke treated a rate-limited contact post as a Turnstile miss |
| FH-302 | open | cart | Add to cart leaves focus on a button Radix then marks aria-hidden |
| FH-303 | open | catalog | Railway FULL_CATALOG=true conflicts with the Model Pricing shop |
| FH-304 | open | other | GitHub autodeploy and `railway up` both own FILTER-HERO |
| FH-305 | open | other | Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO |
| FH-306 | open | other | Railway has no HTTP healthcheck |

FH-177 and FH-178 were logged twice in the source file; they are one fix each. For **Do / Do NOT / Files / Verify** on any row, open that heading in `docs/ISSUES-AND-FIXES.md`.

---

## 21. File checklist — the UI install in one glance

| Role | Path |
|---|---|
| HTML shell | `client/index.html` |
| JS entry | `client/src/main.tsx` |
| Providers + routes | `client/src/App.tsx` |
| Tokens + shop CSS | `client/src/index.css` |
| shadcn config | `components.json` |
| Vite | `vite.config.ts` |
| Path aliases | `tsconfig.json` |
| Class merge | `client/src/lib/utils.ts` |
| Header | `client/src/components/SiteHeader.tsx` |
| Cart | `client/src/contexts/CartContext.tsx`, `CartDrawer.tsx` |
| Hero | `client/src/components/Hero.tsx` |
| Home composition | `client/src/pages/Home.tsx` |
| Size PDP | `client/src/pages/SizeDetail.tsx` |
| SEO client | `client/src/hooks/useSeo.ts` |
| SEO server inject | `shared/seo.ts` + `server/index.ts` `sendDocument` |
| Klaviyo onsite | `client/src/lib/klaviyo.ts` |
| Auth client | `client/src/lib/admin-api.ts` |
| Staff chrome | `client/src/pages/admin/AdminShell.tsx` |
| Issue log | `docs/ISSUES-AND-FIXES.md` |

That is how this UI is installed. Anything else is a new ticket, and it gets the next `FH-XXX`.

# Filter Hero — issues and fixes

Append here when you find or fix a bug. Chat is not the log. Never reuse ids.

```markdown
### FH-XXX — short title
- **Status:** open | mitigated | wontfix
- **Area:** finder | catalog | pricing | cart | header | clock | measure | brands | seo | photos | contact | other
- **Symptom:** what the shopper sees
- **Do NOT:** the change that brings it back
- **Do:** the invariant
- **Files:** key paths
- **Verify:** page or command
- **Added:** YYYY-MM-DD
```

Next id: **FH-364**

---

### FH-363 — Pack tickets undercut wholesale below 35% gross margin
- **Status:** fixed
- **Area:** pricing
- **Symptom:** Competitive ladders (Filtrete beat, Filter King × 0.90, FilterBuy match) could price a pack unit below the wholesale margin floor. Example: 20x25x1 MERV 8 cost $4.82 → qty 12 competitive ~$5.88 (~18% margin). ~232 sellable rungs were under 35% before the floor.
- **Do NOT:** Drop the competitive ladder. Do not invent Filtrete tickets. Do not round the floor with `money(cost / 0.65)` alone — that can land a hair under 35% after cents (use ceil-to-cent). Do not exempt qty 12 from the floor to stay “cheapest.”
- **Do:** After each competitive rung, raise to `minSellForMargin(wholesale)` so `(sell − cost) / sell ≥ 35%`, then carry the cheapest unlocked stair forward (FH-361). Same floor for every qty on a SKU when cost is fixed. Cart, Stripe, JSON-LD, and Klaviyo use `liveUnitPrice`.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`, `shared/sellable-skus.json` (cost source)
- **Verify:** `pnpm verify:store`. Flagship 20x25x1 MERV 8: qty 1 $9.99, qty 6 $7.49, qty 12 $7.42. Carbon qty 1 $23.64 (Filtrete odor $16.70 under cost). 20x20x1 MERV 8 qty 12 $6.80. 16x25x1 MERV 8 qty 12 $6.16. Sellable scan: 0 rungs under 35%.
- **Added:** 2026-09-22
- **Fixed:** 2026-09-22

---

### FH-362 — Stripe Checkout had no transparent logo and did not match the shop
- **Status:** fixed
- **Area:** other
- **Symptom:** FILTER HERO hosted Checkout had `logo`/`icon` null. Brand colors were on (`checkout_use_brand_colors`), which navy-washes the page instead of the shop’s light canvas + burgundy Pay. The boxed `logo.png` is a near-white plate, so Stripe cannot show the flying mark the way the header does.
- **Do NOT:** Point Checkout at `https://filterhero.net/logo.png` (opaque plate). Do not use localhost as the logo URL. Do not pass `/logo-checkout.png` to Stripe until live serves it as `image/png` (the SPA currently returns HTML). Do not set `checkout_use_brand_colors` if the page should stay canvas `#f6f7f9` with burgundy buttons. Do not pick a Stripe font other than Nunito for this shop. Do not add a second Checkout UI (Payment Element).
- **Do:** Dashboard + every hosted session use `shared/stripe-checkout-brand.ts`: transparent `https://filterhero.net/hero/lockup-mascot.png`, canvas `#f6f7f9`, Pay `#7F2328`, navy `#203868`, Nunito, rounded, display name Filter Hero. Keep `/logo-checkout.png` (knockout of `logo.png` with the FILTER HERO wordmark) in `client/public` for later. Receipts stay on `/logo.png`.
- **Files:** `shared/stripe-checkout-brand.ts`, `server/stripe.ts`, `client/public/logo-checkout.png`, `scripts/verify-store.ts`, `scripts/debug-stripe-checkout.ts`, `scripts/smoke-site.ts`, `docs/STRIPE-FULL-BUILD.md`
- **Verify:** `pnpm verify:store`. `pnpm debug:stripe-checkout` — session `branding_settings` has Nunito, `#f6f7f9`, `#7F2328`, and the lockup-mascot URL. Stripe Dashboard → Branding: logo is the transparent flyer. Open a test Checkout URL: mascot on the light canvas, burgundy Pay.
- **Added:** 2026-09-22
- **Fixed:** 2026-09-22
- **Mitigates:** the logo line in FH-358

---

### FH-361 — Higher qty cost more per filter than a lower rung
- **Status:** fixed
- **Area:** pricing
- **Symptom:** On `/sizes/20x25x1` Carbon, the Qty / Each / Savings ladder showed **4 @ $8.37 (50%)** as Best value while **6+ @ $10.34** and **12+ @ $10.28** were more expensive per filter. Filter King carbon ladders invert at qty 4 vs 6 (FH-135 item 1). “Best value” undercut “Most popular.”
- **Do NOT:** Raise the cheap qty-4 rung to match qty 6. Do not invent Filtrete carbon multi-packs. Do not drop Filter King undercut or FilterBuy match (FH-342). Do not let a higher qty cost more per filter than a lower unlocked rung.
- **Do:** `liveUnitPrice` computes each rung as before (`rawLiveUnitPrice`), then carries the cheapest unlocked stair (1 / 2 / 4 / 6 / 12) forward. Qty 6 and 12 keep the $8.37 carbon deal once qty 4 unlocks it. Same rule for every size × MERV. Cart, Stripe, and JSON-LD use the same function.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. `/sizes/20x25x1?merv=carbon` — qty 4 / 6 / 12 are non-increasing per filter. 20x25x1 MERV 8 qty 6 stays **$7.49** when still above the FH-363 floor.
- **Added:** 2026-09-22
- **Fixed:** 2026-09-22
- **Mitigates:** FH-135 pack-inversion bullet (1)

---

### FH-360 — Hovering a MERV chip left the pack photo on the pressed rating
- **Status:** fixed
- **Area:** photos
- **Symptom:** On a size page, hovering MERV 8, Carbon, 11, or 13 updated the chip and the Capture box, but the gallery kept the pressed rating’s pack shot.
- **Do NOT:** Leave `.product-shot` on `selectedType` while `hoverKey` is set. Do not change the unit price, cart line, or JSON-LD image on hover. Do not keep a mesh or layers thumb index when the preview rating changes.
- **Do:** The theater, pack photo, thumbs, and MERV chip follow `previewType`. A hover that is not the pressed rating shows that rating’s pack shot (index 0). Leaving the row restores the pressed rating and its thumb. Click still commits the rating, price, and gallery.
- **Files:** `client/src/pages/SizeDetail.tsx`
- **Verify:** `/sizes/20x25x1` — hover MERV 11, 13, and Carbon. The pack photo src matches that rating. Move the pointer off; the photo returns to the pressed rating. The price does not change until click.
- **Added:** 2026-09-22
- **Fixed:** 2026-09-22
- **Supersedes:** the gallery line in FH-359

---

---

### FH-359 — Capture note stayed gray while hovering a MERV chip
- **Status:** fixed
- **Area:** catalog
- **Symptom:** On a size page, hovering MERV 8, Carbon, 11, or 13 tinted only the chip. The Capture box under Choose MERV stayed the same cool gray, so the two sections did not share that rating’s color.
- **Do NOT:** Hard-code `.pdp-merv-note` to `rgba(232, 237, 244, 0.7)`. Do not leave the Capture label on `--mesh`. Do not let hover change the price or the pressed MERV. Gallery preview is FH-360.
- **Do:** Hover (and keyboard focus) sets the pair’s `--merv-wash` from that chip’s `badgeColor`. Chip and Capture box both use a 20% wash while hot, and 14% for the pressed chip and its note at rest. Capture dots use the same badge color. Leaving the row restores the pressed rating.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/index.css`, `client/src/components/CaptureDots.tsx`
- **Verify:** `/sizes/20x25x1` — hover MERV 8 (navy), Carbon (black), MERV 11 (red), MERV 13 (gold). Chip body and Capture box match. Move the pointer off; the box returns to the pressed rating. Click still changes the gallery and price.
- **Added:** 2026-09-22
- **Fixed:** 2026-09-22

---

### FH-358 — FILTER HERO Checkout brand colors on, logo missing; Railway still test keys
- **Status:** open
- **Area:** other
- **Symptom:** FILTER HERO (`acct_1U9bqlQEENEs0Qmw`) test branding now uses navy `#203868` / burgundy `#7F2328` with `checkout_use_brand_colors`. The Checkout logo/icon files are empty (`logo`/`icon` null). Default PMC has Google Pay **off**. Tax Settings are active (Miami FL head office) but there are **zero** tax registrations, so automatic tax collects nothing. Catalog Products on this account are not the 293 `prod_fh_*` SKUs (sandbox `acct_1U9bqs790NnFGDLv` has that map). Railway production `STRIPE_SECRET_KEY` is still `sk_test_` (FH-305). Stripe MCP has test mode only — cannot create the live shop webhook.
- **Do NOT:** Copy local sandbox `STRIPE_SECRET_KEY` onto Railway. Do not point sandbox or FILTER HERO test webhooks at `https://filterhero.net/api/stripe/webhook`. Do not connect Klaviyo to sandbox. Do not add a tax registration unless Filter Hero is registered with that state. Do not invent a `sk_live_` key.
- **Do:** Dashboard → FILTER HERO → Branding: re-upload `https://filterhero.net/logo.png`. Enable Google Pay on the account Default PMC. Add live FILTER HERO to the Stripe MCP session. Put `sk_live_` / `pk_live_` / `VITE_STRIPE_PUBLISHABLE_KEY` on Railway, rebuild, then `pnpm setup:stripe-webhook` and `pnpm sync:catalog` on that live key. Add tax registrations only for states already collecting.
- **Files:** `shared/stripe-accounts.ts`, `scripts/setup-stripe-webhook.ts`, `docs/STRIPE-FULL-BUILD.md`
- **Verify:** Checkout shows the Filter Hero logo. Railway `STRIPE_SECRET_KEY` starts with `sk_live_`. Live webhook `https://filterhero.net/api/stripe/webhook` enabled. `pnpm verify:stripe-books`. `pnpm verify:env`.
- **Added:** 2026-09-21

---

### FH-357 — verify:store still required the dark brand-band chrome
- **Status:** fixed
- **Area:** photos
- **Symptom:** `pnpm verify:store` failed after FH-355: `brand-band fill is the chrome 90deg navy`. The checker still wanted `linear-gradient(90deg, #1a3058 …)`. CSS already uses `#23406a` → `#2a4d82` → `#3a66a3`.
- **Do NOT:** Put `#1a3058` back on `--brand-band-fill`. Do not leave the verifier on the old dark chrome.
- **Do:** Assert the FH-355 90deg chrome (`#23406a` 0%, `#2a4d82` 48%, `#3a66a3` 100%) and forbid the `#1a3058` start.
- **Files:** `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-356 — Size-page MERV 11 fill did not match the home card
- **Status:** fixed
- **Area:** photos
- **Symptom:** `/sizes/…` gallery used a stronger `--pdp-glow` mix (34% badge over navy). Home `#merv` `.merv-tile` MERV 11 is 28% badge over `#345a94` → `--navy-fill` → `--deep-fill`. The two reds did not match.
- **Do NOT:** Mix the theater at 34% into `--navy-fill`, or put a white-tinted glow over the panel. Do not change `badgeColor` `#d21b22` on the MERV 11 chip.
- **Do:** `.product-theater` uses the same 165deg wash as `.merv-tile` (`28%` badge into `#345a94`, then `--navy-fill` / `--deep-fill`). `--pdp-glow` stays `selectedType.badgeColor`.
- **Files:** `client/src/index.css`
- **Verify:** Home MERV 11 card vs `/sizes/20x25x1?merv=11` left gallery — same wine navy. Chip stays `#d21b22`. MERV 8 / Carbon / 13 galleries follow the same recipe as their home tiles.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-355 — Shopper navy fills were a tad too dark
- **Status:** fixed
- **Area:** photos
- **Symptom:** Header, footer, brand bands, size-page sky, sizing-guide hero, clock chassis, and `bg-deep` tiles sat on `#141e30` / `#1a3058` / `#1b3258` / `#203868`. The measure-guide band read too dark.
- **Do NOT:** Paint those fills back to `#141e30`, `#1a3058`, `#1b3258`, or `#0c121c`. Do not lighten `--navy` / `--deep` text, `color: #141e30`, or email-brand `#203868`.
- **Do:** Backgrounds use `--navy-fill` `#264478` and `--deep-fill` `#1e3a66` (and Tailwind `bg-navy-fill` / `bg-deep-fill`). Mesh `#3a66a3` and ice stay. Type stays `--navy` / `--deep`.
- **Files:** `client/src/index.css`, `client/src/components/HowToMeasureGuide.tsx`, `client/src/components/HowToReplaceGuide.tsx`, `client/src/components/FilterPower.tsx`, `client/src/components/TrustMarquee.tsx`, `client/src/components/CarouselDots.tsx`, `client/src/pages/FilterChangeGuide.tsx`
- **Verify:** `/` header + hero + marquee; `/sizes/20x25x1` measure-guide band; `/how-often-to-change-air-filter`; Filter Clock. Copy on white is still `#141e30`.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-354 — Size-page gallery MERV fill was too loud
- **Status:** fixed
- **Area:** photos
- **Symptom:** After FH-353 the left gallery used the raw badge (`#d21b22` / `#ee9e10` / `#3a66a3` / `#111111`) as the full panel. MERV 11 and 13 read as neon slabs.
- **Do NOT:** Set `.product-theater` `background-color` to `var(--pdp-glow)` at 100%. Do not put the wash back in one corner (FH-353).
- **Do:** Full-panel wash mixed into navy — about 34% badge over `#1a3058` / `#1e3a66`. Same `--pdp-glow` from `selectedType.badgeColor`.
- **Files:** `client/src/index.css`
- **Verify:** `/sizes/20x25x1` — MERV 8, Carbon, 11, 13. Whole gallery tints that color, muted, not a raw fill.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-353 — Size-page gallery color lived in one corner
- **Status:** fixed
- **Area:** photos
- **Symptom:** On `/sizes/…` the MERV wash (`--pdp-glow`) sat in the top-right of `.product-theater` over navy. MERV 11 looked like a red corner, not a red panel. Same for MERV 8 blue, MERV 13 gold, and Carbon black.
- **Do NOT:** Put the glow back as `ellipse … at 80% 10%` over `#1e3a66` / `#1a3058`. Do not hard-code one MERV color on the theater.
- **Do:** `.product-theater` fills with `var(--pdp-glow)` from `selectedType.badgeColor` (MERV 8 `#3a66a3`, 11 `#d21b22`, 13 `#ee9e10`, Carbon `#111111`). Glow covers the full panel.
- **Files:** `client/src/index.css`, `client/src/pages/SizeDetail.tsx`
- **Verify:** `/sizes/20x25x1` — click MERV 8, Carbon, 11, 13. Left gallery is that color throughout, not a corner blob.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-352 — Overdue repair and wait-stage cards were too dark
- **Status:** fixed
- **Area:** photos
- **Symptom:** Home `#overdue-costs` repair rows and “1–2 months late” cards sat on `#141e30` / `rgba(8, 14, 26)` glass. Copy looked black-on-navy and words ran together.
- **Do NOT:** Put those chips back on `bg-deep`, `bg-navy/80`, or `rgba(8, 14, 26, 0.38)`. Do not use negative letter-spacing on the repair names.
- **Do:** Rows and wait-stage cards stay on ice glass / `#3a66a3`–`#2a4d82` (FH-346 band). Same classes on the change-guide curve and the size-page named-repair list.
- **Files:** `client/src/index.css`, `client/src/components/OverdueCostsBand.tsx`, `client/src/pages/FilterChangeGuide.tsx`
- **Verify:** Home `#overdue-costs` and `/how-often-to-change-air-filter#wait` — chips read mid-blue, not near-black. `/sizes/20x25x1` list rows match.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-351 — Live shop was still FILTER-HERO without the qty ladder
- **Status:** fixed
- **Area:** other
- **Symptom:** `https://filterhero.net` ran `Tilo-Syntiv/FILTER-HERO@1895e06` (182 sizes, no Qty/Each/Savings card). Official local had the ladder and 153/293 catalog.
- **Do NOT:** `railway up` a dirty Official tree. Do not add a second Railway service or region. Do not retarget back to `FILTER-HERO@main` unless rolling this deploy back.
- **Do:** Production source is `Tilo-Syntiv/Filter-Hero-OFFICIAL@main`. Same FILTER-HERO service, `/data`, and `filterhero.net`. Push Official `main` to deploy. FH-304’s “deploy only from FILTER-HERO” is superseded.
- **Files:** `.railway/config.json`
- **Verify:** Railway latest SUCCESS `becad96a` is Official `24597f6`. `GET /api/products` is `sellableOnly: true`, `sizeCount: 153`. `/sizes/20x25x1` ladder is `$9.99 / $9.99 / $8.37 / $7.49 / $5.88`. Homepage `#merv` is from `$9.99 / $16.70 / $13.49 / $22.99`.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-350 — Size page card hung below the Add to Cart button
- **Status:** mitigated
- **Area:** photos
- **Symptom:** On `/sizes/…` the pack photo plus the overdue panel ran past the buy column, so a white band sat under the red Add to Cart button.
- **Do NOT:** Put `.product-shot` back to `28rem` or give `.product-shot-wrap` a 16rem min-height. Do not leave `.product-overdue-hero` unstyled — an unstyled comparison stacks and pushes the card down again.
- **Do:** Pack photo stays `min(100%, 22rem)`. The comparison stays one row. The card bottom sits with the Add to Cart button (card padding only).
- **Files:** `client/src/index.css`
- **Verify:** `/sizes/20x25x1` at 1280px — space under Add to Cart is about the buy-column padding, not a tall empty band.
- **Added:** 2026-09-21

### FH-349 — Cart restore put the bottom drawer back
- **Status:** fixed
- **Area:** cart
- **Symptom:** After the side panel was reported as changed, the cart was restored as the bottom drawer. The shopper drawer is the right-hand panel.
- **Do NOT:** Put the bottom drawer back. FH-348 is superseded.
- **Do:** Cart opens from the right. Navy header, white line cards, size-page quantity stepper, burgundy Checkout, navy Request a quote. Header and footer stay short so the filters stay visible.
- **Files:** `client/src/components/CartDrawer.tsx`, `client/src/index.css`
- **Verify:** Open the cart. It is a right-hand panel, not a sheet from the bottom.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-348 — Right-hand cart restyle replaced the shopper drawer
- **Status:** fixed
- **Area:** cart
- **Symptom:** The cart became a full-height navy side panel. Shoppers lost the bottom drawer: bag icon, line rows, round quantity buttons, and the outline quote button.
- **Do NOT:** Turn the cart into a right-hand drawer again. Do not replace the quantity buttons with the size-page stepper.
- **Do:** Cart stays the bottom drawer. Title is `Your cart (count)`. Checkout is the burgundy shop button. Quote stays an outline button. Shipping still says At checkout.
- **Files:** `client/src/components/CartDrawer.tsx`
- **Verify:** Open the cart. It rises from the bottom. Quantity buttons are the round outline pair.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-347 — verify:json expected no 0.5-inch ticket after Filter King ladders returned
- **Status:** fixed
- **Area:** pricing
- **Symptom:** After FH-342 restored Filter King undercut, `pnpm verify:json` failed `prices:n-alias-scraped`. The check still wanted `liveUnitPrice(10x30x0.5 MERV 11 qty 1)` to be `undefined` (Filtrete-only). The scraped `10x30x0.5n` ladder is **$49.48**.
- **Do NOT:** Treat a 0.5-inch Filter King scrape as a Filtrete ticket. Do not drop trailing `n` from catalog slugs (FH-195).
- **Do:** `prices:n-alias-scraped` is **$49.48**. 1-inch qty 1 stays Filtrete when cheaper.
- **Files:** `scripts/verify-json.ts`
- **Verify:** `pnpm verify:json`. `prices:n-alias-scraped` is $49.48.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-346 — Product overdue card was a dark box, not the page-hero band
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Size PDPs, thickness hubs, brand pages, and custom quote showed “Skip a change?” as a small dark-navy inset. The original page uses the brand-band blue, a large white headline, and a white subtitle.
- **Do NOT:** Put `.product-overdue` back on a deep `#141e30` fill, shrink the headline under 2rem, or paint the subtitle ice. Do not drop the five `HVAC_REAL_REPAIRS` rows, the DOE line, the filter-vs-repair punch, or the change-guide link.
- **Do:** Keep `.product-overdue` on the brighter brand-band blue (`#2a4d82` → `#3a66a3`) with the page-hero glow, ice kicker, large white headline, and `rgba(255,255,255,0.7)` subtitle. Dollar amounts stay `#f7c9cb`.
- **Files:** `client/src/components/ProductOverduePanel.tsx`, `client/src/index.css`
- **Verify:** `/sizes/20x25x1` theater card and `/sizes` sheet card — headline scale and blue match the home overdue band header.
- **Added:** 2026-09-21

### FH-345 — Homepage cards advertised a 12x12x1 12-pack
- **Status:** fixed
- **Area:** pricing
- **Symptom:** After FH-342, “What should your filter catch?” and `liveFromPrice` scanned every sellable SKU × pack qty. Standard showed **from $4.96** (12x12x1 ×12 Filter King). Hero packs still open `/sizes/20x25x1`, where qty 1 is **$9.99 / $13.49 / $22.99 / $16.70**. Added to Cart sent `AddedItemPrice` as the qty-1 ticket even when the shopper added a 6-pack.
- **Do NOT:** Scan every XLS SKU with `unitPriceForQty` to set `MERV_TYPES.fromPrice`. Do not advertise a 12-pack of a different size as the MERV card price. Do not send Klaviyo `AddedItemPrice` as `product.price` when qty > 1.
- **Do:** Cards, hero pack tickets, and `liveFromPrice` are 20x25x1 qty 1 (`$9.99` / `$13.49` / `$22.99` / `$16.70`). Size-page ladders, cart, Stripe, and JSON-LD stay on `liveUnitPrice` (cheaper of Filtrete / Filter King / FilterBuy). Klaviyo Added to Cart uses `unitPriceForQty`. “Best value” is the cheapest ladder row, not hardcoded qty 12.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `client/src/components/Hero.tsx`, `client/src/pages/SizeDetail.tsx`, `client/src/lib/klaviyo.ts`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. Homepage `#merv` is **from $9.99 / $13.49 / $22.99 / $16.70**. Hero tickets match. `/sizes/20x25x1` MERV 8 qty 1 is **$9.99**, qty 6 is **$7.49**. Cart line matches the pack unit.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-344 — Cart header and checkout block hid the filters
- **Status:** fixed
- **Area:** cart
- **Symptom:** The navy cart header and the email / button footer were tall enough that a shopper with several lines could barely see the filters they were buying.
- **Do NOT:** Restore the Checkout kicker, the two-line header sentence, the 1.85rem subtotal, or the full-height slanted buttons inside the cart footer.
- **Do:** Header is title, count, and one short line. Footer keeps subtotal, shipping, email, opt-in, Stripe, and quote, in a shorter stack. The filter list is what grows.
- **Files:** `client/src/components/CartDrawer.tsx`, `client/src/index.css`
- **Verify:** Open the cart with several lines. Header and footer are short. More than one filter card is visible above the subtotal.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-343 — Cart and checkout pages looked like a generic sheet
- **Status:** fixed
- **Area:** cart
- **Symptom:** The cart was a light bottom sheet with circular qty buttons, and `/checkout/success` and `/checkout/cancel` were plain centered pages. They did not use the navy band, white cards, pack stepper, or slanted shop buttons.
- **Do NOT:** Put the cart back on a bottom sheet. Do not restyle checkout result pages as a logo-and-paragraph on the gray canvas. Do not promise free shipping in the drawer.
- **Do:** Cart opens from the right with a navy header band, white line cards, the size-page qty stepper, and burgundy / navy slanted actions. Success and cancel use the same band and white card as sign-in, with the site header so the saved cart is still reachable.
- **Files:** `client/src/components/CartDrawer.tsx`, `client/src/pages/CheckoutSuccess.tsx`, `client/src/pages/CheckoutCancel.tsx`, `client/src/index.css`
- **Verify:** Open the cart from a size page. Qty stepper, email, Checkout with Stripe, and Request a quote all fit. `/checkout/cancel` shows the navy band and the header cart.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-342 — Official shopper tickets drifted from FILTER HERO
- **Status:** fixed
- **Area:** pricing
- **Symptom:** Official `liveUnitPrice` was Filtrete-only. FILTER HERO charges the cheaper of Filtrete and Filter King × 0.90, then a confirmed FilterBuy ticket if that is cheaper. `/sizes/20x25x1` MERV 8 qty 6 was **$9.17** here and **$7.49** on FILTER HERO.
- **Do NOT:** Drop Filter King undercut or FilterBuy match from the shopper formula. Do not invent pack prices. Do not use API `unit_price` or Excel Sale Price as the ticket.
- **Do:** Same `liveUnitPrice` as FILTER HERO. Qty 1 stays Filtrete when that is cheaper (`$9.99` / `$13.49` / `$22.99` / `$16.70`). Pack rungs match the cheaper listing. Thick sizes use FilterBuy when that listing undercuts.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. `/sizes/20x25x1` MERV 8 qty 6 is **$7.49**. Qty 1 is **$9.99**. `/sizes/16x25x1` MERV 8 qty 12 is **$5.83**. `/sizes/20x25x4` MERV 8 qty 1 is **$30.59**.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-341 — 12-pack jumped back to the single after a cheaper 6-pack
- **Status:** fixed
- **Area:** pricing
- **Symptom:** `/sizes/20x25x1` MERV 8 qty 6 was **$9.17**, qty 12 was **$9.99**. No Filtrete 12-pack exists for that size, so the engine fell back to the single. “Best value” charged more per filter than “Most popular.”
- **Do NOT:** Invent a Filtrete 12-pack. Do not put Filter King sale or FilterBuy on the ladder. Do not let a higher qty cost more per filter than a lower qty.
- **Do:** `filtreteBeatUnit` walks 2 / 4 / 6 / 12 and keeps the last confirmed Filtrete pack this qty already unlocked, then caps at the single. 20x25x1 MERV 8 qty 12 stays **$9.17**. 16x25x1 MERV 8 qty 12 stays the real Filtrete 12-pack **$5.83**.
- **Files:** `shared/pricing/engine.ts`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. `/sizes/20x25x1` ladder 12+ is $9.17. `/sizes/16x25x1` 12+ is $5.83.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-340 — Admin console said Staff
- **Status:** fixed
- **Area:** other
- **Symptom:** `/admin` chrome, sign-in, nav, document title, Security, Tracking, and SEO called the console **Staff**.
- **Do NOT:** Relabel the admin UI as Staff. Do not rename `STAFF_EMAILS`, `requireStaff`, or shopper `/login`.
- **Do:** Shoppers see **Admin sign in** and **Admin console**. Nav allowlist is **Admin**. Signed-in titles are `… · Admin · Filter Hero`. `STAFF_EMAILS` stays the env allowlist.
- **Files:** `client/src/pages/admin/AdminShell.tsx`, `client/src/pages/admin/Login.tsx`, `client/src/pages/admin/nav.ts`, `client/src/pages/admin/Users.tsx`, `client/src/pages/admin/Security.tsx`, `client/src/App.tsx`, `server/admin/data.ts`, `server/auth.ts`, `shared/seo.ts`, `scripts/verify-admin.ts`, `scripts/click-ui.ts`, `scripts/click-admin.ts`
- **Verify:** `pnpm verify:admin`. Local `/admin` heading **Admin sign in**. Sidebar **Admin console**.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-339 — Shopper surfaces still named Filter King
- **Status:** fixed
- **Area:** seo
- **Symptom:** Home hero lede said “Filter Hero's Filter King filters.” `/sizes` said “Browse every Filter King HVAC size.” Every PDP had **Matching Filter King page** → filterking.com. `/llms.txt` named the Filter King API.
- **Do NOT:** Restore a Filter King word, lockup, or filterking.com link on the storefront, JSON-LD, `/llms.txt`, or site-config hero lede. Do not scrape filterking.com. Do not put Filter King sale as the shopper price.
- **Do:** Shopper copy is Filter Hero only. Keep Filter King API, `filterKingUrl`, `parent_model`, and catalog sync. Never render those on the storefront, JSON-LD, `/llms.txt`, or hero lede.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/pages/SizeBrowse.tsx`, `shared/site-config.ts`, `server/data/site-config.json`, `shared/seo.ts`, `scripts/verify-store.ts`, `scripts/click-ui.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:store`. `/` hero has no Filter King. `/sizes` has no Filter King. `/sizes/20x25x1` has no Matching Filter King page. `/llms.txt` has no Filter King.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-338 — Turnstile siteverify omitted remoteip
- **Status:** fixed
- **Area:** contact
- **Symptom:** Official `verifyTurnstile` posted only `secret` + `response` to Cloudflare `siteverify`. Production `POST /api/contact` never sent `remoteip`, so the check could not bind the token to the shopper behind Railway (`trust proxy` = 1). FILTER HERO and `docs/CLOUDFLARE-FULL-BUILD.md` already pass `req.ip`.
- **Do NOT:** Parse `X-Forwarded-For[0]` for Turnstile or the limiter (FH-205). Do not call `siteverify` from the browser.
- **Do:** `submitContact(req.body, req.ip)`. `verifyTurnstile(token, ip)` sets `remoteip` when `req.ip` is present. Clock `intent=reminder` still skips the widget.
- **Files:** `server/security.ts`, `server/contact.ts`, `server/index.ts`, `scripts/verify-security.ts`
- **Verify:** `pnpm verify:security`. Source contains `submitContact(req.body, req.ip)` and `body.set("remoteip"`. `/` still has no Turnstile script until `#contact` is near.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-337 — Size page dropped the Qty / Each / Savings ladder
- **Status:** fixed
- **Area:** catalog
- **Symptom:** `/sizes/…` Select quantity was only − / 1–12 / +. Shoppers could not see pack unit prices or savings for 1, 2, 4, 6+, and 12+. Pack total still used live ladder rungs, but the table from FH-252 was gone.
- **Do NOT:** Leave a stepper-only qty control. Do not replace the volume ladder with a 12-chip grid. Do not squeeze the old pack cards beside the stepper.
- **Do:** One qty card: − / 1–12 / + on the left, Qty / Each / Savings ladder (1, 2, 4, 6+, 12+) on the right. Live ladder unit prices still apply (3 uses the 2-filter rung, 5 uses 4, 7–11 use 6, 12 uses 12). Default and “Most popular” stay 6; “Best value” stays 12. Pack stepper aria-labels are “Decrease/Increase pack quantity” so they do not collide with cart ±.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/index.css`, `shared/products.ts`, `scripts/verify-store.ts`, `scripts/click-ui.ts`
- **Verify:** `/sizes/20x25x1` — stepper 1–12 beside the 5-rung table. Pack total follows the matching rung. `pnpm verify:store`. `pnpm browse`.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21
- **Supersedes:** FH-252

---

### FH-336 — catalog_skus emptied after identity recreate
- **Status:** fixed
- **Area:** catalog
- **Symptom:** Hosted `catalog_skus` had 0 rows after migration `catalog_skus_identity` (`20260921164548`) dropped the first-cut commerce columns and recreated the table. `pnpm verify:supabase` failed: `catalog_skus must have 293 Model Pricing rows, got 0`. Shopper catalog still came from `sellable-skus.json`; staff SQL / account in-stock mirror was empty.
- **Do NOT:** Apply `0006_catalog_skus_identity.sql` and leave the table empty. Do not put wholesale cost, `list_price`, or API `unit_price` back on `catalog_skus`.
- **Do:** After that recreate, `syncSupabaseCatalog()` upserts identity only (id, size, MERV, image, Filter Hero URL, Filter King URL, parent_model). Count must match `sellableSheetProducts()`.
- **Files:** `supabase/migrations/0006_catalog_skus_identity.sql`, `scripts/lib/catalog-sync.ts`, `scripts/verify-supabase.ts`
- **Verify:** `pnpm verify:supabase`. Hosted `catalog_skus` count is 293. Anon still reads 0 rows.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-335 — Vite /api proxy dumped ECONNREFUSED while Express restarted
- **Status:** fixed
- **Area:** other
- **Symptom:** Local Vite (`http://localhost:3000`) proxied `/api/site-config`, `/api/klaviyo/config`, and `/api/track` at Express. While `tsx watch` restarted, the proxy logged `connect ECONNREFUSED 127.0.0.1:3001` and the browser saw a raw 500. Site config stayed on defaults until a full reload. Stale tabs from `FILTER HERO` also requested `/@fs/` paths outside this repo’s allow list.
- **Do NOT:** Allow `C:\Users\lazar\Downloads\Github\FILTER HERO` on `server.fs`. Do not put service-role keys in `VITE_` vars. Do not skip the fixed error JSON.
- **Do:** `server.fs.allow` is this repo root so `@shared` serves. `/api` (and sitemap/robots/llms) proxy errors return `{ error: "Something went wrong.", code: "internal_error" }`. `SiteConfigProvider` retries `/api/site-config` the same way `bootKlaviyo` retries config. Keep `DOTENV_CONFIG_PATH` in `vite.config.ts` (FH-329).
- **Files:** `vite.config.ts`, `client/src/contexts/SiteConfigContext.tsx`, `scripts/verify-admin.ts`
- **Verify:** `pnpm verify:admin`. `pnpm check`. Local `/` — Find my size → add to cart. `/login` is Sign in, not “not configured”. `/admin` is Staff sign in, not the VITE_ message. Pack shots and `/life/*.jpg` 200.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-334 — Admin Products table truncated the contractor sheet
- **Status:** fixed
- **Area:** catalog
- **Symptom:** Staff `/admin/catalog` advertised 293 sellable SKUs, then rendered the first 80. Searching a wholesale SKU returned nothing. Featured-size fallback used a 12-slug list that matches neither the header (8) nor the carousel (16).
- **Do NOT:** Default the admin catalog snapshot to 80 rows. Do not search only size/name/id. Do not invent a third featured-size default of 12.
- **Do:** `/api/admin/catalog` returns every sellable-sheet SKU. Search matches size, name, MERV, id, and wholesale SKU. Empty featured sizes use `popularSizeSlugs(8)`, same as the header.
- **Files:** `server/admin/data.ts`, `client/src/pages/admin/Catalog.tsx`, `client/src/pages/admin/Overview.tsx`, `scripts/verify-admin.ts`, `scripts/smoke-admin.ts`, `scripts/click-admin.ts`
- **Verify:** `pnpm verify:admin`. `pnpm smoke:admin`. `pnpm browse:admin`. Products footer is `Showing 293 of 293` (or current sheet count), not 80 of 293.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-333 — MERV cards used cheapest pack, not that rating’s Filtrete 1-pack
- **Status:** fixed
- **Area:** pricing
- **Symptom:** Homepage “What should your filter catch?” advertised Standard **from $5.18** (20x20x1 12-pack), MERV 11 **from $11.00**, MERV 13 **from $15.00**, Carbon **from $16.70**. Hero packs link to `/sizes/20x25x1`, where qty 1 is $9.99 / $13.49 / $22.99 / $16.70. Three Filtrete 4-packs ($10.05 / $11.50 / $11.49) also cost more per filter than the $9.99 single.
- **Do NOT:** Set `MERV_TYPES.fromPrice` to the cheapest `FILTRETE_PACKS` rung across sizes. Do not charge a pack unit above that rating’s Filtrete qty-1 ticket. Do not use Filter King sale or FilterBuy as the card or pack price.
- **Do:** `liveFromPrice` is `FILTRETE_1INCH_QTY1` for that rating. Cards, `/sizes/20x25x1` qty 1, cart, Stripe `price_data`, JSON-LD, and Klaviyo item price share that ticket. Confirmed packs that beat the single stay; packs that cost more per filter cap at the single.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `client/src/pages/SizeDetail.tsx`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. Homepage MERV cards are **from $9.99 / $13.49 / $22.99 / $16.70**. `/sizes/20x25x1` qty 1 matches those. `/sizes/16x25x1` MERV 8 qty 4 is $9.99, not $10.05.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-332 — Unknown /api routes returned Express HTML (live GET was SPA 200)
- **Status:** fixed
- **Area:** other
- **Symptom:** `GET /api/does-not-exist` on `https://filterhero.net` returned the shop HTML with **200** because production `app.get("*")` served `index.html` for every unmatched GET, including `/api/*`. `POST /api/does-not-exist` (local and live) returned Express’s default `<pre>Cannot POST /api/does-not-exist</pre>`. Unsigned Stripe webhooks still stack-dumped `Missing stripe-signature header` on every smoke/probe.
- **Do NOT:** Let unmatched `/api` fall through to the SPA or Express HTML. Do not log expected missing/invalid Stripe signatures as `[stripe webhook]` errors.
- **Do:** After CRM/account/admin/Intuit routers, `apiNotFound` answers JSON `{ code: "not_found" }` 404. Production and dev document catch-alls skip `isApiPath`. Expected webhook rejects stay 400 `webhook_failed` without a stack.
- **Files:** `server/index.ts`, `server/security.ts`, `scripts/verify-security.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:security`. `pnpm smoke`. Local `GET`/`POST /api/does-not-exist` is 404 JSON `not_found`, not HTML. After deploy, live GET `/api/does-not-exist` matches.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-331 — Live PDP has no Filter King link; speakable URL is still home
- **Status:** open
- **Area:** catalog | seo
- **Symptom:** Official local `/sizes/20x25x1` shows **Matching Filter King page** → `https://filterking.com/air-filter-sizes-20x25x1-merv-8` and `#jsonld-page` WebPage.url is `https://filterhero.net/sizes/20x25x1`. Live `https://filterhero.net/sizes/20x25x1` has `$9.99` and Add to cart but no filterking.com anchor; SPA speakable URL is `https://filterhero.net/`. Railway still serves `Tilo-Syntiv/FILTER-HERO@1895e06`.
- **Do NOT:** Scrape filterking.com. Do not `railway up` this Official tree while GitHub watches FILTER-HERO (FH-304).
- **Do:** Merge/deploy Official SizeDetail (Filter King link + `{ path: seo.path }` speakable) onto the live FILTER-HERO main build. Until then constructed PDP URLs only exist locally.
- **Files:** `client/src/pages/SizeDetail.tsx`, `shared/filterking.ts`
- **Verify:** Live `/sizes/20x25x1` has the Filter King link. `#jsonld-page` WebPage.url is `https://filterhero.net/sizes/20x25x1`.
- **Added:** 2026-09-21

---

### FH-330 — Turnstile loaded on every homepage view again
- **Status:** fixed
- **Area:** contact
- **Symptom:** Official `TurnstileField` called `turnstile.render` as soon as the contact/custom-quote forms mounted, so `/` logged hidden `challenges.cloudflare.com` `NaN` errors before the shopper reached `#contact`. A successful send did not reset the widget, so the next submit could reuse a spent token. Site-key forms also posted without reading `turnstile.getResponse()`.
- **Do NOT:** Call `render` before the field is near the viewport. Do not omit `error-callback`. Do not skip `readTurnstileToken()` / a client-side empty-token block when `VITE_TURNSTILE_SITE_KEY` is set.
- **Do:** Mount the explicit widget only when the host is within ~200px of the viewport. Always-visible flexible light widget, expire/timeout reset, handled `error-callback`. Reset via `resetSignal` after a successful send. Client blocks send without a token when the site key is set.
- **Files:** `client/src/components/TurnstileField.tsx`, `client/src/components/ContactForm.tsx`, `client/src/components/CustomQuoteForm.tsx`, `scripts/verify-security.ts`
- **Verify:** `/` — no Turnstile script until `#contact` is near. `/#contact` and `/custom-air-filters` show the widget. `pnpm verify:security`. Homepage console has no `challenges.cloudflare.com` `NaN` before scrolling to contact.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-329 — Local /admin asked to set VITE_SUPABASE even with CRM on
- **Status:** fixed
- **Area:** other
- **Symptom:** `http://localhost:3000/admin` rendered “Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the dev server.” Express had CRM on (`DOTENV_CONFIG_PATH` → IMPORTANT PAPERS `.env`). Vite `envDir` only reads the repo `.env`, which this workspace does not have, so `isAdminConfigured()` was false. `/login` would say customer login is not configured.
- **Do NOT:** Put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` var. Do not commit `.env`. Do not add `/admin` to the shop header.
- **Do:** `vite.config.ts` loads `DOTENV_CONFIG_PATH` before the client bake so the same file Express uses supplies `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Staff sign-in is magic link + OTP.
- **Files:** `vite.config.ts`, `scripts/verify-admin.ts`, `scripts/click-ui.ts`
- **Verify:** `pnpm verify:admin`. Local `/admin` heading **Staff sign in**, not the VITE_ message. `pnpm smoke`.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-309 — Staff console matches FILTER HERO; issues log imported
- **Status:** fixed
- **Area:** other
- **Symptom:** Staff could not find an Admin link on the shop. `Filter-Hero-OFFICIAL` already had FILTER HERO’s `/admin` console (overview, quotes, contacts, orders, customers, catalog, content, analytics, tracking, staff, security, settings, maintenance) but the public header never links it. The Official issues log had diverged (same FH ids, different bugs) from `C:\Users\lazar\Downloads\Github\FILTER HERO\docs\ISSUES-AND-FIXES.md`.
- **Do NOT:** Put `/admin` in the shop header, footer, or sitemap. Do not index `/admin`. Do not reuse FILTER HERO FH ids for Official-only bugs.
- **Do:** Open `https://filterhero.net/admin` (local `http://localhost:3000/admin`). Staff magic link + OTP, `STAFF_EMAILS`. Keep FILTER HERO’s staff console modules behind `requireStaff`. This file is FILTER HERO’s log through FH-308, then Official-only follow-ups from FH-310.
- **Files:** `client/src/pages/admin/`, `server/admin/`, `client/src/lib/admin-api.ts`, `docs/ISSUES-AND-FIXES.md`
- **Verify:** `pnpm verify:admin`. `GET /admin` 200 Staff sign in. `robots.txt` Disallow `/admin`.
- **Added:** 2026-09-21
- **Fixed:** 2026-09-21

---

### FH-310 — MERV cards advertised PACK_TIERS “from $2.31”
- **Status:** fixed
- **Area:** pricing
- **Official log was:** FH-266
- **Symptom:** Homepage “What should your filter catch?” said Standard **from $2.31**, Carbon **from $6.09**, MERV 11 **from $2.94**, MERV 13 **from $3.36**. Those were `PACK_TIERS` 12-pack multipliers on 0.5″ list prices, not Filtrete tickets. 20x25x1 qty 1 is still $9.99; qty 6 is $9.17.
- **Do NOT:** Scan every XLS SKU with `unitPriceForQty` / `PACK_TIERS` to set `MERV_TYPES.fromPrice`. Do not use Filter King sale or FilterBuy undercut as the card price.
- **Do:** `cardFromPrice` is `liveFromPrice` (Filtrete qty 1 + `FILTRETE_PACKS` only). Cards match the cheapest shopper unit on those rungs.
- **Files:** `shared/products.ts`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. Homepage MERV 8 card is not $2.31. Local `/sizes/20x25x1` qty 6 is $9.17 / $55.02. Cart shipping says At checkout.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-311 — Local Klaviyo onsite still posted HTTP and CORS-failed
- **Status:** fixed
- **Area:** other
- **Official log was:** FH-265
- **Symptom:** `http://127.0.0.1:3000` loaded Klaviyo.js, which posted to `http://a.klaviyo.com/client/events`. Chrome blocked the CORS preflight (HTTP 301 to HTTPS). Dev CSP named only `http://*.klaviyo.com`; Chrome drops that wildcard. `/api/identify` still wrote. Production HTTPS was fine.
- **Do NOT:** Add plaintext Klaviyo to production CSP. Do not skip `/api/identify`.
- **Do:** `patchKlaviyoHttpsClient()` before injecting onsite JS (upgrade `fetch` / `XMLHttpRequest` / `sendBeacon` to HTTPS on Klaviyo hosts). Development CSP names `http://a.klaviyo.com` as well as the wildcard.
- **Files:** `client/src/lib/klaviyo.ts`, `shared/security-headers.ts`, `scripts/verify-security.ts`
- **Verify:** `pnpm verify:security`. Local PDP console has no `http://a.klaviyo.com` CORS error after a full reload. Production CSP still has no `http://*.klaviyo.com`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-312 — Measure diagram animated opacity from undefined
- **Status:** fixed
- **Area:** measure
- **Official log was:** FH-264
- **Symptom:** Homepage console warned that tape-diagram edge glows animated opacity from `undefined` to `1` / `0.18` / `0.22`.
- **Do NOT:** Animate Framer `opacity` without an `initial` number.
- **Do:** Width / Length / Depth `motion.line` glows set `initial` to the same opacity as `animate`.
- **Files:** `client/src/components/MeasureFilterDiagram.tsx`
- **Verify:** Homepage — no “value-not-animatable” warning from the measure diagram. Measure still highlights the active edge.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-313 — Cart email did not identify until Checkout
- **Status:** mitigated
- **Area:** cart
- **Official log was:** FH-263
- **Symptom:** Abandon-from-cart needs an identified profile. The cart email field only called `identifyShopper` on **Checkout with Stripe**. Typing an email and leaving never wrote onsite identify or `POST /api/identify`, so Klaviyo could not attach **Added to Cart** to a person. Local smoke also did not fail if `catalog.json` drifted off 293.
- **Do NOT:** Wait until Stripe Checkout to identify. Do not subscribe clock saves. Do not fire `/api/track` for Placed Order from the browser.
- **Do:** Identify (onsite + `/api/identify`) when a valid cart email blurs, and again on Checkout. Local smoke asserts Model Pricing catalog.json is 293 SKUs. Invalid contact may 400 or 429 `rate_limited_contact`. `pnpm browse` ignores HTTP-localhost Klaviyo CORS (`a.klaviyo.com` 301).
- **Files:** `client/src/components/CartDrawer.tsx`, `scripts/smoke-site.ts`, `scripts/click-ui.ts`
- **Verify:** `pnpm smoke`. Local `/api/klaviyo/config` `{ enabled: true, publicKey: "VnVNmQ" }`. Cart email blur → `POST /api/identify`. `pnpm verify:klaviyo`. `pnpm browse`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-314 — Toaster still imported next-themes
- **Status:** fixed
- **Area:** header
- **Official log was:** FH-262
- **Symptom:** `client/src/components/ui/sonner.tsx` used `next-themes` instead of the Vite `ThemeContext`, and did not portal onto `document.body`, so `pnpm verify:admin` failed and drawer toasts could stay hidden.
- **Do NOT:** Import `next-themes` in the shop toaster. Do not render the toaster inside a drawer stacking context.
- **Do:** `useTheme` from `@/contexts/ThemeContext`. `createPortal(..., document.body)`.
- **Files:** `client/src/components/ui/sonner.tsx`
- **Verify:** `pnpm verify:admin`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-315 — Header popular chips ignored staff featured sizes
- **Status:** fixed
- **Area:** header
- **Official log was:** FH-261
- **Symptom:** Shop mega and the phone drawer hardcoded `popularSizeSlugs(8)`, so `/admin/content` featured sizes never appeared and `pnpm verify:admin` failed.
- **Do NOT:** Hardcode an 8-size slice of `popularSizeSlugs(16)` in the header. Do not leave the chips on a module-level constant.
- **Do:** `featuredSizesFromConfig(featuredSizeSlugs, 8)` from site config. Empty list still falls back to the 8 popular defaults.
- **Files:** `client/src/components/SiteHeader.tsx`
- **Verify:** `pnpm verify:admin`. Homepage Shop menu shows eight popular size chips.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-316 — Order confirmation listed raw product ids
- **Status:** fixed
- **Area:** contact
- **Official log was:** FH-260
- **Symptom:** Resend order HTML said `2 × product 1` and always used the MERV 8 pack shot, even for MERV 13 or Carbon.
- **Do NOT:** Print catalog ids in shopper mail. Do not hardcode `packShotSrc(8)` for every order.
- **Do:** Resolve `getProductById` to `qty × size MERV n` (or Carbon) and `packShotSrc` from the first line.
- **Files:** `server/mailer.ts`, `scripts/verify-resend.ts`
- **Verify:** `pnpm verify:resend`. Confirmation HTML includes `20x25x1 MERV 8` and `merv-8-packshot`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-317 — Shop mega Brands grid always expanded
- **Status:** fixed
- **Area:** header
- **Official log was:** FH-259
- **Symptom:** Shop mega and the phone drawer always showed the full Brands family grid under All sizes, so the menu was a long brand directory.
- **Do NOT:** Restore a top-level Brands tab (FH-319). Do not drop Brands from Shop. Do not leave the family grid open by default.
- **Do:** Brands is a collapsed disclosure under All sizes. Click **Brands** to expand `BrandFamilyGrid` + Every brand. Desktop mega and mobile drawer share `ShopBrandsFold`. Phone toggle stays a 44px tap target.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/index.css`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. Homepage desktop — hover Shop, Brands is a closed row; click Brands, Trane / Carrier families appear; Every brand still works. Phone drawer matches.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-318 — Named-repair overdue panel missing from product catalog pages
- **Status:** fixed
- **Area:** catalog
- **Official log was:** FH-258
- **Symptom:** `/sizes/{slug}` had the original `.product-overdue` five-repair card, but thickness hubs, the size catalog, brand shop pages, custom quote, and off-catalog size PDPs did not.
- **Do NOT:** Restore `.pdp-overdue` or a local iced-coil `$150–$500` list. Do not duplicate repair copy outside `ProductOverduePanel` / `shared/hvac-overdue-costs.ts`.
- **Do:** One `ProductOverduePanel` on catalog size PDPs, off-catalog size PDPs, `/sizes`, `/filters/{d}-inch`, `/brands/{slug}`, and `/custom-air-filters`. Kicker “Skip a change?”. Headline “A dirty filter costs more than the filter.” Five `HVAC_REAL_REPAIRS`. Punch uses the selected unit price on a size PDP, else `$9.99`.
- **Files:** `client/src/components/ProductOverduePanel.tsx`, `client/src/pages/SizeDetail.tsx`, `client/src/pages/SizeBrowse.tsx`, `client/src/pages/BrandBrowse.tsx`, `client/src/pages/CustomAirFilters.tsx`, `client/src/index.css`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. `/sizes/20x25x1`, `/filters/1-inch`, `/sizes`, `/brands/trane`, `/custom-air-filters` all list thaw `$150–$450` through heat exchanger `$1,000–$3,000`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-319 — Brands moved under Shop; How-to took its tab
- **Status:** fixed
- **Area:** header
- **Official log was:** FH-256
- **Symptom:** Desktop primary nav was Shop / Brands / FILTER CLOCK / Contact. Brands belonged with sizes. How-to photos and upcoming videos had no tab next to Shop.
- **Do NOT:** Restore a top-level Brands mega. Do not put How-to inside the size finder. Do not drop the Measure chip (FH-032). Do not put Shop / How-to / Clock / Contact back in the phone header bar (FH-206).
- **Do:** Primary nav is Shop, How-to, FILTER CLOCK, Contact, Measure. Shop mega lists Brands (grid + Every brand) immediately under All sizes. How-to mega opens measure, swap (`#how-to`), and the change-guide photo/video home (`/how-often-to-change-air-filter`). Mobile drawer matches.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/components/BrandDirectory.tsx`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. Homepage — hover Shop, Brands is under All sizes; How-to is the next tab; FIND still works.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-320 — Receded flyer was still hiding behind the hero packs
- **Status:** fixed
- **Area:** photos
- **Official log was:** FH-255
- **Symptom:** `character-fly-still.png` sat in `.hero-sky-fill` at 12% opacity behind the MERV lineup, so the cape read as a ghost in the navy.
- **Do NOT:** Remount `character-fly-still.png`, `HeroFlight`, or a looping fly clip on the first-screen stage. Do not drop the lockup flyer beside FILTER HERO.
- **Do:** Hero stage is chrome navy + pack lineup + lockup mascot only. Atmosphere orbs may stay faint. Lockup stays `/hero/lockup-mascot.png` at sign height.
- **Files:** `client/src/components/Hero.tsx`, `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`. Homepage — no character silhouette behind the packs.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-321 — Hero four-pack still showed Filter King wordmarks
- **Status:** fixed
- **Area:** photos
- **Official log was:** FH-244
- **Symptom:** Home hero (and PDP pack shots) used Filter King 3D boxes — lion lockup, FILTER KING on the header, slanted tickets on FK art. Shopper-copy and UI FULL BUILD require Filter Hero branded packs with no Filter King wordmark on the stack.
- **Do NOT:** Copy Filter King website or API pack art onto `/hero/pack-merv*.png` or `/products/merv-*-packshot.png`. Do not run `scripts/label-pack-shots.py` over the official shots (it stamps Filter King). Do not put a Filter King wordmark on the four-pack.
- **Do:** Serve the Filter Hero identity stills from `E:\FILTER HEROE\PICTURES IN PROJECT` (`hero/pack-merv8.png`, `pack-merv11.png`, `pack-merv13.png`, `showcase-carbon.png` and matching `products/*-packshot.png`). Carbon uses `merv-carbon-packshot.png`. Bump `Hero` `ASSET` and `PACK_SHOT_REV` together.
- **Files:** `client/public/hero/pack-merv8.png`, `client/public/hero/pack-merv11.png`, `client/public/hero/pack-merv13.png`, `client/public/hero/showcase-carbon.png`, `client/public/products/merv-8-packshot.png`, `client/public/products/merv-11-packshot.png`, `client/public/products/merv-13-packshot.png`, `client/public/products/merv-carbon-packshot.png`, `client/src/components/Hero.tsx`, `shared/products.ts`
- **Verify:** `pnpm verify:store`. Homepage four-pack — no FILTER KING wordmark. `/sizes/20x25x1` pack shot matches. Carbon PDP uses `merv-carbon-packshot.png`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-322 — FILTER HERO test mode has Tax Settings but no registrations
- **Status:** open
- **Area:** other
- **Official log was:** FH-243
- **Symptom:** FILTER HERO (`acct_1U9bqlQEENEs0Qmw`) test-mode Tax Settings are `active` with a Miami head office, but tax registrations are empty. Checkout would enable `automatic_tax` and still charge **$0 tax** with no error.
- **Do NOT:** Create Stripe Tax registrations from code. Adding a Stripe row does not register Filter Hero with the state. Do not enable QBO Automated Sales Tax on top of Stripe Tax.
- **Do:** In Dashboard → Tax → Registrations (test mode), add each state already collecting after a tax advisor confirms. Local sandbox (`acct_1U9bqs790NnFGDLv`) staying `pending` is expected.
- **Files:** `shared/stripe-tax.ts`, `server/stripe.ts`, `scripts/verify-stripe-books.ts`
- **Verify:** `pnpm verify:stripe-books` against FILTER HERO test keys lists at least one `active` registration. A test Checkout to that state shows a tax line.
- **Added:** 2026-09-20

---

### FH-323 — Official Stripe install was missing ownership, tax gate, and Klaviyo native wiring
- **Status:** fixed
- **Area:** other
- **Official log was:** FH-242
- **Symptom:** `Filter-Hero-OFFICIAL` Checkout used `STRIPE_TAX=active`, labeled shipping “2–3 day delivery”, and had no `stripe-accounts` / `klaviyo-stripe` layer. Sandbox setup could still point a Dashboard endpoint at `filterhero.net`. Staff Settings had no Connect / Tax readiness.
- **Do NOT:** Point sandbox or FILTER HERO test-mode Dashboard endpoints at `https://filterhero.net/api/stripe/webhook`. Do not run `pnpm setup:klaviyo-stripe` on sandbox keys. Do not copy local `STRIPE_SECRET_KEY` onto Railway. Do not trigger welcome / abandon / replenish from Successfully Paid.
- **Do:** Shop fulfillment URL only on FILTER HERO **live**. Local uses sandbox + `stripe listen`. Native Klaviyo charge/invoice webhook only on FILTER HERO (test or live). Gate `automatic_tax` on Tax Settings `active`. Shipping option labeled **Shipping** with `txcd_92010001`.
- **Files:** `shared/stripe-accounts.ts`, `shared/klaviyo-stripe.ts`, `shared/stripe-tax.ts`, `server/stripe.ts`, `server/stripe-webhooks.ts`, `server/klaviyo-stripe.ts`, `scripts/setup-stripe-webhook.ts`, `scripts/setup-klaviyo-stripe.ts`, `client/src/pages/admin/Settings.tsx`
- **Verify:** `pnpm verify:stripe-books`. `pnpm debug:stripe-checkout` (sandbox). `pnpm verify:klaviyo`. Stripe MCP FILTER HERO test: Klaviyo URL present, shop URL absent.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-324 — Hero still looped a flight video and a Filter King now-at lockup
- **Status:** fixed
- **Area:** photos
- **Official log was:** FH-240
- **Symptom:** Live `Hero.tsx` played `character-fly-natural` video and stacked `fh-sells-fk.png` (“Filter King now at Filter Hero”) over the packs. Pack alts said Filter King. The mascot was a full-bleed flyer, not sign-height on the word Hero.
- **Do NOT:** Remount `HeroFlight` / `HeroSkyFlight`. Do not restore `fh-sells-fk.png`, overlapping fans, or a painted banner. Do not put `/hero/nav-icon.png` back as the shopper bar mark.
- **Do:** HTML stage. Atmosphere is the official still (`character-fly-still.png`) on chrome navy. Ice **Filter** + crimson **Hero** with mascot at sign height. Packs are Filter Hero shots with `?v=fh178`. Kicker/lede come from site-config.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `scripts/verify-store.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:store`. Homepage — no flight video, no now-at lockup, mascot on **Hero**, MERV 11 uses `pack-merv11.png`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-325 — Klaviyo setup templates still minted the ice wordmark
- **Status:** mitigated
- **Area:** other
- **Official log was:** FH-232
- **Symptom:** Live CODE templates already embed `https://filterhero.net/logo.png`, but `scripts/setup-klaviyo-account.ts` still built new library HTML with ice `#8eb0d8` wordmark text. A missing-template recreate would put the ice wordmark back. `map:klaviyo-metrics` also omitted `refunded_sales`.
- **Do NOT:** Send ice wordmark text (`color:#8eb0d8;font-weight:800;font-size:20px`) in place of the lockup. Do not click Save on Klaviyo “Review your brand”. Do not map revenue to Successfully Paid. Do not leave `refunded_sales` unmapped.
- **Do:** Setup HTML uses `emailLogoUrl()` at ~200×141. Metric mapping includes `refunded_sales` → Refunded Payment. Existing live templates stay as-is when the name already exists.
- **Files:** `scripts/setup-klaviyo-account.ts`, `scripts/map-klaviyo-metrics.ts`, `shared/email-brand.ts`
- **Verify:** `pnpm setup:klaviyo` then `pnpm map:klaviyo-metrics` then `pnpm verify:klaviyo`. Welcome D0 HTML contains `/logo.png` and no ice wordmark span. Mapped `refunded_sales` is Refunded Payment.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-326 — Filter King API credentials are not installed
- **Status:** open
- **Area:** catalog
- **Official log was:** FH-230
- **Symptom:** Finder archive still comes from the committed `filter-catalog.json` size list (9958 sizes). Railway and local `.env` have no `FILTERKING_CLIENT_ID` / `FILTERKING_CLIENT_SECRET`. `pnpm sync:filterking` exits without writing `shared/filterking-catalog.json`.
- **Do NOT:** Scrape filterking.com. Do not copy API `unit_price` onto PDP, cart, Checkout, JSON-LD, or Klaviyo. Do not prefix these keys with `VITE_`.
- **Do:** Apply at `https://filterking.com/api-onboarding`. Put server-only `FILTERKING_CLIENT_ID`, `FILTERKING_CLIENT_SECRET`, `FILTERKING_API_BASE=https://filterking.com` on Railway and local env. Then `pnpm sync:filterking` and persist `parent_model` + `filterKingUrl` on every size × MERV. Until then, constructed PDP URLs still apply: `https://filterking.com/air-filter-sizes-{size}-merv-{8|11|13}`.
- **Files:** `server/filterking.ts`, `scripts/sync-filterking-catalog.ts`, `shared/filterking.ts`, `.env.example`
- **Verify:** `GET /api/v1/get-all-parent-models` with a bearer token returns `sku_items[]`. `shared/filterking-catalog.json` has no `unit_price` / `cost` column.
- **Added:** 2026-09-20

---

### FH-327 — Official workspace is a verified copy of FILTER-HERO through Phase 3
- **Status:** fixed
- **Area:** catalog | pricing | contact | other
- **Official log was:** FH-229
- **Symptom:** `Filter-Hero-OFFICIAL` was an empty git remote. Identity, catalog layers, and the Express disk API lived only in `Tilo-Syntiv/FILTER-HERO`.
- **Do NOT:** Transfer `filterhero.net` off Squarespace. Do not orange-cloud apex, MX, or DKIM. Do not point `send.filterhero.net` at Klaviyo. Do not enable Resend receiving on `@`. Do not import `fk-contractor-commerce.csv`. Do not print Excel Sale Price or API `unit_price` as the shopper ticket.
- **Do:** Keep registrar at Squarespace, NS at Cloudflare (`ganz` / `marjory`), MX `smtp.google.com`, SPF `include:_spf.google.com`, inbox `info@filterhero.net`. Sellable list = Model Pricing XLS → `shared/pricing/model-pricing.csv`. Shopper tickets = `FILTRETE_1INCH_QTY1` / `FILTRETE_PACKS`. One Express process writes `leads.json` first.
- **Files:** `shared/pricing/model-pricing.csv`, `scripts/build-sellable-skus.ts`, `shared/pricing/engine.ts`, `server/index.ts`, `server/contact.ts`
- **Verify:** RDAP registrar Squarespace. `nslookup` MX `smtp.google.com`. Gmail receives at `info@filterhero.net`. `pnpm exec tsx scripts/build-sellable-skus.ts` → 293 SKUs / 153 sizes. `pnpm verify:store` passes (`list20x25x1: 9.99`). `POST /api/contact` writes `server/data/leads.json` with `emailed: false` when vendors are down.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-328 — Operating law was not in the repo
- **Status:** fixed
- **Area:** catalog | pricing | contact | seo
- **Official log was:** FH-228
- **Symptom:** Cursor rules, related briefs, Model Pricing importer, Filtrete-only tickets, branded Resend mailer, Filter King PDP links, and 2–3 day copy lived in IMPORTANT PAPERS, not in this project. Checkout still used Filter King/FilterBuy undercut and promised free shipping / a 30-day guarantee.
- **Do NOT:** Import `fk-contractor-commerce.csv` or the 2025 PDF. Do not scrape filterking.com. Do not put wholesale or API `unit_price` on Stripe, Klaviyo, or `catalog_skus`. Do not promise free shipping or a 30-day guarantee. Do not set `VITE_FULL_CATALOG=true` for checkout. Do not add a Klaviyo confirmation flow.
- **Do:** Keep `.cursor/rules/` + `RULES AND SKILLS.md` as session law. Sellable list = `shared/pricing/model-pricing.csv`. Shopper tickets = `FILTRETE_1INCH_QTY1` / `FILTRETE_PACKS`. Resend goes through `server/mailer.ts` + `shared/email-brand.ts`. Every sellable PDP stores `parentModel` + `filterKingUrl`. Delivery copy is 2–3 day.
- **Files:** `.cursor/rules/`, `.cursor/skills/`, `RULES AND SKILLS.md`, `shared/pricing/model-pricing.csv`, `scripts/build-sellable-skus.ts`, `shared/pricing/engine.ts`, `shared/email-brand.ts`, `server/mailer.ts`, `shared/filterking.ts`, `scripts/sync-catalog.ts`, `docs/ISSUES-AND-FIXES.md`
- **Verify:** `pnpm exec tsx scripts/build-sellable-skus.ts`. `pnpm verify:store`. `pnpm verify:json`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-308 — Size PDP overdue panel rewritten to three iced-coil cards
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** Size pages showed a rewrite: kicker “Skip a change, buy a repair”, punch “A $9.99 filter is cheaper than iced coils, a blower motor, or a compressor.”, and three detailed rows (iced evaporator coils $150–$500, blower $400–$800, heat exchanger or compressor $1,000–$5,000+) under `.pdp-overdue`. That is not FH-286 / FH-289.
- **Do NOT:** Restyle `.product-overdue` as `.pdp-overdue`. Do not invent `HVAC_FILTER_VS_REPAIR_PUNCH` or a three-item `HVAC_OVERDUE_REPAIRS` with `cost`/`detail` fields. Do not change the five named `HVAC_REAL_REPAIRS` ranges.
- **Do:** Keep `.product-overdue` with `HVAC_OVERDUE_KICKER` (“Skip a change?”), `HVAC_OVERDUE_HEADLINE` (“A dirty filter costs more than the filter.”), `HVAC_OVERDUE_SUB`, five `HVAC_REAL_REPAIRS` name/price rows, DOE energy line, “A $X filter is cheaper than any line above.”, and the change-guide link. Same copy source as the home band.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/components/OverdueCostsBand.tsx`, `shared/hvac-overdue-costs.ts`, `client/src/index.css`
- **Verify:** `/sizes/20x25x1` navy panel lists five repairs (service thaw $150–$450 through heat exchanger $1,000–$3,000). Home `#overdue-costs` is `$9.99` vs `$1,200–$3,000`.
- **Added:** 2026-09-20

---

### FH-307 — SPA JSON-LD speakable URL falls back to the homepage
- **Status:** fixed
- **Area:** seo
- **Symptom:** Crawler HTML from `resolveDocumentSeo` sets speakable `WebPage.url` to the current size, custom, brand, or change-guide path (FH-194). After client navigation, `useSeo` removes `#jsonld-ssr` and replaces it with page JSON-LD that calls `buildSpeakableSchema(siteUrl, selectors)` with no `{ path, name }`, so the speakable page is `https://filterhero.net/` again.
- **Do NOT:** Point speakable `WebPage.url` at `/` on inner routes. Do not keep two JSON-LD graphs (SSR vs SPA) that disagree on `url`.
- **Do:** Pass `{ path, name }` into every SPA `buildSpeakableSchema` call the same way `resolveDocumentSeo` does. Home uses `{ path: "/", name: BRAND_NAME }`.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/pages/CustomAirFilters.tsx`, `client/src/pages/FilterChangeGuide.tsx`, `client/src/pages/BrandBrowse.tsx`, `client/src/pages/Home.tsx`, `scripts/verify-json.ts`
- **Verify:** `pnpm verify:json`. Open `/sizes/20x25x1`, then client-navigate from Home. Document `#jsonld-page` speakable URL is `https://filterhero.net/sizes/20x25x1`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-21

---

### FH-306 — Railway had no HTTP healthcheck
- **Status:** fixed
- **Area:** other
- **Symptom:** FILTER-HERO is Online and `/api/health` returns 200, but `deploy.healthcheckPath` was unset. Railway could mark a deploy SUCCESS before Express was listening.
- **Do NOT:** Add a second region to attach healthchecks (FH-182). Do not healthcheck `/`.
- **Do:** `deploy.healthcheckPath=/api/health` and `healthcheckTimeout=30` on FILTER-HERO. Keep one replica in `us-east4-eqdc4a`.
- **Files:** `.railway/config.json`
- **Verify:** Railway service config `healthcheckPath=/api/health`, timeout 30. Latest SUCCESS `f793cf23` from `main` `1895e06`. `https://filterhero.net/api/health` is `{"ok":true,"brand":"Filter Hero"}`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-21

---

### FH-305 — Railway Stripe keys are FILTER HERO sandbox test, not live FILTER HERO
- **Status:** open
- **Area:** other
- **Symptom:** Live `filterhero.net` Checkout uses Railway `sk_test_` / `pk_test_` from **FILTER HERO sandbox** (`acct_1U9bqs790NnFGDLv`). Shop fulfillment and Klaviyo OAuth belong on live **FILTER HERO** (`acct_1U9bqlQEENEs0Qmw`). Real cards cannot pay. Local `.env` staying sandbox is correct; Railway was supposed to get `sk_live_` / `pk_live_`. Those live keys are not in `.env` and Stripe MCP has no live-mode session.
- **Do NOT:** Copy local `STRIPE_SECRET_KEY` onto Railway. Do not point sandbox or FILTER HERO test-mode Dashboard endpoints at `https://filterhero.net/api/stripe/webhook`. Do not connect Klaviyo to sandbox.
- **Do:** Put FILTER HERO **live** `sk_live_` + `pk_live_` + `VITE_STRIPE_PUBLISHABLE_KEY` on Railway, then rebuild (Vite bakes `VITE_`). Run `pnpm setup:stripe-webhook` against that live key so `STRIPE_WEBHOOK_SECRET` is the Dashboard endpoint for `/api/stripe/webhook`. Keep local `.env` on sandbox + `stripe listen`.
- **Files:** `shared/stripe-accounts.ts`, `scripts/setup-stripe-webhook.ts`, README Production
- **Verify:** Railway `STRIPE_SECRET_KEY` starts with `sk_live_`. Dashboard → FILTER HERO live → Webhooks shows `https://filterhero.net/api/stripe/webhook` enabled. A live Checkout session is `livemode: true`.
- **Added:** 2026-09-20
- **Rechecked:** 2026-09-21 — Railway production still `sk_test_` / `pk_test_`. Stripe MCP session is FILTER HERO test only.

---

### FH-304 — GitHub autodeploy and `railway up` both own FILTER-HERO
- **Status:** mitigated
- **Area:** other
- **Symptom:** Service source was `Tilo-Syntiv/FILTER-HERO`. A Cursor `railway up` with no commit SHA (`53f7af54`) could be overwritten by GitHub `@main`.
- **Do NOT:** `railway up` a dirty tree. Do not attach `www` on Railway. Do not scale a second region.
- **Do:** Production source is now `Tilo-Syntiv/Filter-Hero-OFFICIAL@main` (FH-351). Variable-only changes use `--skip-deploys`.
- **Files:** `.railway/config.json`
- **Verify:** Latest SUCCESS `becad96a` is Official `24597f6`. Source repo `Tilo-Syntiv/Filter-Hero-OFFICIAL`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-21

---

### FH-303 — Railway FULL_CATALOG=true conflicts with the contractor shop
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** Local `.env` and `.env.example` are `FULL_CATALOG=false` / `VITE_FULL_CATALOG=false` (293 contractor SKUs). Railway had both set to `true`. After 2026-09-20 flags were set `false` and the service rebuilt: live `GET /api/products` is `sellableOnly: true` but `sizeCount` is still **182** (older sellable list). Live Klaviyo JSON is still **299** (FH-300).
- **Do NOT:** Set Railway `VITE_FULL_CATALOG=true`. Do not `railway up` Official to “fix” the feed while this branch is dirty.
- **Do:** Keep both flags `false`. Deploy Official `sellable-skus.json` (293 / 153) so live sizeCount and catalog.json match local.
- **Files:** `.env.example`, `docs/WHOLESALE-PRICE-LISTS.md`
- **Verify:** `GET https://filterhero.net/api/products` → `sellableOnly: true`. After Official deploys, `sizeCount` is 153 and `/api/klaviyo/catalog.json` is 293.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-21

---

### FH-302 — Add to cart leaves focus on a button Radix then marks aria-hidden
- **Status:** fixed
- **Area:** cart
- **Symptom:** Clicking **Add 6 to cart** on `/sizes/20x25x1` opened the cart dialog while the CTA still had focus. Chromium warned that `.pdp-checkout` (ancestor) is `aria-hidden` with a focused descendant.
- **Do NOT:** Remove `aria-hidden` from the dialog overlay or disable the Radix cart drawer.
- **Do:** Blur the CTA in `handleAdd` before `addItem`. Cart drawer blurs the active element and focuses `Your cart` on open (`onOpenAutoFocus` + `titleRef`).
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/components/CartDrawer.tsx`
- **Verify:** `/sizes/20x25x1` → Add 6 to cart → no `aria-hidden` console warning; heading `Your cart`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-21

### FH-301 — Smoke treated a rate-limited contact post as a Turnstile miss
- **Status:** fixed
- **Area:** contact
- **Symptom:** `pnpm smoke` failed with `invalid contact should 400, got 429` (and then `contact without Turnstile should 400, got 429`) after earlier local posts filled the 5/15-minute contact limiter. The shop was blocking correctly; the suite expected only 400 / `bot_check_failed`.
- **Do NOT:** Raise the contact limiter to make smoke green. Do not skip the Turnstile assertion when the response is 400.
- **Do:** A 429 on the invalid-contact or missing-Turnstile post must be `rate_limited_contact`. A 400 on missing Turnstile must still be `bot_check_failed`. Honeypot already followed this split.
- **Files:** `scripts/smoke-site.ts`
- **Verify:** `pnpm smoke` after five contact posts in the window still passes. Fresh server: missing Turnstile is 400 `bot_check_failed`.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

### FH-300 — Production Klaviyo JSON feed still serves a 299-SKU mix
- **Status:** open
- **Area:** other
- **Symptom:** Local `GET /api/klaviyo/catalog.json` and the Klaviyo custom catalog are 293 contractor SKUs. Live `https://filterhero.net/api/klaviyo/catalog.json` still returns 299 items (88 ids not on the current sheet). Email product blocks use the API catalog (293), but a later feed pull from the live URL would re-import extras.
- **Do NOT:** Point Klaviyo’s custom catalog at the live JSON feed while production is on the old mix. Do not map those extras into Stripe or `catalog_skus`.
- **Do:** Deploy the current shop so the public feed is 293. `pnpm smoke` fails if local catalog.json is not 293.
- **Files:** `scripts/smoke-site.ts`, `server/klaviyo.ts`
- **Verify:** Local `/api/klaviyo/catalog.json` is 293. After deploy, live feed is 293. `pnpm inspect:klaviyo` catalogItemCount stays 293.
- **Added:** 2026-09-20

### FH-299 — Built to last card was taller than the other trust photos
- **Status:** fixed
- **Area:** photos
- **Symptom:** FH-298 used `aspect-square` so the 1024×1024 layers art would not clip. That card sat taller than the 5:4 warehouse / ceiling / tech photos, so titles did not line up.
- **Do NOT:** Give only the layers card `aspect-square`. Do not cover-crop it back to 5:4. Do not add `p-5`.
- **Do:** All four Why Filter Hero frames are `aspect-[5/4]`. Layers stays `object-contain` on studio `#e8ecf2` so the full diagram fits the same-height frame.
- **Files:** `client/src/components/TrustSection.tsx`
- **Verify:** `/` Why Filter Hero — four photo frames the same height; Built to last still shows labels and filter bottoms.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-298 — Built to last layers crop clipped the diagram and labels
- **Status:** fixed
- **Area:** photos
- **Symptom:** 5:4 `object-cover` + `center top` cut the filter bottoms and made Frame / Filter media / Support type too small to read. Extra `p-5` contain (FH-297) had the opposite problem — a postage stamp on white.
- **Do NOT:** Cover-crop `/products/merv-8-layers.png` into `aspect-[5/4]`. Do not add `p-5` around it.
- **Do:** Full 1024×1024 diagram stays in view (`object-contain`, no `p-5`). Frame height matches the other cards via 5:4 (FH-299).
- **Files:** `client/src/components/TrustSection.tsx`, `client/src/data/life-photos.ts`
- **Verify:** `/` Why Filter Hero second card — full exploded diagram, readable labels, no bottom clip.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-297 — Built to last layers graphic did not fill the trust card
- **Status:** fixed
- **Area:** photos
- **Symptom:** Why Filter Hero “Built to last” used `graphic: true` (`object-contain` + padding on white). The exploded diagram sat in a letterbox while the other three cards were full-bleed 5:4 crops.
- **Do NOT:** Add `p-5` around the layers graphic (postage-stamp letterbox).
- **Do:** Card fill without clipping is FH-298. Title/body/photo stay FH-296.
- **Files:** `client/src/components/TrustSection.tsx`, `client/src/data/life-photos.ts`
- **Verify:** `/` Why Filter Hero — second card fills the rounded frame like the warehouse / ceiling / tech shots.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-296 — Why Filter Hero fit card should say Built to last
- **Status:** fixed
- **Area:** photos
- **Symptom:** The second Why Filter Hero card said “Guaranteed to fit” with `LIFE.installCeilingMan` (ceiling install). Shopper asked for “Built to last” and the exploded construction diagram.
- **Do NOT:** Put “Guaranteed to fit” or `LIFE.installCeilingMan` back on that trust card.
- **Do:** Title is “Built to last.” Body is “Beverage-board frames and metal-mesh support — holds its shape.” Photo is `LIFE.filterLayers` (`/products/merv-8-layers.png`). Crop fill is FH-297. Fit promise stays on the section intro, marquee, and size-page chip.
- **Files:** `client/src/components/TrustSection.tsx`, `client/src/data/life-photos.ts`
- **Verify:** `/` Why Filter Hero second card.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-295 — Delivery promise said 2-day instead of 2-3 day
- **Status:** fixed
- **Area:** other
- **Symptom:** Homepage Why Filter Hero card, size-page chip, delivery heading, shipping FAQ, and `/llms.txt` said “2-day delivery” / “in two days.” The real window is 2-3 days.
- **Do NOT:** Put “2-day delivery” or “in two days” back as the shopper promise.
- **Do:** Say 2-3 day delivery on the trust card, size chip, `/#delivery` heading, shipping FAQ, and llms copy. Map legend can still break out 1 day / 2 days / 3+ days.
- **Files:** `client/src/components/TrustSection.tsx`, `client/src/pages/SizeDetail.tsx`, `client/src/components/DeliverySection.tsx`, `shared/seo.ts`, `server/data/site-config.json`, `client/public/llms.txt`, `scripts/click-ui.ts`
- **Verify:** Homepage Why Filter Hero card. `/#delivery`. `/sizes/20x25x1` chip. FAQ “Where do you ship?”
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-294 — Sandbox Stripe webhooks impersonated live FILTER HERO
- **Status:** fixed
- **Area:** other
- **Symptom:** Local `STRIPE_SECRET_KEY` is FILTER HERO sandbox (`acct_1U9bqs790NnFGDLv`). That account had Dashboard endpoints to `https://filterhero.net/api/stripe/webhook` and `https://a.klaviyo.com/api/webhook/integration/stripe?c=VnVNmQ`. `verify:env` treated both as success. Live Klaviyo OAuth is FILTER HERO (`acct_1U9bqlQEENEs0Qmw`). Test Checkout could POST signed sandbox events at production; Klaviyo Connect on sandbox cannot record Successfully Paid.
- **Do NOT:** Point sandbox or FILTER HERO test-mode endpoints at filterhero.net. Do not treat a sandbox copy of the Klaviyo URL as `oauthAccountMatch`. Do not run `pnpm setup:klaviyo-stripe` against sandbox keys. Do not add Checkout events to the Klaviyo endpoint.
- **Do:** Shop fulfillment webhook only on FILTER HERO live. Local uses `stripe listen`. Native charge/invoice webhook only on FILTER HERO. `pnpm setup:stripe-webhook` scrubs the wrong endpoints. Webhook handler ignores livemode/key mismatches. Shared invariant is `shared/stripe-accounts.ts`.
- **Files:** `shared/stripe-accounts.ts`, `server/stripe-webhooks.ts`, `server/stripe.ts`, `server/klaviyo-stripe.ts`, `scripts/setup-stripe-webhook.ts`, `scripts/verify-env.ts`, `scripts/verify-stripe-books.ts`, `scripts/check-klaviyo-stripe.ts`, `scripts/debug-stripe-checkout.ts`, `scripts/verify-klaviyo.ts`, `client/src/pages/admin/Settings.tsx`, `docs/STRIPE-BOOKS.md`
- **Verify:** `pnpm setup:stripe-webhook` (sandbox). `pnpm verify:env`. `pnpm exec tsx scripts/check-klaviyo-stripe.ts`. `pnpm verify:stripe-books`. `pnpm verify:klaviyo`. Staff Settings shows oauth mismatch on sandbox without leftover conflict dots.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-293 — Klaviyo refunds unmapped and welcome-list fallback could split Email List
- **Status:** fixed
- **Area:** other
- **Symptom:** Live `refunded_sales` had no metric, so Klaviyo revenue would not subtract Stripe **Refunded Payment**. `resolveMarketingListId` looked for **Filter Hero Marketing** and could create a second list if `KLAVIYO_LIST_ID` was empty — Welcome stays on **Email List** `RiTKiS`. `pnpm inspect:klaviyo` also 400ed `/api/brand-logos` on revision `2026-07-15`.
- **Do NOT:** Map revenue or a flow to **Successfully Paid**. Do not trigger welcome / abandon / replenish / a receipt from that metric. Do not create a second marketing list. Do not map `cancelled_sales` to Checkout Expired.
- **Do:** `refunded_sales` → Refunded Payment (`TvC7dY`). List resolution prefers `RiTKiS` / Email List. `pnpm verify:klaviyo` fails if an extra flow appears, if replenish uses `clock_next_change_date`, or if Successfully Paid / quote / clock metrics trigger a flow.
- **Files:** `server/klaviyo.ts`, `scripts/verify-klaviyo.ts`, `scripts/map-klaviyo-metrics.ts`, `scripts/inspect-klaviyo-account.ts`, `docs/KLAVIYO.md`
- **Verify:** `pnpm verify:klaviyo`. `pnpm map:klaviyo-metrics`. Live mapped-metrics `refunded_sales` is `TvC7dY`.
- **Added:** 2026-09-20

### FH-292 — Stripe webhook could send a second Resend confirmation
- **Status:** fixed
- **Area:** contact
- **Symptom:** `checkout.session.completed` always called `sendOrderConfirmation`. Resend idempotency keys last 24 hours; Stripe retries for up to 3 days, so a late retry could mail a second branded confirmation.
- **Do NOT:** Skip the send whenever the order row already exists — a first-send failure still needs the retry. Do not rely on Resend idempotency alone.
- **Do:** Persist `confirmationSentAt` on the order only after Resend accepts the send. Retries keep trying until that stamp lands, then stop.
- **Files:** `server/stripe.ts`, `scripts/verify-resend.ts`, `docs/RESEND.md`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend`. Webhook QA: no stamp when Resend is down, stamp after retry, unchanged on a second retry.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-291 — Resend verify died on Turnstile
- **Status:** fixed
- **Area:** contact
- **Symptom:** `pnpm verify:resend` sent the branded templates, then `submitContact` quote QA threw `Could not verify that form` because a local `TURNSTILE_SECRET_KEY` (or `NODE_ENV=production`) enforces the widget. CRM and Klaviyo were already off; Turnstile was not.
- **Do NOT:** Disable Turnstile in production contact. Do not skip `shouldEnforceTurnstile` on quote/support. Do not treat a failed verify as a dead Resend key.
- **Do:** Unset `TURNSTILE_SECRET_KEY` and force a non-production `NODE_ENV` only inside the `submitContact` QA block, then restore both. Clock reminders stay widget-free.
- **Files:** `scripts/verify-resend.ts`, `docs/RESEND.md`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend` with a real Turnstile secret in `.env`. Output includes send ids for staff, quote, support, and order, plus `submitContact` quote/clock ids.
- **Added:** 2026-09-20
- **Fixed:** 2026-09-20

---

### FH-290 — Verify overdue-cost + how-to invariants in store checks
- **Status:** fixed
- **Area:** other
- **Symptom:** Shared MERV capacity / overdue-repair / how-to-install assets could drift without a failing `pnpm verify:store`.
- **Do NOT:** Drop assertions that `HVAC_REAL_REPAIRS` (5), `HVAC_WAIT_STAGES` (4), `HVAC_CLOGGED_FILTER_FAQ`, site-config MERV FAQ, and `client/public/life/how-to-install.png` stay wired.
- **Do:** Keep those checks in `scripts/verify-store.ts` alongside the existing MERV_PICK_FAQ_ANSWER lock.
- **Files:** `scripts/verify-store.ts`
- **Verify:** `pnpm verify:store`
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-289 — Home overdue band buried the filter-vs-repair punchline
- **Status:** fixed
- **Area:** other
- **Symptom:** Homepage `#overdue-costs` used a quiet carousel + a small footer line (“A $9.99 filter is cheaper…”). The comparison did not dominate the band.
- **Do NOT:** Put the filter price only in a thin footer again, or restore the popular-sizes carousel in this slot.
- **Do:** Keep the redesigned `OverdueCostsBand`: giant `$filter` vs worst-repair hero, bold punchline bar, full named repair list, wait stages, CTAs — all from `shared/hvac-overdue-costs.ts`. Size PDP `.product-overdue-vs` stays a high-contrast callout with the same sentence pattern.
- **Files:** `client/src/components/OverdueCostsBand.tsx`, `client/src/index.css`, `client/src/pages/SizeDetail.tsx`
- **Verify:** `/#overdue-costs` — `$9.99` vs `$1,200–$3,000` hero, then the punchline bar, then the repair list. `/sizes/20x25x1` overdue panel punchline is boxed and bold.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-288 — Home popular-sizes band replaced with overdue repair costs
- **Status:** fixed
- **Area:** other
- **Symptom:** Homepage brand-band under Filter Clock pushed “Popular Filter Hero sizes” instead of the skip-a-change repair math we already use on size PDPs and the change guide.
- **Do NOT:** Put `PopularSizesCarousel` back as the full-bleed band on `Home.tsx`. Do not invent a second set of repair prices for the home band.
- **Do:** Keep `OverdueCostsBand` on the home brand-band (`#overdue-costs`) using `HVAC_REAL_REPAIRS` / `HVAC_WAIT_STAGES` / `HVAC_OVERDUE_*` from `shared/hvac-overdue-costs.ts`. Finder may still embed `PopularSizesCarousel` for size shopping.
- **Files:** `client/src/components/OverdueCostsBand.tsx`, `client/src/pages/Home.tsx`, `shared/hvac-overdue-costs.ts`
- **Verify:** `/` — after Filter Clock, navy band shows Skip a change? / named repair prices / overdue timeline; no “Popular Filter Hero sizes” carousel there. Finder popular strip still OK when `showPopular`.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-287 — Size PDP overdue panel used off-brand burgundy wash
- **Status:** fixed
- **Area:** photos
- **Symptom:** The “Skip a change?” repair panel sat in a heavy burgundy/salmon wash that fought the navy theater, ice trust chips, and mesh accents on size pages.
- **Do NOT:** Reintroduce a burgundy panel fill, salmon kickers, or red glow on `.product-overdue`. Do not restyle the panel with purple-on-white or cream themes.
- **Do:** Keep `.product-overdue` on navy/deep fills with ice (`#8eb0d8`) borders, kickers, and links — same language as `.product-trust` / theater. Soft hero tint only on the dollar amounts (`#f7c9cb`), not the shell.
- **Files:** `client/src/index.css`
- **Verify:** `/sizes/20x25x1` — overdue panel reads as navy + ice next to trust chips; prices stay readable.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-286 — Overdue-filter costs were vague buckets, not named repairs
- **Status:** fixed
- **Area:** other
- **Symptom:** Change-guide wait cards and the size-page navy panel used soft ranges like “$150–$500 repairs” without naming evaporator coils, blower motors, compressors, or heat exchangers — so the filter vs repair math did not land.
- **Do NOT:** Soften `HVAC_REAL_REPAIRS` / `HVAC_WAIT_STAGES` back to unlabelled buckets. Do not invent repair prices outside `shared/hvac-overdue-costs.ts`.
- **Do:** Keep named repairs with ballpark prices (service thaw, blower, coil, compressor, heat exchanger) on the size PDP list, change-guide timeline + price table, and the clogged-filter FAQ via `HVAC_CLOGGED_FILTER_FAQ`. Frame as typical U.S. residential ballparks, not quotes.
- **Files:** `shared/hvac-overdue-costs.ts`, `shared/seo.ts`, `client/src/pages/FilterChangeGuide.tsx`, `client/src/pages/SizeDetail.tsx`, `client/src/index.css`
- **Verify:** `/how-often-to-change-air-filter#wait` — four timeline cards plus “Real repairs · real sticker prices” table; `/sizes/20x25x1` navy panel lists five named repair prices vs pack unit price.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-285 — Size PDP left navy column empty under trust chips
- **Status:** fixed
- **Area:** other
- **Symptom:** On catalog size pages the left theater stretched with the tall buy column, leaving empty navy mesh below Guaranteed fit / 2-day / Major brands. Shoppers never saw repair-cost stakes next to Add to cart.
- **Do NOT:** Leave `.product-theater` without `.product-overdue`, or drop the named repair price list. Do not invent different dollar ranges outside `shared/hvac-overdue-costs.ts`.
- **Do:** Keep the overdue panel under trust chips (`margin-top: auto`) with `HVAC_REAL_REPAIRS` / `HVAC_OVERDUE_*` from `shared/hvac-overdue-costs.ts`, DOE 5–15% line, live unit price vs repair, and link to `CHANGE_GUIDE_PATH`. Change-guide wait stages reuse the same shared costs.
- **Files:** `shared/hvac-overdue-costs.ts`, `client/src/pages/SizeDetail.tsx`, `client/src/index.css`, `client/src/pages/FilterChangeGuide.tsx`
- **Verify:** `/sizes/20x25x1` desktop — below trust chips, named repair prices sit in the navy column beside quantity / Add to cart.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-284 — MERV pick copy skipped capacity / resistance
- **Status:** fixed
- **Area:** other
- **Symptom:** FAQ, llms, home MERV, and size pages said “confirm higher MERV” or nothing about capacity. Shoppers were not told that tighter filters add resistance and that modern units handle higher ratings better than older ones.
- **Do NOT:** Soften or drop capacity/resistance/modern-vs-older language from `shared/merv-capacity.ts`, or re-duplicate a weaker MERV FAQ answer in `site-config.json` / `llms.txt` / component locals.
- **Do:** Import `MERV_CAPACITY_NOTE`, `MERV_CAPACITY_SHORT`, and `MERV_PICK_FAQ_ANSWER` from `shared/merv-capacity.ts` on FAQ, SEO/llms, `#merv`, size Choose MERV, Filter Clock, family stories, and brand heroes. Keep per-rating notes in `MERV_GUIDE` aligned with that capacity story.
- **Files:** `shared/merv-capacity.ts`, `shared/seo.ts`, `server/data/site-config.json`, `client/public/llms.txt`, `client/src/lib/merv-guide.ts`, `MervCarousel.tsx`, `SizeDetail.tsx`, `FilterPower.tsx`, `FamilyAirSection.tsx`, `BrandBrowse.tsx`, `scripts/verify-store.ts`
- **Verify:** `/#merv` intro + compare footer; `/sizes/20x25x1` Choose MERV note + MERV FAQ; `/#faq` What MERV; `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-283 — Size pages had no how-to-replace section
- **Status:** fixed
- **Area:** other
- **Symptom:** Product size pages had measure + finder, but no on-page how-to for seating a new filter. Shoppers had to leave for the change guide.
- **Do NOT:** Drop `HowToReplaceGuide` from catalog size pages, or put another graphic ahead of `LIFE.howToInstall` in that section’s shot list.
- **Do:** Keep `HowToReplaceGuide` first in the white PDP panel (`#how-to-replace`). Lead with `/life/how-to-install.png`, then wall + ceiling support shots. Link through to `CHANGE_GUIDE_PATH`.
- **Files:** `client/src/components/HowToReplaceGuide.tsx`, `client/src/pages/SizeDetail.tsx`, `client/src/data/life-photos.ts`, `client/public/life/how-to-install.png`
- **Verify:** `/sizes/20x25x1` — How to / Replace your air filter shows the install graphic first, then two support photos, above How to measure.
- **Added:** 2026-09-19
- **Fixed:** 2026-09-19

---

### FH-282 — Shop still promised a 30-day guarantee
- **Status:** fixed
- **Area:** other
- **Symptom:** Why Filter Hero card, marquee, size-page chip, FAQ, meta, and `/llms.txt` said “30-day guarantee” / “30-day fit guarantee” with a refund-in-30-days line. JSON-LD also advertised `merchantReturnDays: 30`.
- **Do NOT:** Put a 30-day guarantee, 30-day fit guarantee, “full refund within 30 days,” or `merchantReturnDays: 30` back on any shopper surface (trust cards, marquee, size chips, FAQ, meta, JSON-LD OnlineStore/Offer, `/llms.txt`).
- **Do:** Talk about a guaranteed fit for major brands and custom sizes on the Why Filter Hero intro, marquee, and size-page chip. The second trust card is “Built to last” (FH-296), not a 30-day guarantee. Omit MerchantReturnPolicy until a real policy is published.
- **Files:** `client/src/components/TrustSection.tsx`, `client/src/components/TrustMarquee.tsx`, `client/src/pages/SizeDetail.tsx`, `shared/seo.ts`, `client/index.html`, `server/data/site-config.json`, `client/public/llms.txt`, `scripts/verify-store.ts`, `scripts/verify-json.ts`
- **Verify:** `/` Why Filter Hero second card and intro; marquee chip; `/sizes/20x25x1` trust list; `/#faq` shipping answer; `pnpm verify:store`; `pnpm verify:json`.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-281 — 2-day delivery card used a wall-install photo
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage Why Filter Hero “2-day delivery” showed `LIFE.installWall` (homeowner seating a filter). The warehouse scan photo belongs in that slot.
- **Do NOT:** Point the 2-day delivery trust card back at `LIFE.installWall`. Do not swap Size Detail, Size Browse, or the filter-change guide — those keep the wall install.
- **Do:** Keep `LIFE.shippingWarehouse` (`/life/shipping-warehouse.png`, `object-position: 40% center`) on the 2-day delivery card so the box and scanner stay in the 5:4 crop.
- **Files:** `client/src/components/TrustSection.tsx`, `client/src/data/life-photos.ts`, `client/public/life/shipping-warehouse.png`
- **Verify:** `/` Why Filter Hero — first card is the warehouse scan, not the wall vent.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-280 — Lockup mascot sat a hair high
- **Status:** fixed
- **Area:** photos
- **Symptom:** The flyer next to HERO sat a touch high vs the FILTER HERO sign.
- **Do NOT:** Change mascot size or move packs/type to nudge it. Do not restore `translate(0.18em, -50%)`.
- **Do:** Keep the mascot hung off HERO at `height: 100%` and `translate(0.18em, calc(-50% + 0.07em))`.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — mascot is a hair lower; still sign height; headline and packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---


### FH-279 — Revert lockup mascot back to sign height
- **Status:** fixed
- **Area:** photos
- **Symptom:** FH-278 made the flyer `height: 92%` and it read too small next to FILTER HERO.
- **Do NOT:** Size `.hero-character-lockup` to `92%` again.
- **Do:** Keep the mascot hung off HERO at `height: 100%` of the sign. Lockup type, headline, and packs stay put.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — mascot matches FILTER HERO height again.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-278 — Lockup mascot needed a hair smaller
- **Status:** superseded
- **Area:** photos
- **Symptom:** The flyer next to HERO sat at full sign height and read a touch large.
- **Do NOT:** Drop `.hero-character-lockup` back to `height: 100%`. Do not shrink FILTER HERO type or move packs.
- **Do:** Keep the mascot hung off HERO at `height: 92%`. Lockup type, headline, and packs stay put.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — mascot is a hair smaller than FILTER HERO; type and packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---


### FH-277 — Header needed one more tad shorter
- **Status:** fixed
- **Area:** header
- **Symptom:** After FH-276 the hero lockup still sat tight under the bar.
- **Do NOT:** Restore `md:py-2` / `md:h-10` if this extra sliver is wanted.
- **Do:** Keep the header one more hair tighter (`py-1 md:py-1.5`, header lockup `md:h-9` / `md:text-[1.05rem]`). Footer lockup stays. Hero packs and headline stay put.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/components/BrandLockup.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — header still reads the same, just a tad shorter than FH-276.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---


### FH-276 — Header needed another tad shorter
- **Status:** fixed
- **Area:** header
- **Symptom:** After FH-275 the hero lockup still sat tight under the bar.
- **Do NOT:** Restore `md:py-2.5` / `md:h-11` if the bar needs this extra sliver.
- **Do:** Keep the header one more hair tighter (`py-1.5 md:py-2`, header lockup `md:h-10` / `md:text-[1.15rem]`). Footer lockup stays. Hero packs and headline stay put.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/components/BrandLockup.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — header still reads the same, just a tad shorter than FH-275.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-275 — Header bar was crowding the hero lockup
- **Status:** fixed
- **Area:** header
- **Symptom:** FILTER HERO and the mascot in the hero still clipped under the header. The header bar itself sat a bit tall.
- **Do NOT:** Pad the hero copy column or shrink the hero lockup to make room. Do not restore `md:py-3` / `md:h-12` on the header bar.
- **Do:** Keep the header tighter than the original bar. Current step is FH-276.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/components/BrandLockup.tsx`
- **Verify:** `/` desktop — header looks almost the same, just slightly shorter; FILTER HERO and the flyer have a sliver more air under the bar.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---


### FH-274 — Copy-column padding made the hero navy feel bigger
- **Status:** fixed
- **Area:** photos
- **Symptom:** Padding on `.hero-copy-col` made the centered copy taller, so FILTER HERO rode into the header, Start your clock dropped off, and the navy band looked bigger.
- **Do NOT:** Add padding to `.hero-copy-col` to unclip the lockup. Do not change hero stage height.
- **Do:** Keep `.hero-copy-col` at `overflow: visible` only. Clip fix stays the removed motion `filter`, not extra box size. Lockup, headline, and packs stay put.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — navy band matches the prior size; both CTAs show; lockup is not under the header.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-273 — FILTER HERO lockup clip was a filter box, not type size
- **Status:** fixed
- **Area:** photos
- **Symptom:** The tops of FILTER HERO and the mascot cape were sheared off. Shrinking the lockup (FH-272) did not unclip them.
- **Do NOT:** Shrink `.hero-lockup` to hide the clip. Do not leave `filter: blur(...)` on the hero copy motion wrapper. Do not pad `.hero-copy-col` (see FH-274).
- **Do:** Keep the lockup at `clamp(3.4rem, 6.6vw, 5.4rem)`. Animate copy with opacity/y only. `.hero-copy-col` is `overflow: visible` only. Mascot stays `height: 100%` of the sign.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — F, H, and the cape are whole; headline and packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-272 — FILTER HERO lockup and mascot were clipped
- **Status:** superseded
- **Area:** photos
- **Symptom:** The home lockup and flyer sat a tad large, so italic tops and the cape clipped at the hero edge.
- **Do NOT:** Treat a smaller lockup as the clip fix. See FH-273.
- **Do:** Keep the lockup at `clamp(3.4rem, 6.6vw, 5.4rem)` and unclip via the copy-column filter/overflow fix.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — FILTER HERO and the mascot are fully visible, still matched in height; headline and packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---


### FH-271 — Lockup mascot was not the same size as FILTER HERO
- **Status:** fixed
- **Area:** photos
- **Symptom:** The flyer next to **HERO** sat at `1.05em` and read smaller than the FILTER HERO sign.
- **Do NOT:** Size `.hero-character-lockup` to `1.05em` or `1.2em`. Do not move packs or the lockup type.
- **Do:** Keep the mascot hung off **HERO** at `height: 100%` of `.hero-lockup` so it matches the sign height.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — mascot is the same height as FILTER HERO; type and packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---


### FH-270 — Hero stage used a different navy than the brand bands
- **Status:** fixed
- **Area:** photos
- **Symptom:** The home hero sat on a vertical `#1b3258`–`#23406a` wash with ice/red orbs, so it did not match Who you’re protecting / Most requested.
- **Do NOT:** Keep the old hero gradient, orbs, copy scrim, or `.hero-glow` plate. Do not move packs or the lockup mascot to “fix” the color.
- **Do:** Use the `.brand-band` fill on `.hero-cast-stage` (ice radials + `linear-gradient(90deg, #1a3058 0%, #2a4d82 48%, #3a66a3 100%)`). Hide atmosphere and glow. Copy overlay stays transparent.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — hero navy matches the Who you’re protecting and Popular sizes bands; FILTER HERO, mascot, and packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-269 — Putting the mascot back in the sky shifted the hero
- **Status:** fixed
- **Area:** photos
- **Symptom:** After FH-268 the giant sky still sat at `top: 50%` / `height: 56%` and the stage looked like the whole hero moved.
- **Do NOT:** Turn the lockup mascot back into a full-stage sky still to “revert.” Do not change pack or copy offsets.
- **Do:** Keep the official sheet hung off **HERO** (`left: 100%`, `height: 1.05em`). Hide the sky still at `1024px+`. Packs stay at `bottom: calc(25% + 0.5in)`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — FILTER HERO type and MERV packs match the pre-FH-268 layout; mascot sits right of HERO only.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-268 — Revert the mascot off the HERO lockup
- **Status:** fixed
- **Area:** photos
- **Symptom:** The mascot still sat on the word **HERO** after FH-267, so the “revert” did not look like a change.
- **Do NOT:** Hang `.hero-character` off `.hero-lockup-hero`. Do not keep a lockup copy and a hidden sky copy.
- **Do:** One sky still (`character-fly-still.png`) at `left: calc(52% - 0.5in)` / `top: 50%`. Lockup is type only.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — mascot is back in the gap under FILTER HERO, left of MERV 8, not beside the word HERO.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-265

---

### FH-267 — Revert the brighter FILTER HERO lockup glow
- **Status:** fixed
- **Area:** photos
- **Symptom:** FH-266 made **FILTER HERO** and the mascot too loud (ice glow, `#f24b52`, `1.2em`).
- **Do NOT:** Put `#f24b52` or ice text-shadows on `.hero-lockup-filter` / `.hero-lockup-hero`. Do not bump the lockup mascot to `1.2em`.
- **Do:** Keep the pre-FH-266 lockup: **FILTER** `#fff`, **HERO** `var(--hero)`, mascot `1.05em` still to the right of **HERO**.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — lockup matches the look before the visibility boost; mascot still sits right of HERO.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-266

---

### FH-266 — Hero FILTER HERO lockup and mascot were hard to read
- **Status:** fixed
- **Area:** photos
- **Symptom:** The home lockup sat in navy burgundy `#7f2328` with a quiet mascot glow, so **FILTER HERO** and the flyer faded into the stage.
- **Do NOT:** Leave `.hero-lockup-hero` on `var(--hero)` without a glow. Do not restyle the headline or packs to “fix” contrast.
- **Do:** Match the header lockup: **FILTER** white ice glow, **HERO** `#f24b52` with the brand-wordmark glow, mascot `1.2em` with the icy white edge.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — FILTER HERO and the mascot read as clearly as the header lockup; headline and packs unchanged.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Superseded by:** FH-267

---

### FH-265 — Hero mascot sat in the headline gap instead of right of HERO
- **Status:** fixed
- **Area:** photos
- **Symptom:** The lockup mascot floated in the gap beside the headline, not next to the word **HERO**.
- **Do NOT:** Park `.hero-character` at `left: calc(52% - 0.5in)` / `top: 50%` on desktop. Do not move packs or the lockup type.
- **Do:** Hang the official sheet off `.hero-lockup` (`left: 100%`, `height: 1.05em`) so it sits to the right of **HERO**. Hide the sky still at `1024px+`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — mascot sits immediately right of **HERO**; FILTER HERO type and MERV packs stay put.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Superseded by:** FH-268

---

### FH-264 — Hero mascot needed another quarter-inch left nudge
- **Status:** fixed
- **Area:** photos
- **Symptom:** After FH-263 the mascot still sat a tad right of the gap under **HERO**.
- **Do NOT:** Park desktop `.hero-character` at `left: calc(52% - 0.25in)` or `left: 52%`. Do not move the packs or copy with it.
- **Do:** Keep the mascot a half inch left of the old center (`left: calc(52% - 0.5in)` desktop, `calc(54% - 0.5in)` mobile).
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — mascot sits a quarter inch left of FH-263, still under HERO and left of MERV 8.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-263

---

### FH-263 — Hero mascot sat a quarter inch too far right
- **Status:** fixed
- **Area:** photos
- **Symptom:** The lockup mascot sat a tad right of the gap under **HERO**.
- **Do NOT:** Park desktop `.hero-character` at `left: 52%` or mobile at `left: 54%`. Do not move the packs or copy with it.
- **Do:** Nudge only the mascot a quarter inch left (`left: calc(52% - 0.25in)` desktop, `calc(54% - 0.25in)` mobile).
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — mascot sits a quarter inch left of the FH-262 spot, still under HERO and left of MERV 8.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Superseded by:** FH-264

---

### FH-262 — Hero mascot did not match the header lockup
- **Status:** fixed
- **Area:** photos
- **Symptom:** The hero flyer was a processed sheet, not the header emblem. It missed the official `logo.png` knockout and the icy white edge/glow.
- **Do NOT:** Invent a new outline, or use a different mascot than `/logo.png`. Do not restyle packs or copy to “fix” the look.
- **Do:** Cut the character from `client/public/logo.png` with the same `r,g,b > 242` knockout as `BrandLockup`, keep it on the 1640×1097 still, and use the header emblem filter (`0.6px` white edge + `8px` ice glow).
- **Files:** `client/public/hero/character-fly-still.png`, `client/public/hero/character-sheet.png`, `client/src/index.css`, `client/src/components/Hero.tsx`
- **Verify:** `/` desktop — hero mascot matches the header F-mark: same figure, white edge, soft ice glow, navy showing through.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-261 — Hero mascot lost its white outline on navy
- **Status:** fixed
- **Area:** photos
- **Symptom:** After knocking out the plate, the mascot’s navy legs vanished into the hero and the figure looked washed out next to the lockup.
- **Do NOT:** Strip the logo’s white silhouette stroke, or scale the figure to fill the 1640×1097 canvas.
- **Do:** Keep a transparent still with the white outline intact (and a 1px white drop-shadow ring) so the figure reads on `#203868` like the wordmark lockup.
- **Files:** `client/public/hero/character-fly-still.png`, `client/public/hero/character-sheet.png`, `client/src/index.css`, `client/src/components/Hero.tsx`
- **Verify:** `/` desktop — mascot has a crisp white edge, burgundy torso and filter cape stay visible, no white/black box.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-260 — Hero mascot still had an opaque plate
- **Status:** fixed
- **Area:** photos
- **Symptom:** The flying mascot sat on a white or black rectangle instead of the navy hero.
- **Do NOT:** Restyle the hero to “fix” the plate (do not shrink, fade, or reposition `.hero-character`). Do not scale the vector to fill the 1640×1097 canvas — that makes the figure look huge in the same CSS box.
- **Do:** Keep the existing hero layout. Serve a transparent vector still on that same canvas, with the figure at ~42% of the canvas so it sits under HERO and left of MERV 8.
- **Files:** `client/public/hero/character-fly-still.png`, `client/public/hero/character-sheet.png`, `client/src/components/Hero.tsx`
- **Verify:** `/` desktop — copy, packs, and mascot size/placement match the previous hero; no white/black box around the figure.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-259 — Hero MERV packs needed another quarter-inch drop
- **Status:** fixed
- **Area:** photos
- **Symptom:** After FH-257 the four packs still sat a tad high over the 30+ brand strip.
- **Do NOT:** Use `bottom: calc(25% + 0.75in)` or `bottom: 25%`. Do not move the brand row with the packs.
- **Do:** Keep the lineup a half inch above the old floor (`bottom: calc(25% + 0.5in)`).
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — four packs sit a quarter inch lower than FH-257, still above the 30+ brand row.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-257

---

### FH-258 — Hero 30+ brand strip sat a quarter inch too low
- **Status:** fixed
- **Area:** brands
- **Symptom:** The “Guaranteed to fit 30+ major brands” row sat a tad low under the four packs.
- **Do NOT:** Park `.hero-brands` at `bottom: 6%` or `bottom: 2.5%`. Do not move the MERV packs with this strip.
- **Do:** Keep the strip a quarter inch higher (`bottom: calc(6% + 0.25in)`). Packs stay above; marquee stays below.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — brand row sits a quarter inch closer to the packs, still showing five logos.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-110

---

### FH-257 — Hero MERV packs needed a quarter-inch drop after FH-256
- **Status:** fixed
- **Area:** photos
- **Symptom:** After raising the four packs a full inch, they sat a tad high.
- **Do NOT:** Use `bottom: calc(25% + 1in)` or drop back to `bottom: 25%`. Do not move the brand row with the packs.
- **Do:** Keep the lineup three-quarters of an inch above the old floor (`bottom: calc(25% + 0.75in)`).
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — four packs sit a quarter inch lower than FH-256, still above the 30+ brand row.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-256

---

### FH-256 — Hero MERV packs sat about an inch too low
- **Status:** fixed
- **Area:** photos
- **Symptom:** The four home-hero packs (MERV 8, Carbon, 11, 13) sat low in the right column.
- **Do NOT:** Drop `.hero-pack-row` back to `bottom: 25%` (or the short-desktop copy of that). Do not raise the brand row with the packs.
- **Do:** Keep the lineup one inch higher (`bottom: calc(25% + 1in)`). Claim stays above, brands stay below.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — four packs sit about an inch higher, with clear space above the 30+ brand row.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Superseded by:** FH-257

---

### FH-255 — Header custom tab shortened to Custom below 2xl
- **Status:** fixed
- **Area:** header
- **Symptom:** The burgundy header tab next to FIND said **CUSTOM** on laptop widths. Full copy **NEED A CUSTOM SIZE** only appeared at `2xl`.
- **Do NOT:** Split the label with `2xl:hidden` / `hidden 2xl:inline`. Do not use Custom, Custom size, or a second finder.
- **Do:** One button, **Need a custom size** (uppercase via `.header-find-btn`), to `/custom-air-filters#custom-quote` at every desktop width.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/index.css`
- **Verify:** Header at ~1280px and 1536px reads NEED A CUSTOM SIZE. Click opens the quote form. Mobile sheet already used the full phrase.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-034

---

### FH-254 — Stripe Checkout still prints Free next to a $0 shipping option
- **Status:** open
- **Area:** cart
- **Symptom:** Shop copy no longer says free shipping (FH-253). Hosted Checkout still shows the rate as **Shipping** with price **Free**, because `shipping_options` is a `$0` fixed amount. Stripe labels a zero-dollar shipping rate Free.
- **Do NOT:** Put “Free shipping” back in `display_name`. Do not invent a freight charge. Do not drop `shipping_options` while `shipping_address_collection` is on — Checkout requires a rate.
- **Do:** Keep the option labeled Shipping. To stop Stripe from printing Free, set a paid `fixed_amount` once freight is known.
- **Files:** `server/stripe.ts`, `scripts/debug-stripe-checkout.ts`, `scripts/click-ui.ts`
- **Verify:** Start checkout from the cart. Order summary: Shipping / Free. Cart drawer: Shipping At checkout. `pnpm check`. `pnpm browse`.
- **Added:** 2026-09-18

---

### FH-253 — Free shipping was still promised on the shop
- **Status:** fixed
- **Area:** cart
- **Symptom:** Marquee, trust tiles, delivery copy, size-page chips, footer, cart, Stripe Checkout, FAQ, meta, JSON-LD, and `/llms.txt` all said free shipping.
- **Do NOT:** Put “free shipping” back on any shopper surface, including Stripe `display_name`, OfferShippingDetails `$0`, FAQ, or the FREE DELIVERY truck graphic.
- **Do:** Talk about 2-3 day delivery and contiguous-US fulfillment only. Cart says Shipping at checkout. Checkout shipping option is labeled Shipping. Size Offers keep the 30-day return policy and omit a `$0` shipping rate.
- **Files:** `shared/seo.ts`, `client/index.html`, `client/src/components/TrustMarquee.tsx`, `client/src/components/TrustSection.tsx`, `client/src/components/DeliverySection.tsx`, `client/src/components/CartDrawer.tsx`, `client/src/pages/Home.tsx`, `client/src/pages/SizeDetail.tsx`, `server/stripe.ts`, `server/data/site-config.json`, `docs/STRIPE-BOOKS.md`
- **Verify:** Homepage, `/#delivery`, `/sizes/20x25x1`, cart, `/custom-air-filters` FAQ. `pnpm verify:store`. `pnpm verify:json`. Stripe Checkout lists Shipping, not Free shipping.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18
- **Supersedes:** FH-177, FH-178, FH-186

---

### FH-252 — Size page only sold 1, 2, 4, 6, or 12 filters
- **Status:** fixed
- **Area:** catalog
- **Symptom:** `/sizes/…` Select quantity only offered pack breaks 1, 2, 4, 6, and 12. Shoppers who needed 3, 5, or 7–11 could not pick those counts.
- **Do NOT:** Replace the volume ladder with a 12-chip grid. Do not squeeze the original pack cards beside the stepper in the buy column — they wrap and clip.
- **Do:** One qty card: − / 1–12 / + on the left, Qty / Each / Savings ladder (1, 2, 4, 6+, 12+) on the right. Live ladder unit prices still apply (3 uses the 2-filter rung, 5 uses 4, 7–11 use 6, 12 uses 12). Default and “Most popular” stay 6; “Best value” stays 12. Pack stepper aria-labels are “Decrease/Increase pack quantity” so they do not collide with cart ±.
- **Files:** `shared/products.ts`, `client/src/pages/SizeDetail.tsx`, `client/src/index.css`, `client/src/lib/merv-pref.ts`, `scripts/click-ui.ts`, `scripts/verify-store.ts`
- **Verify:** `/sizes/20x25x1` — stepper 1–12 beside the 5-rung table. Pack total follows the matching rung. `pnpm verify:store`. `pnpm browse`.
- **Added:** 2026-09-18
- **Fixed:** 2026-09-18

---

### FH-251 — Checkout collected no sales tax (Stripe Tax was off)
- **Status:** fixed
- **Area:** cart
- **Symptom:** Hosted Checkout charged the exclusive catalog price. `automatic_tax` was hard-off (FH-211) so QuickBooks could only book tax after the charge. Shoppers never paid sales tax.
- **Do NOT:** Hard-code `automatic_tax.enabled=false`. Do not force it on while Tax Settings are `pending` (FH-139 400). Do not let QBO Automated Sales Tax recalculate a sale Stripe already taxed. Do not invent a `txcd_` — filters stay `txcd_99999999`, shipping `txcd_92010001`.
- **Do:** Enable `automatic_tax` when Tax Settings are `active`. Keep Customer + Invoice + exclusive prices. Add Dashboard registrations for each state already registered to collect. Staff `/admin/settings` shows head office, automatic tax, and collecting registrations.
- **Files:** `server/stripe.ts`, `shared/stripe-tax.ts`, `server/admin/routes.ts`, `client/src/pages/admin/Settings.tsx`, `scripts/debug-stripe-checkout.ts`, `scripts/verify-stripe-books.ts`, `docs/STRIPE-BOOKS.md`, `README.md`
- **Verify:** `pnpm verify:stripe-books`. `pnpm debug:stripe-checkout` — session `automatic_tax.enabled` is true once Tax Settings are active. Start checkout, enter a ship-to in a registered state, confirm the Tax line before pay.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17
- **Supersedes:** FH-211

---

### FH-250 — One-rating size pages left the MERV chip in a four-column hole
- **Status:** fixed
- **Area:** catalog
- **Symptom:** `/sizes/14x25x1` only sells MERV 8, but `.pdp-merv-row` was `repeat(4)`. The chip sat at ~125px on a 522px row.
- **Do NOT:** Hard-code four columns on Choose MERV. Do not use `auto-fit` + `minmax(8rem)` — four chips wrap on the buy column.
- **Do:** Set `--merv-cols` from `availableTypes.length`. Desktop uses that count. Mobile uses `min(2, var(--merv-cols))`.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/index.css`, `scripts/click-ui.ts`
- **Verify:** `/sizes/14x25x1` chip fills the row. `/sizes/20x25x1` stays 4-across desktop / 2×2 mobile. `pnpm browse`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-249 — Capture note stayed gray after a MERV chip was chosen
- **Status:** fixed
- **Area:** catalog
- **Symptom:** On a size page, the Capture box under Choose MERV stayed the same cool gray no matter which rating was pressed. The chips already washed to navy / charcoal / red / gold.
- **Do NOT:** Hard-code `.pdp-merv-note` to `rgba(232, 237, 244, 0.7)`. Do not leave the Capture label on `--mesh` when the selected rating has a badge color.
- **Do:** Pass `--merv-wash` from `selectedType.badgeColor` and tint the note at the same ~20% wash as the chips. Color the Capture label with that wash. PDP dots use the badge color so Carbon is charcoal, not ice.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/index.css`, `client/src/components/CaptureDots.tsx`
- **Verify:** `/sizes/20x25x1` — click MERV 8, Carbon, 11, 13. Capture box and CAPTURE label follow the pressed chip.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-248 — MERV picker chips sat on white instead of their rating color
- **Status:** fixed
- **Area:** catalog
- **Symptom:** On a size page, Choose MERV showed a white row under the colored MERV 8 / Carbon / 11 / 13 badges. Shoppers could not tell the ratings apart from the card body.
- **Do NOT:** Leave `.pdp-merv` on a shared white row. Do not fill the card with solid `badgeColor` — the wash is too heavy and white type fails on MERV 13 gold.
- **Do:** Tint each chip with a translucent `--merv-wash` (`badgeColor` at ~20%, a bit stronger on hover/active). Keep name and best-for on `--deep` / muted. Active chip rings with the rating color.
- **Files:** `client/src/index.css`
- **Verify:** `/sizes/20x25x1` — MERV 8 navy, Carbon black, MERV 11 red, MERV 13 gold. Click each rating; pressed chip keeps its color and shows the ring.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-247 — Turnstile loaded on every homepage view and skipped a missing token
- **Status:** fixed
- **Area:** contact
- **Symptom:** Contact and quote forms mounted Cloudflare Turnstile immediately, so `/` logged hidden `challenges.cloudflare.com` `NaN` errors before the shopper reached the form. Local `/api/contact` with a configured secret still accepted a missing token. After a successful send the widget was not reset, so the next submit reused a spent token.
- **Do NOT:** Call `render` before the field is near the viewport. Do not skip `shouldEnforceTurnstile` when a secret is set just because the body omitted `turnstileToken`. Do not require Turnstile on `intent=reminder`. Do not leave `error-callback` unset.
- **Do:** Mount the explicit widget only when the host is near the viewport. Always-visible flexible light widget, expire/timeout reset, handled `error-callback`. Do not call `turnstile.ready()` with `api.js?render=explicit` + `async`. Client blocks send without a token when the site key is set, and reads `turnstile.getResponse()` on submit. Server verifies whenever a secret is configured (or production) and sends `remoteip`. Reset the widget after a successful send.
- **Files:** `client/src/components/TurnstileField.tsx`, `client/src/components/ContactForm.tsx`, `client/src/components/CustomQuoteForm.tsx`, `server/security.ts`, `server/contact.ts`, `server/index.ts`, `scripts/verify-security.ts`, `scripts/smoke-site.ts`
- **Verify:** `/` — no Turnstile script until `#contact` is near. `/#contact` and `/custom-air-filters` show the widget and mint a token. POST `/api/contact` without a token is `400 bot_check_failed`. Filter Clock reminder still posts. `pnpm verify:security`. `pnpm smoke`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-246 — Resend verify never sent the real templates
- **Status:** fixed
- **Area:** contact
- **Symptom:** `pnpm verify:resend` only probed a generic HTML email. A broken quote receipt, support receipt, or order confirmation could still pass. A sending-only API key 401ed on `emails.get` and looked like a failure.
- **Do NOT:** Treat a probe-only send as proof the mailer works. Do not call `emails.get` with a send-only key. Do not email `info@filterhero.net` from verify.
- **Do:** Send staff alert, quote receipt, support receipt, and order confirmation to `delivered@resend.dev`. `submitContact` honeypot / quote / clock runs with CRM and Klaviyo off. Skip GET when `/domains` is 401. Markup in names/messages is escaped. $0 tax is omitted; recorded tax is shown.
- **Files:** `scripts/verify-resend.ts`, `server/mailer.ts`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend`. Output includes send ids for staff, quote, support, and order.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-245 — Switching MERV left the gallery on the previous rating's thumb
- **Status:** fixed
- **Area:** photos
- **Symptom:** On a size page, opening the mesh or layers thumb then choosing another MERV kept `shot` at 1 or 2. The new rating's pack shot never became the hero — shoppers still saw the shared close-up or the other rating's exploded view.
- **Do NOT:** Only clamp `shot` to `gallery.length - 1` when the MERV key changes. Do not keep the previous thumb index across ratings.
- **Do:** Reset `shot` to 0 whenever `selectedType.key` changes so the official pack shot is the hero for that MERV.
- **Files:** `client/src/pages/SizeDetail.tsx`
- **Verify:** `/sizes/20x25x1?merv=8` — click the mesh thumb, then MERV 13. Main image is `merv-13-packshot.png`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-244 — Size page ignored `?merv=13` after another rating
- **Status:** fixed
- **Area:** photos
- **Symptom:** `/sizes/20x25x1?merv=13` could stay on MERV 11 (and the MERV 11 pack shot) when the size page was already mounted or sessionStorage had another rating. The MERV effect only re-ran when the size list changed, so hero / chip / address-bar MERV 13 did not swap the gallery.
- **Do NOT:** Keep MERV in `useState` updated only from `[availableTypes]`. Do not let the session stash beat a valid `?merv=` query.
- **Do:** Derive the selected MERV from `useSearch()` with `resolvePreferredMerv`. URL wins over the session stash. Chip clicks write `?merv=`. Qty 1 / 12 still use `packShotSrc(13)`.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/lib/merv-pref.ts`, `scripts/verify-store.ts`, `scripts/click-ui.ts`
- **Verify:** `/sizes/20x25x1?merv=11` then `/sizes/20x25x1?merv=13` — MERV 13 chip pressed, gallery is `merv-13-packshot`. Homepage MERV 13 pack opens the same. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-243 — MERV 8 pack shots still used the branded Filter Hero lockup
- **Status:** fixed
- **Area:** photos
- **Symptom:** After FH-239, MERV 8 hero / packshot / 6-pack / 3/4 / mesh close-up still showed FILTER HERO plus cape marks on the lattice. The shopper-supplied unlabeled MERV 8 STANDARD shot belongs in those slots.
- **Do NOT:** Restore Filter King or the FILTER HERO lockup on `pack-merv8.png` or `merv-8-packshot.png`. Do not leave `PACK_SHOT_REV` / hero `ASSET` unbumped after swapping the files. Do not flood-fill the hero cutout so the white cardboard frame disappears (FH-060). Do not overwrite `products/source/merv-8-thin-rectangle-*.png`.
- **Do:** Official MERV 8 pack is the unlabeled isolated MERV 8 STANDARD shot. `packShotSrc(8)`, hero `pack-merv8.png` (RGBA cutout on the 508×833 canvas), `source/merv-8-packshot.png`, shop 6-pack / 3/4, and `merv-8-macro.png` (clean mesh crop) all come from that photo. Cache `?v=fh095` / `?v=fh170`. Layers exploded diagram stays — it has no lockup.
- **Files:** `client/public/hero/pack-merv8.png`, `client/public/products/merv-8-packshot.png`, `client/public/products/source/merv-8-packshot.png`, `client/public/products/merv-8-thin-rectangle-6pack.png`, `client/public/products/merv-8-thin-rectangle-no-labels.png`, `client/public/products/merv-8-macro.png`, `client/src/components/Hero.tsx`, `shared/products.ts`
- **Verify:** `/` hero MERV 8 has no Filter King and no FILTER HERO lockup. `/sizes/20x25x1` gallery hero matches. Cart thumbnail matches.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-242 — MERV 13 pack shots still said Filter King
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage hero, size-page gallery, cart, emails, and schema used the Filter King branded MERV 13 pack shot (`pack-merv13.png` / `merv-13-packshot.png`). The leftover 6-pack and three-quarter files still showed the lion lockup.
- **Do NOT:** Restore Filter King on `pack-merv13.png` or `merv-13-packshot.png`. Do not leave `PACK_SHOT_REV` / hero `ASSET` unbumped after swapping the files. Do not point MERV 13 hero, cart, or schema at `merv-13-thin-rectangle-6pack.png`. Do not let `scripts/label-pack-shots.py` overwrite `merv-13-packshot.png`. Do not flood-fill the hero cutout so the white cardboard frame disappears (FH-060).
- **Do:** Official MERV 13 pack is the uploaded isolated MERV 13 SUPERIOR shot (no Filter King lockup). `packShotSrc(13)`, hero `pack-merv13.png` (RGBA cutout on the 508×833 canvas), `source/merv-13-packshot.png`, and shop 6-pack / 3/4 all come from that photo. Cache `?v=fh094` / `?v=fh169`. Layers exploded diagram stays — it has no lockup.
- **Files:** `client/public/hero/pack-merv13.png`, `client/public/products/merv-13-packshot.png`, `client/public/products/source/merv-13-packshot.png`, `client/public/products/merv-13-thin-rectangle-6pack.png`, `client/public/products/merv-13-thin-rectangle-no-labels.png`, `client/src/components/Hero.tsx`, `shared/products.ts`
- **Verify:** `/` hero MERV 13 has no Filter King. `/sizes/20x25x1?merv=13` gallery hero matches. Cart thumbnail matches.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-241 — MERV 11 pack shots still said Filter King
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage hero, size-page gallery, cart, emails, and schema used the Filter King branded MERV 11 pack shot (`pack-merv11.png` / `merv-11-packshot.png`). The leftover 6-pack and three-quarter files still showed the lion lockup.
- **Do NOT:** Restore Filter King on `pack-merv11.png` or `merv-11-packshot.png`. Do not leave `PACK_SHOT_REV` / hero `ASSET` unbumped after swapping the files. Do not point MERV 11 hero, cart, or schema at `merv-11-thin-rectangle-6pack.png`. Do not let `scripts/label-pack-shots.py` overwrite `merv-11-packshot.png`.
- **Do:** Official MERV 11 pack is the isolated red MERV 11 ADVANCED shot (no Filter King lockup). `packShotSrc(11)`, hero `pack-merv11.png` (RGBA cutout on the 508×833 canvas), `source/merv-11-packshot.png`, and shop 6-pack / 3/4 all come from that photo. Cache `?v=fh096` / `?v=fh171`. Layers exploded diagram stays — it has no lockup. Do not flood-fill the hero cutout so the white cardboard frame disappears (FH-060).
- **Files:** `client/public/hero/pack-merv11.png`, `client/public/products/merv-11-packshot.png`, `client/public/products/source/merv-11-packshot.png`, `client/public/products/merv-11-thin-rectangle-6pack.png`, `client/public/products/merv-11-thin-rectangle-no-labels.png`, `client/src/components/Hero.tsx`, `shared/products.ts`, `scripts/click-ui.ts`
- **Verify:** `/` hero MERV 11 has no Filter King. `/sizes/20x25x1?merv=11` gallery hero matches. Cart thumbnail matches.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-240 — Carbon pack shots still said Filter King
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage hero, size-page gallery, cart, emails, and schema used the Filter King branded carbon 6-pack (`showcase-carbon.png` / `merv-carbon-thin-rectangle-6pack.png`) with a stamped MERV 8 Carbon plate.
- **Do NOT:** Point carbon at the stamped 6-pack. Do not let `scripts/label-pack-shots.py` overwrite `merv-carbon-packshot.png`. Do not leave `PACK_SHOT_REV` / hero `ASSET` unbumped after swapping the files. Do not overwrite `products/source/merv-8-thin-rectangle-*.png`.
- **Do:** Official carbon pack is the Filter Hero odor-eliminator isolated shot. `packShotSrc(8, true)`, hero `showcase-carbon.png` (RGBA cutout), `source/merv-carbon-packshot.png`, and shop 6-pack / 3/4 all come from that photo. Cache `?v=fh092` / `?v=fh167`. Layers exploded diagram stays — it has no lockup.
- **Files:** `client/public/hero/showcase-carbon.png`, `client/public/products/merv-carbon-packshot.png`, `client/public/products/source/merv-carbon-packshot.png`, `client/public/products/merv-carbon-thin-rectangle-6pack.png`, `client/public/products/merv-carbon-thin-rectangle-no-labels.png`, `client/src/components/Hero.tsx`, `shared/products.ts`, `scripts/label-pack-shots.py`, `scripts/verify-store.ts`
- **Verify:** `/` hero carbon says ODOR ELIMINATOR, no Filter King. `/sizes/20x25x1` carbon gallery hero matches. Cart thumbnail matches. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-239 — MERV 8 pack shots still said Filter King
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage hero, size-page gallery, cart, emails, and schema used the Filter King branded MERV 8 pack shot (`pack-merv8.png` / `merv-8-packshot.png`). The 6-pack, three-quarter, and shared mesh close-up also still showed the lion lockup.
- **Do NOT:** Restore Filter King on `pack-merv8.png` or `merv-8-packshot.png`. Do not leave `PACK_SHOT_REV` / hero `ASSET` unbumped after swapping the files. Do not overwrite `products/source/merv-8-thin-rectangle-*.png` — those stay the generation templates for carbon stamps.
- **Do:** Official MERV 8 pack is the Filter Hero branded isolated shot. `packShotSrc(8)`, hero `pack-merv8.png` (RGBA cutout), `source/merv-8-packshot.png`, shop 6-pack / 3/4, and `merv-8-macro.png` (mesh crop with Filter Hero marks) all come from that photo. Cache `?v=fh091` / `?v=fh166`. Layers exploded diagram stays — it has no lockup.
- **Files:** `client/public/hero/pack-merv8.png`, `client/public/products/merv-8-packshot.png`, `client/public/products/source/merv-8-packshot.png`, `client/public/products/merv-8-thin-rectangle-6pack.png`, `client/public/products/merv-8-thin-rectangle-no-labels.png`, `client/public/products/merv-8-macro.png`, `client/src/components/Hero.tsx`, `shared/products.ts`
- **Verify:** `/` hero MERV 8 says FILTER HERO. `/sizes/20x25x1` MERV 8 gallery hero matches. Cart thumbnail matches.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-238 — Retired hero flight stacks and unused shadcn kit still shipped
- **Status:** fixed
- **Area:** other
- **Symptom:** Two unused hero animation stacks (`HeroFlight`, `HeroSkyFlight`), their pose/frame assets, old banner composites, and 38 unused shadcn/ui components sat in the repo after the live hero became a still plus pack row.
- **Do NOT:** Remount `HeroFlight` or `HeroSkyFlight`. Do not restore `hero-banner.webp`, `showcase-merv*.png`, `stack-3.png`, or `/hero/flight` on the homepage. Do not reinstall unused Radix/shadcn primitives as if they were live shop UI.
- **Do:** Homepage hero is `character-fly-still.png` plus the four pack shots. Keep `/logo.png`, `/hero/pack-merv*.png`, `/hero/showcase-carbon.png`, and source sheets. Python generate scripts stay for rebuilds.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `package.json`, `client/src/components/ui/`
- **Verify:** `pnpm check`. `/` still shows the still character and four packs. Header still uses `/logo.png`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-237 — Live Klaviyo flow clones reject template PATCH
- **Status:** fixed
- **Area:** other
- **Symptom:** `PATCH /api/templates/{cloneId}` returned 404 “Template with id does not exist” for live flow clones (`UasA8c`, …) even though `GET` of the same id returned the ice-wordmark HTML. `--templates-only` therefore branded the library copies only, and live sends stayed unbranded.
- **Do NOT:** PATCH a live flow `template_id` clone as if it were a library template. Do not treat a library-only upsert as the live send.
- **Do:** Point the live send-email flow action at the branded library template id. Klaviyo clones that HTML onto a new `template_id`. `pnpm setup:klaviyo --templates-only` remounts any live send missing `/logo.png`. `pnpm verify:klaviyo` still fails if a live flow template is missing the lockup.
- **Files:** `scripts/setup-klaviyo-account.ts`, `scripts/verify-klaviyo.ts`, `docs/KLAVIYO.md`
- **Verify:** `pnpm verify:klaviyo`. GET a live send-email `template_id` — HTML includes `https://filterhero.net/logo.png`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-236 — Live Klaviyo flows still sent the ice wordmark
- **Status:** fixed
- **Area:** other
- **Symptom:** Library templates (`Uqkman`, …) had `/logo.png`, but live flow messages use clones (`UasA8c`, `YbpSVp`, …). Those clones still had the navy ice “Filter Hero” text, so welcome / abandon / replenish / win-back would send unbranded mail. Email-default logo `6540539` was also sized 240×566 (stretched).
- **Do NOT:** Treat a library template PATCH as the live send. Do not leave flow `template_id` clones on ice wordmark text. Do not render the lockup at 240×566.
- **Do:** Remount each live send-email action onto the branded library template (FH-237). `pnpm verify:klaviyo` fails if a live flow template is missing `https://filterhero.net/logo.png`. Brand logo aspect stays ~200×141 / 240×170.
- **Files:** `scripts/setup-klaviyo-account.ts`, `scripts/verify-klaviyo.ts`, `docs/KLAVIYO.md`
- **Verify:** `pnpm verify:klaviyo`. GET a live flow template — HTML includes `/logo.png`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-235 — Resend mail was unbranded plain text
- **Status:** fixed
- **Area:** contact
- **Symptom:** Resend only sent a plain-text staff lead alert. Quote/support receipts and the order confirmation were documented as Filter Hero mail but never left as branded HTML, so the inbox did not match Klaviyo/Stripe (logo, navy `#203868`, burgundy `#7F2328`).
- **Do NOT:** Send Resend mail as text-only. Do not use ice wordmark text instead of `/logo.png`. Do not send from `onboarding@resend.dev`. Do not add welcome / abandon / replenish to `server/mailer.ts`.
- **Do:** `shared/email-brand.ts` is the kit. `server/mailer.ts` sends the staff alert, quote/support receipt, and order confirmation with the shop lockup. From is `Filter Hero <info@filterhero.net>`. Clock saves stay staff-only.
- **Files:** `shared/email-brand.ts`, `server/mailer.ts`, `server/contact.ts`, `server/stripe.ts`, `scripts/verify-resend.ts`, `docs/RESEND.md`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend`. HTML includes `https://filterhero.net/logo.png`, `#203868`, and `#7F2328`. Paid checkout copy mentions the Filter Hero confirmation.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-234 — Klaviyo emails used text wordmark instead of the Filter Hero logo
- **Status:** fixed
- **Area:** other
- **Symptom:** Live welcome / abandon / replenish / win-back templates were navy bars with ice “Filter Hero” text. Brand library had no logo, colors, or buttons. Email defaults were generic gray Helvetica with a broken logo id, and the asset library “Primary Logo” was a leftover S-curve mark.
- **Do NOT:** Send Klaviyo mail with ice wordmark text instead of `/logo.png`. Do not point brand defaults at a missing logo id. Do not use the generic S-curve as Filter Hero.
- **Do:** Brand library logo is the shop lockup (`https://filterhero.net/logo.png`). Email defaults header is white with that logo; footer is navy `#203868`. Header links are live shop URLs. All twelve FH CODE templates embed the same mark. `pnpm setup:klaviyo --templates-only` upserts them.
- **Files:** `scripts/setup-klaviyo-account.ts`, `scripts/verify-klaviyo.ts`, `scripts/inspect-klaviyo-account.ts`, `docs/KLAVIYO.md`
- **Verify:** `pnpm verify:klaviyo`. Live Welcome D0 HTML includes `https://filterhero.net/logo.png`. Klaviyo Brand Library shows Filter Hero Logo. New drag-and-drop email uses the logo in the header.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-233 — Remove Filter King now-at lockup from the hero
- **Status:** fixed
- **Area:** other
- **Symptom:** Desktop hero showed the Filter King / “NOW AT” / Filter Hero plate (`fh-sells-fk.png`) above the four packs.
- **Do NOT:** Restore `.hero-filter-claim`, `.hero-build-tag`, or `/hero/fh-sells-fk.png` on the hero. Do not put “Filter King now at Filter Hero” (or FROM / SELLS) back in that slot.
- **Do:** Hero right column is packs + brand row only. Packs sit in the former lockup space (`top: 4%` desktop, `6%` on short viewports).
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/src/lib/hero-flight.ts`, `scripts/smoke-site.ts`
- **Verify:** `/` desktop — no Filter King lockup above the packs. Mobile hero unchanged (claim was already hidden).
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-232 — Measure diagram logged non-animatable opacity
- **Status:** fixed
- **Area:** measure
- **Symptom:** Homepage console warned that Framer Motion was animating opacity from `undefined` to `1` / `0.18` / `0.22` on the tape-measure edges.
- **Do NOT:** Animate SVG `motion.line` opacity without an `initial` value.
- **Do:** Set `initial` to the same opacity as `animate` so the first paint is a number.
- **Files:** `client/src/components/MeasureFilterDiagram.tsx`
- **Verify:** Homepage console has no "value-not-animatable" opacity warning from the measure diagram.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-231 — Local Klaviyo onsite CORS failed on HTTP→HTTPS redirect
- **Status:** fixed
- **Area:** other
- **Symptom:** On `http://127.0.0.1:3000`, Klaviyo.js posted to `http://a.klaviyo.com/client/profiles`. Klaviyo 301s that to HTTPS, so Chrome blocked the CORS preflight: "Redirect is not allowed for a preflight request." `/api/identify` still wrote the profile. Production HTTPS was already fine.
- **Do NOT:** Open plaintext Klaviyo in the production CSP. Do not drop `/api/identify` — onsite is extra, not the source of truth. Do not rewrite non-Klaviyo HTTP URLs.
- **Do:** Before loading onsite JS on an HTTP shop, rewrite `http://*.klaviyo.com` fetch/XHR/beacon URLs to HTTPS. Keep the server identify/track fallback.
- **Files:** `shared/klaviyo-onsite.ts`, `client/src/lib/klaviyo.ts`, `scripts/verify-klaviyo.ts`, `scripts/verify-security.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:klaviyo`. `pnpm verify:security`. `pnpm smoke`. Homepage console has no CORS error on `a.klaviyo.com`. Network tab shows `https://a.klaviyo.com/client/profiles`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-230 — Klaviyo Stripe checker treated metrics as missing
- **Status:** fixed
- **Area:** other
- **Symptom:** `scripts/check-klaviyo-stripe.ts` printed Successfully Paid / Failed Payment / Refunded Payment / Issued Invoice as `id: null` even though those metrics exist (`XHuURz`, `RHcdHv`, `TvC7dY`, `Vi3YJt`). The metrics list call used `page[size]`, which revision `2026-07-15` rejects (`'page_size' is not a valid field for the resource 'metric'`), and the script swallowed the 400.
- **Do NOT:** List `/api/metrics?page[size]=…`. Do not treat an empty checker report as proof the Stripe app is missing.
- **Do:** Filter `equals(integration.name,"Stripe")` with no `page[size]`. Fail the script if the native webhook or any of the four metric ids is missing.
- **Files:** `scripts/check-klaviyo-stripe.ts`
- **Verify:** `pnpm check`. `pnpm exec tsx scripts/check-klaviyo-stripe.ts` prints the four metric ids. `pnpm verify:klaviyo`.
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-229 — Native Klaviyo Stripe app accepts webhooks but does not record metrics
- **Status:** mitigated
- **Area:** other
- **Symptom:** Sandbox webhook `we_1UGWbF790NnFGDLvIVtyg0bK` returned 200 for `invoice.payment_succeeded` / `charge.succeeded`, but Successfully Paid / Issued Invoice stayed at 0. Historical import on the Klaviyo Stripe app also recorded 0 events.
- **Do NOT:** Treat HTTP 200 as a recorded metric. Do not OAuth Klaviyo to **FILTER HERO sandbox** (`acct_1U9bqs790NnFGDLv`) — Stripe Sandboxes cannot connect to live Klaviyo. Do not run `pnpm setup:klaviyo-stripe` / `scripts/test-klaviyo-stripe.ts` against local sandbox keys and expect native metrics. Do not add Checkout session events to the Klaviyo endpoint. Do not trigger replenish, abandon, or a second receipt from Successfully Paid. Do not use `@filterhero.net` as the Stripe test email.
- **Do:** Klaviyo **Connect to Stripe** on **FILTER HERO** (`acct_1U9bqlQEENEs0Qmw`, created Aug 28). Native charge/invoice destination on that account’s **test mode** is `we_1UGgz8QEENEs0QmwgI31tz6f`. Paste *that* endpoint’s signing secret in Klaviyo. Pay a Mailinator $19.99 invoice on the same account (`in_1UGh9MQEENEs0QmwGHgzYhHK` is the draft). Shop Placed Order stays on `/api/stripe/webhook`. Local `STRIPE_SECRET_KEY` remaining sandbox is expected until Railway uses `sk_live_`.
- **Files:** `server/klaviyo-stripe.ts`, `shared/klaviyo-stripe.ts`, `client/src/pages/admin/Settings.tsx`, `scripts/check-klaviyo-stripe.ts`, `docs/KLAVIYO.md`
- **Verify:** Staff Settings shows Stripe key account name. `pnpm exec tsx scripts/check-klaviyo-stripe.ts` prints `oauthAccountMatch`. Successfully Paid activity > 0 after a paid FILTER HERO test invoice. Profile `01M2PTB9BJ9QM5XX5B5705RQQ6` exists (Placed Order already recorded).
- **Added:** 2026-09-17
- **Fixed:** 2026-09-17

---

### FH-228 — Klaviyo had no native Stripe charge/invoice webhook
- **Status:** mitigated
- **Area:** other
- **Symptom:** Filter Hero already posted Placed Order from `checkout.session.completed`, but Stripe had only that fulfillment endpoint. Klaviyo’s Stripe app never received charge/invoice events, so Successfully Paid / Failed Payment / Refunded Payment stayed empty.
- **Do NOT:** Point the Filter Hero webhook at Klaviyo. Do not add Checkout session events to the Klaviyo endpoint. Do not trigger replenish, abandon, or a second receipt from Successfully Paid.
- **Do:** `pnpm setup:klaviyo-stripe` (or staff Settings → Klaviyo + Stripe → Connect) creates `https://a.klaviyo.com/api/webhook/integration/stripe?c={company}` for charge + invoice events. Finish Connect to Stripe in the Klaviyo UI and paste the signing secret. Shop ecommerce stays on `/api/stripe/webhook`.
- **Files:** `shared/klaviyo-stripe.ts`, `server/klaviyo-stripe.ts`, `scripts/setup-klaviyo-stripe.ts`, `server/admin/routes.ts`, `client/src/pages/admin/Settings.tsx`, `docs/KLAVIYO.md`
- **Verify:** `pnpm setup:klaviyo-stripe`. `pnpm verify:klaviyo`. Dashboard → Webhooks lists the Klaviyo URL enabled. Settings shows Native charge and invoice webhook on.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-227 — QuickBooks Connect was sandbox-only
- **Status:** mitigated
- **Area:** other
- **Symptom:** Local OAuth reached Sandbox Company US d6fd. `filterhero.net` had no `/api/intuit` routes and no Intuit env, so live books could not connect.
- **Do NOT:** Connect Production keys from localhost. Do not `railway up` this branch while `main` lacks the Intuit routes (FH-187). Do not put Intuit secrets in `VITE_` vars.
- **Do:** Railway `INTUIT_CLIENT_ID` / `SECRET` are the Production keys, `INTUIT_ENVIRONMENT=production`, `INTUIT_REDIRECT_URI=https://filterhero.net/api/intuit/oauth/callback`. Persist tokens in `DATA_DIR=/data`. Staff Connect on `https://filterhero.net/admin/settings`. Local `.env` stays Development / sandbox.
- **Files:** `scripts/setup-intuit-live.ts`, `server/intuit/`, `shared/intuit-oauth.ts`, `client/src/pages/admin/Settings.tsx`
- **Verify:** Live callback `GET /api/intuit/oauth/callback` 302s to `/admin/settings?intuit=csrf` (not SPA HTML). `/api/admin/intuit/status` is 401 JSON when signed out. Intuit Production Redirect URIs lists `https://filterhero.net/api/intuit/oauth/callback`. Staff Settings → Connect authorizes the real company.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-226 — Intuit rejected Filter Hero redirect_uri
- **Status:** mitigated
- **Area:** other
- **Symptom:** Connect opened Intuit, then: “The redirect_uri query parameter value is invalid.” First keys were **Production**; localhost is not allowed on that set.
- **Do NOT:** Register `localhost:3000`, `https://localhost`, a trailing slash, or put localhost on **Production** keys. Do not Connect locally with production Client ID/Secret.
- **Do:** Local `.env` uses **Development** keys, `INTUIT_ENVIRONMENT=sandbox`, and `http://localhost:3001/api/intuit/oauth/callback` on Keys & OAuth → **Development**. Production keys stay for Railway + `https://filterhero.net/api/intuit/oauth/callback`.
- **Files:** `server/admin/data.ts`, `client/src/pages/admin/Settings.tsx`, `client/src/lib/admin-api.ts`
- **Verify:** Intuit Development Redirect URIs lists that line. Settings → Connect signs in instead of the red connection problem.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-225 — Settings Connect crashed with Something went wrong
- **Status:** fixed
- **Area:** other
- **Symptom:** Staff `/admin/settings` showed Client ID on, then Connect printed **Something went wrong.** and never opened Intuit.
- **Do NOT:** Remove `import { randomBytes } from "node:crypto"` from `server/intuit/oauth.ts`. Do not let Connect throw into the generic 500 handler.
- **Do:** `defaultState()` must call imported `randomBytes`. Connect catches throws and returns `intuit_connect_failed`. `pnpm verify:intuit-oauth` asserts the import.
- **Files:** `server/intuit/oauth.ts`, `server/admin/routes.ts`, `scripts/verify-intuit-oauth.ts`
- **Verify:** `pnpm verify:intuit-oauth`. Staff Settings → Connect opens Intuit, not a red "Something went wrong."
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-224 — Intuit OAuth questionnaire item 6 was not implemented
- **Status:** fixed
- **Area:** other
- **Symptom:** The Intuit Developer form asks whether the app handles expired access tokens, expired refresh tokens, `invalid_grant`, and CSRF. Discovery URLs existed; none of those four cases did.
- **Do NOT:** Exchange an authorization `code` before matching `state`. Do not retry `invalid_grant`. Do not keep using a rotated refresh token. Do not put Intuit secrets in `VITE_` vars.
- **Do:** On QBO `401` or access expiry, refresh once and retry. On expired refresh or `invalid_grant`, clear tokens and require Connect again. Issue a one-shot `state`, reject mismatch/missing/stale/replay, and never hit the token endpoint on CSRF.
- **Files:** `shared/intuit-oauth.ts`, `server/intuit/oauth.ts`, `server/intuit/routes.ts`, `server/intuit/store.ts`, `client/src/pages/admin/Settings.tsx`, `scripts/verify-intuit-oauth.ts`, `docs/INTUIT-OAUTH.md`
- **Verify:** `pnpm verify:intuit-oauth`. Staff `/admin/settings` → QuickBooks Online → Connect. Bad callback `state` lands on `?intuit=csrf`.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-223 — Stripe, Klaviyo, CRM, and accounts still had the old catalog
- **Status:** fixed
- **Area:** catalog | pricing
- **Symptom:** FH-217 restricted the shop to Paul’s 293 contractor SKUs, but Stripe had no Product catalog (Checkout used ad-hoc `price_data`), Klaviyo `setup:klaviyo` skipped catalog jobs when the old feed was larger, Supabase had no SKU table, and `/account` would pin off-sheet sizes.
- **Do NOT:** Skip `pnpm sync:catalog` after a sheet rebuild. Do not put wholesale cost on Stripe Products, Klaviyo items, or `catalog_skus`. Do not let `setup:klaviyo` skip when existing catalog count ≥ sheet count.
- **Do:** `scripts/sync-catalog.ts` upserts Stripe Products (`prod_fh_{id}`), Klaviyo custom-catalog items (create / update / delete), and `catalog_skus`. Checkout attaches the synced Product when it exists and still uses qty-tier `price_data`. Saved filters must be in-stock sheet SKUs.
- **Files:** `scripts/sync-catalog.ts`, `scripts/lib/catalog-sync.ts`, `shared/stripe-catalog.ts`, `shared/products.ts`, `server/stripe.ts`, `server/account.ts`, `supabase/migrations/0005_catalog_skus.sql`, `scripts/setup-klaviyo-account.ts`
- **Verify:** `pnpm sync:catalog`. `pnpm verify:store`. `pnpm verify:klaviyo`. `pnpm verify:supabase`. Admin `/admin` catalog shows 293 SKUs. Stripe Dashboard → Products is the contractor list.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-222 — Hero still rebuilt from the official character sheet
- **Status:** fixed
- **Area:** photos
- **Symptom:** The Seedance fly plate (even knocked out) was the wrong mascot drawing. Shoppers need the official sheet character, clearly visible, sitting in the site navy — not a white studio card.
- **Do NOT:** Composite the sheet onto white. Do not paint a Seedance or `#203868` plate behind him. Do not scale a full-bleed 4K photo of a tiny flyer.
- **Do:** Knock out the studio fill from `character-sheet.png`. Serve the RGBA cutout as `character-fly-still.png`. Size and place him in `.hero-sky-fill` with `object-fit: contain` so `.hero-cast-stage` chrome shows through. Cache `?v=fh165`.
- **Files:** `client/public/hero/character-sheet.png`, `client/public/hero/character-fly-still.png`, `scripts/_compose_hero_logo_still.py`, `client/src/components/Hero.tsx`, `client/src/index.css`, `scripts/smoke-site.ts`
- **Verify:** Homepage hero — official flying pose, no white rectangle, navy matches the header, flyer is large and readable, packs and copy still work.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-221 — Hero still was flat `#203868` over chrome navy
- **Status:** fixed
- **Area:** photos
- **Symptom:** Header, footer, and trust marquee are `#1b3258` → `#23406a` plus ice/red radials. FH-220 filled the fly still with flat `--navy` (`#203868`), so the hero sky looked like a different, flatter blue.
- **Do NOT:** Paint an opaque Seedance or `#203868` plate behind the flyer. Do not try to match chrome by sampling a different navy into the PNG.
- **Do:** Knock the still sky to transparent. `.hero-cast-stage` already uses the same gradient as `.site-header` / `.trust-marquee`. Cache `?v=fh164`.
- **Files:** `client/public/hero/character-fly-still.png`, `scripts/_pop_hero_still.py`, `client/src/components/Hero.tsx`
- **Verify:** Homepage — header, hero, and trust marquee are one navy. Flyer still pops. No rectangle around the plate.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-220 — Hero sky was Seedance navy, not site chrome
- **Status:** fixed
- **Area:** photos
- **Symptom:** Header, footer, and trust marquee use `#1b3258` → `#23406a`. The hero still was the Veo/Seedance plate (`#1a2e4e` → `#2f446e`), so the sky looked like a different blue.
- **Do NOT:** Leave the fly still on Seedance navy. Do not hide the mismatch by darkening copy overlays.
- **Do:** Paint the still background `--navy` (`#203868`) so zoom cannot drift off the chrome. `.hero-cast-stage` shares the header gradient. `.trust-marquee` starts on `#1b3258`. Cache `?v=fh163`.
- **Files:** `client/public/hero/character-fly-still.png`, `scripts/_pop_hero_still.py`, `client/src/index.css`, `client/src/components/Hero.tsx`
- **Verify:** Homepage — header, hero sky, and trust marquee read as one navy. Flyer still pops. No rectangle around the plate.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-219 — Hero still blended into the navy sky
- **Status:** fixed
- **Area:** photos
- **Symptom:** `character-fly-still.png` was the same pose on Seedance navy, so the cape and pants disappeared into the stage. Zooming the plate (FH-218) made a ghost bigger, not clearer.
- **Do NOT:** Add a halo, drop-shadow plate, or a new pose. Do not re-run `_pop_hero_still.py` on the popped file.
- **Do:** Keep the Seedance silhouette and 3840×2160 navy. Lift cape/pants toward ice, punch the crimson, and brighten the filter grid. Cache `?v=fh161`.
- **Files:** `client/public/hero/character-fly-still.png`, `client/src/components/Hero.tsx`, `scripts/_pop_hero_still.py`
- **Verify:** Homepage hero — same flying pose, red body and ice cape read against the navy, grid visible, no rectangle around the plate.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-218 — Hero still was too small to read
- **Status:** fixed
- **Area:** photos
- **Symptom:** After FH-216 the fly still filled the stage at 1×, so Filter Hero sat tiny in the navy and the copy wash plus packs covered him.
- **Do NOT:** Scale `.hero-character` below 1 — that boxes the plate (FH-158). Do not add a drop-shadow or slot mask around the PNG.
- **Do:** Keep the still full-bleed in `.hero-sky-fill` with overflow clipped. Zoom the plate above 1 and park the flyer in the open sky. Desktop: between copy and packs. Mobile: reserved sky band above the copy (`::before` spacer). Copy gradient stops before the mascot.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero — red flyer and filter-grid cape are obvious in the sky. Title stays readable. Packs still sit on the right. No rectangle around the plate.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-217 — Shop sold the archive instead of Paul’s contractor list
- **Status:** fixed
- **Area:** catalog | pricing
- **Symptom:** Storefront listed the 9,000+ archived Filter King sizes. Paul’s new contractor commerce CSV is the product list and the wholesale cost source (293 size × MERV lines / 153 sizes, including 9 carbon SKUs).
- **Do NOT:** Hardcode `SELLABLE_ONLY = false`. Do not drop carbon rows from `sellable-skus.json`. Do not delete `shared/filter-catalog.json`.
- **Do:** Import `shared/pricing/fk-contractor-commerce.csv` with `scripts/build-sellable-skus.ts`. Shop = that allowlist when `VITE_FULL_CATALOG=false`. Carbon on the sheet is sellable. Off-list sizes stay in the archive and route to quote. Rebuild costs when Paul sends a new sheet.
- **Files:** `shared/pricing/fk-contractor-commerce.csv`, `shared/sellable-skus.json`, `scripts/build-sellable-skus.ts`, `shared/products.ts`, `docs/WHOLESALE-PRICE-LISTS.md`, `.env`, `.env.example`
- **Verify:** `pnpm verify:store`. `pnpm verify:json`. `/sizes` shows 153 contractor sizes. `/sizes/20x25x1` offers MERV 8, Carbon, 11, and 13. `/sizes/14x25x1` offers MERV 8 only.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-216 — Homepage hero looped a background flight video
- **Status:** fixed
- **Area:** other
- **Symptom:** The homepage hero sky played `character-fly-natural` webm/mp4 behind the copy and pack lineup.
- **Do NOT:** Mount a looping `<video>` in `.hero-sky-fill`.
- **Do:** Background plate is the still `character-fly-still.png`. Stage fallback remains `#1a2f50`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `scripts/smoke-site.ts`
- **Verify:** Homepage hero has no `<video>`. Sky fill is the still PNG. Copy, packs, and brand marks still render.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-215 — Toasts never mounted; staff OTP hidden until a second send
- **Status:** fixed
- **Area:** cart | other
- **Symptom:** Checkout with an empty cart email did nothing visible. Cart toasts live inside `#root`, so the open drawer marked them inert. `sonner.tsx` also imported `next-themes` while the app uses the Vite `ThemeProvider`. Staff login hid the 6-digit field until "Send link" ran, so an already-issued OTP could not be typed.
- **Do NOT:** Import `next-themes` in `sonner.tsx`. Do not render the toaster inside `#root`. Do not leave the OTP field behind a send-only gate.
- **Do:** Toaster reads `useTheme` from `ThemeContext`, portals onto `document.body`, and sits above the cart drawer (`z-index: 70`). Cart email is `required`. Staff login has "I already have a code".
- **Files:** `client/src/components/ui/sonner.tsx`, `client/src/components/CartDrawer.tsx`, `client/src/pages/admin/Login.tsx`, `scripts/verify-admin.ts`
- **Verify:** Empty cart checkout shows the email field's native error. Invalid email shows an error inside the drawer. `toast.error` is visible over the drawer. `/admin` can open the code field without sending another link. `pnpm verify:admin`.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-214 — Admin console bugs after the first landing
- **Status:** fixed
- **Area:** other
- **Symptom:** Header popular sizes could drift from `popularSizeSlugs(8)` because they sliced the carousel's 16. Analytics strokes used `hsl(var(--primary))` while `--primary` is already `#203868`. Contacts search fired two API calls per keystroke and could 429. A Klaviyo health outage blanked the whole systems card. Clearing tagline on save failed Zod `min(1)`.
- **Do NOT:** Slice `featuredSizes(16)` down to 8 for the header. Do not wrap `#203868` in `hsl()`. Do not fetch list endpoints on every search keypress without a debounce and a stale-response guard.
- **Do:** Header calls `featuredSizesFromConfig(slugs, 8)`. Charts use `#203868`. `useAdminLoad` debounces and ignores out-of-order responses. Health loads CRM/account/Klaviyo in parallel and keeps the page up if Klaviyo throws. Blank required copy is dropped so defaults stay.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/pages/admin/use-admin-load.ts`, `client/src/pages/admin/Analytics.tsx`, `server/admin/routes.ts`, `server/admin/config.ts`, `scripts/verify-admin.ts`, `scripts/smoke-admin.ts`
- **Verify:** `pnpm verify:admin`. `pnpm smoke:admin` against the running API. Header chips match `popularSizeSlugs(8)` when featured sizes are empty.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-213 — Staff console was quotes-only
- **Status:** fixed
- **Area:** other
- **Symptom:** `/admin` was a quotes Kanban with no orders, customers, content, analytics, security, or maintenance. Staff had to use Stripe/Klaviyo/JSON files for everything else.
- **Do NOT:** Let the browser query Postgres. Do not send mail or write Klaviyo from `server/admin/` or `server/crm/`. Do not store Stripe/Resend secrets in `site-config.json`. Do not make `/admin` indexable.
- **Do:** Staff console modules sit behind `requireStaff` at `/api/admin/*`. Homepage copy, FAQs, featured sizes, and checkout pause live in `server/data/site-config.json`. Catalog SKUs stay in shared JSON and still ship with a deploy. STAFF_EMAILS remains the allowlist.
- **Files:** `server/admin/`, `client/src/pages/admin/`, `shared/site-config.ts`, `client/src/contexts/SiteConfigContext.tsx`, `scripts/verify-admin.ts`
- **Verify:** `pnpm verify:admin`. Sign in at `/admin` — overview, quotes, contacts, orders, customers, catalog, content, analytics, tracking, staff, security, settings, maintenance. Public `/api/site-config` has no secrets. Maintenance mode returns 503 from `/api/checkout`.
- **Added:** 2026-09-16
- **Fixed:** 2026-09-16

---

### FH-212 — Local CSP still blocked Klaviyo identify after FH-209
- **Status:** fixed
- **Area:** other
- **Symptom:** Dev `connect-src` listed `http://*.klaviyo.com` (FH-209) but the onsite script still posted to `http://a.klaviyo.com/client/profiles` and Chrome blocked it. `/api/identify` was 200. Production HTTPS is fine.
- **Do NOT:** Add `http://a.klaviyo.com` or `http://*.klaviyo.com` to the production CSP. Do not drop `https://*.klaviyo.com`.
- **Do:** Development `connect-src` includes both `http://*.klaviyo.com` and `http://a.klaviyo.com`. Restart Vite after changing `vite.config.ts` headers. Production keeps HTTPS Klaviyo plus `upgrade-insecure-requests`.
- **Files:** `shared/security-headers.ts`, `scripts/verify-security.ts`
- **Verify:** `pnpm verify:security`. Local HTML CSP includes `http://a.klaviyo.com`. After Vite restart, console has no CSP violation on `a.klaviyo.com`. Leftover CORS on localhost HTTP is Klaviyo redirecting http→https; `/api/identify` still writes the profile. Production HTTPS has no Klaviyo CSP error.
- **Added:** 2026-09-11
- **Fixed:** 2026-09-11

---

### FH-211 — Stripe Tax was calculating (and billing) at Checkout
- **Status:** fixed
- **Area:** other
- **Symptom:** Checkout sent `automatic_tax.enabled=true` once Tax Settings were active. Stripe bills a tax-calculation fee on completed live sessions and finalized invoices. The plan was QuickBooks Online Automated Sales Tax (Online Tax app) + the Stripe Connector, not paid Stripe Tax.
- **Do NOT:** Turn `automatic_tax` back on when head office or registrations exist. Do not enable Tax → Integrations automatic collection on invoices or Payment Links. Do not add Stripe tax registrations to “fix” a missing tax line.
- **Do:** Keep `automatic_tax.enabled=false`. Collect payment on Stripe; record/apply sales tax in QuickBooks Online. Checkout still creates Customer + Invoice for the connector.
- **Files:** `server/stripe.ts`, `shared/stripe-tax.ts`, `scripts/debug-stripe-checkout.ts`, `scripts/verify-stripe-books.ts`, `docs/STRIPE-BOOKS.md`, `README.md`
- **Verify:** `pnpm exec tsx scripts/debug-stripe-checkout.ts` — session `automatic_tax.enabled` is false. Live Dashboard Tax → Integrations is off. New completed checkouts do not show a Stripe Tax fee.
- **Added:** 2026-09-11
- **Fixed:** 2026-09-11

---

### FH-210 — Production still ran an older main build
- **Status:** fixed
- **Area:** other
- **Symptom:** Local had CRM, accounts, Klaviyo, Turnstile, and security headers. `filterhero.net` was Railway `main` without them (`X-Powered-By: Express`, no CSP). A `railway up` of this branch would be rolled back by GitHub autodeploy from `main` (FH-187). The working tree also had scrape/video scripts that are not the shop.
- **Do NOT:** `railway up` this branch while `main` is behind. Do not commit `.firecrawl/`, Veo/cape-fly generators, or `.cursor/mcp.json` with the shop. Do not put service-role keys in `VITE_` vars.
- **Do:** Ship only the finished shop/CRM/Klaviyo/security stack. Merge that commit to `main` so autodeploy and local are the same code. Leave scrape and video scripts uncommitted.
- **Files:** `server/`, `client/src/`, `shared/security-headers.ts`, `supabase/migrations/`, `scripts/verify-*.ts`
- **Verify:** `https://filterhero.net/api/health` has nosniff, DENY, CSP, HSTS, and no `X-Powered-By`. `/login` and `/admin` 200. CRM and account 401 when signed out. Railway `771641a8` SUCCESS from `20c53e8` (PR #5).
- **Added:** 2026-09-11
- **Fixed:** 2026-09-11

---

### FH-209 — Local CSP blocked Klaviyo onsite identify
- **Status:** fixed
- **Area:** other
- **Symptom:** Dev CSP `connect-src` allowed `https://*.klaviyo.com` only. On `http://localhost:3000` the onsite script posts to `http://a.klaviyo.com/client/profiles`, so the browser blocked identify/track. Checkout still reached Stripe; Klaviyo never saw the email on localhost.
- **Do NOT:** Add `http://*.klaviyo.com` to the production CSP. Do not drop `https://*.klaviyo.com`.
- **Do:** Development `connect-src` includes `http://*.klaviyo.com`. Production keeps HTTPS Klaviyo plus `upgrade-insecure-requests`.
- **Files:** `shared/security-headers.ts`, `scripts/verify-security.ts`
- **Verify:** `pnpm verify:security`. Local HTML `Content-Security-Policy` includes `http://*.klaviyo.com`. Console has no CSP violation on `a.klaviyo.com`. Leftover CORS on localhost HTTP is Klaviyo redirecting http→https; `/api/identify` still writes the profile.
- **Added:** 2026-09-11
- **Fixed:** 2026-09-11

---

### FH-208 — Production staff magic links could not land on /admin
- **Status:** fixed
- **Area:** other
- **Symptom:** Supabase Auth allows `https://filterhero.net/login` and `/account`, but not `/admin`. Staff OTP used `emailRedirectTo` `/admin`, so the production magic link fell back to the Site URL (`http://localhost:3000`). The 6-digit code still worked.
- **Do NOT:** Point staff `emailRedirectTo` at `/admin` until that exact URL is on the Auth allowlist and the Site URL is `https://filterhero.net`.
- **Do:** Staff magic links land on `/login`. `sessionStorage` stores the staff email; after PKCE exchange, `/login` and `/account` send only that email to `/admin`. Shopper sessions are not redirected. Keep `safeNextPath` rejecting `/admin`.
- **Files:** `client/src/pages/admin/Login.tsx`, `client/src/pages/account/Login.tsx`, `client/src/pages/account/Account.tsx`, `client/src/lib/staff-auth.ts`, `shared/staff-auth.ts`, `scripts/check-auth-redirects.ts`, `scripts/verify-account.ts`
- **Verify:** `pnpm verify:account`. `pnpm exec tsx scripts/check-auth-redirects.ts` — production `/login` allowed; evil URL blocked. Staff Send link on production, open the email, land on `/admin`.
- **Added:** 2026-09-11
- **Fixed:** 2026-09-11

---

### FH-207 — Hash jumps landed under the two-row phone header
- **Status:** fixed
- **Area:** header
- **Symptom:** After FH-206 the sticky header is ~137px. `#clock` / `#finder` / `#contact` used `scroll-mt-28` (112px) and `nearHashTarget` treated anything under 200px as done. Drawer Filter Clock closed the sheet, then the section title sat under the finder row (clock top ~86px).
- **Do NOT:** Scroll hash targets with a fixed 7rem margin. Do not treat `top < 200` as “close enough” when the header is taller than that.
- **Do:** `html` uses `scroll-padding-top: calc(var(--site-header-h) + 0.5rem)`. `scrollToHashTarget` offsets by `--site-header-h`. `nearHashTarget` requires the section to clear the header. Drawer hash links wait 80ms after the sheet closes so Radix scroll unlock does not fight the jump.
- **Files:** `client/src/hooks/useHashScroll.ts`, `client/src/index.css`, `client/src/components/SiteHeader.tsx`
- **Verify:** Phone `/` → hamburger → Filter Clock. `#clock` heading sits below the finder, not under it. Knobs 44px.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-206 — Phone header was 308px and crushed the first screen
- **Status:** fixed
- **Area:** header
- **Symptom:** On a 390px phone the sticky header stacked logo, Custom/Sign in/Cart, wrapped Shop/Brands/Clock/Contact/Measure, and the size finder (~308px). `.home-first` is `100dvh` minus `--site-header-h`, so the hero H1, lede, and CTAs clipped. Same chrome sat on every shopper page.
- **Do NOT:** Put Shop/Brands/Clock/Contact/Measure/Custom back in the phone header bar. Do not drop `.header-cart`, `.header-menu-btn`, or the drawer Measure chip below 44px. Do not shrink Filter Clock knobs below 44px to save drum space. Do not render 16 × 44px carousel dots.
- **Do:** Below `lg` (1024px): one slim row (hamburger, logo, account, cart) plus a visible size finder. Nav, brands, clock, measure, contact, and custom live in a left Sheet (`.header-mobile`). Desktop mega menus stay at `lg+`. Hide the extra hero “Filter Hero” lockup under 1024px. Let `.hero-copy` scroll on small screens so CTAs stay reachable. Carousels with 8+ slides use a `3 / 16` pager.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/index.css`, `client/src/components/CarouselDots.tsx`
- **Verify:** `/` at 390px — header ~2 rows; hero H1 + both CTAs visible; hamburger opens/closes; header Find lands on a size page. `/sizes/20x25x1` — product in first screen; sticky Add to cart. `/#clock` — knobs 44px. 1280px — desktop mega menus; no sticky ATC leak (FH-180).
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-205 — Public API had no headers, leaked parser text, and left browser grants on Postgres
- **Status:** fixed
- **Area:** other
- **Symptom:** Local and Railway origin sent `X-Powered-By: Express` and no CSP / nosniff / frame-deny / HSTS. `POST /api/identify` and `/api/track` returned raw Zod JSON. Malformed JSON dumped a body-parser HTML stack. Identify, track, and checkout had no rate limit. `X-Forwarded-For[0]` could skip limiters. Production Turnstile failed open if the secret was missing. Anon/authenticated still had table grants (RLS was the only gate). `/login?next=/account/../admin` could leave the site path.
- **Do NOT:** Re-enable `X-Powered-By`. Do not return `err.message` or Zod text from identify, track, webhook, or session lookup. Do not parse `X-Forwarded-For` yourself. Do not skip Turnstile in production when the secret is unset (except `intent=reminder`). Do not `CREATE POLICY` on CRM/account tables. Do not `GRANT` those tables to `anon` / `authenticated`.
- **Do:** Express (and Vite in dev) send nosniff, DENY framing, CSP, Referrer-Policy, Permissions-Policy, COOP; HSTS only on HTTPS production. JSON parse errors are `{code:invalid_json}`. Identify 20/min, track 40/min, checkout 10/15min. `req.ip` after `trust proxy 1`. Migration `0004_lock_browser_grants.sql` FORCE RLS + revoke browser grants. `safeNextPath` rejects `..`, `/admin`, `/api`, `/login`.
- **Files:** `server/security.ts`, `server/index.ts`, `server/contact.ts`, `shared/security-headers.ts`, `shared/account-paths.ts`, `vite.config.ts`, `supabase/migrations/0004_lock_browser_grants.sql`, `scripts/verify-security.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:security`. `pnpm verify:crm`. `pnpm verify:account`. `pnpm verify:supabase`. `pnpm smoke`. `curl.exe -sI http://127.0.0.1:3001/api/health` has nosniff and no `X-Powered-By`. Empty identify is `{"code":"identify_failed"}`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-204 — Checkout created a new Stripe Customer on every email
- **Status:** fixed
- **Area:** other
- **Symptom:** `createCheckoutSession` always passed `customer_creation: always` + `customer_email`. A repeat buyer became a second Stripe Customer, so invoices and the QBO connector could not attach to one person.
- **Do NOT:** Pass both `customer` and `customer_email`. Do not skip `customer_update` when reusing a customer and collecting shipping.
- **Do:** Look up `customers.list({ email })`. Reuse that id with `customer_update` name/address/shipping `auto`. First-time emails still use `customer_creation: always`.
- **Files:** `server/stripe.ts`, `scripts/debug-stripe-checkout.ts`
- **Verify:** `pnpm debug:stripe-checkout` — reuse session customer id matches the existing customer.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-203 — Stripe Dashboard had no fulfillment webhook
- **Status:** fixed
- **Area:** other
- **Symptom:** Local and Railway Checkout both talk to sandbox `acct_1U9bqs790NnFGDLv`. `/api/stripe/webhook` is live (unsigned POST is 400). Stripe listed **zero** webhook endpoints, so `checkout.session.completed` never wrote orders or synced Klaviyo / CRM / accounts. Tax Settings are still `pending` (no head office); that is separate and already gated (FH-139).
- **Do NOT:** Point the Dashboard endpoint at localhost. Do not put the `stripe listen` `whsec_` on Railway. Do not enable `automatic_tax` before head office exists.
- **Do:** `pnpm setup:stripe-webhook` creates `https://filterhero.net/api/stripe/webhook` for `checkout.session.completed` + `checkout.session.expired`. Put that endpoint's signing secret on Railway. Keep the CLI secret in local `.env`. Set head office in Tax Settings before expecting a tax line.
- **Files:** `scripts/setup-stripe-webhook.ts`, `scripts/debug-stripe-checkout.ts`, `scripts/verify-stripe-books.ts`, `scripts/verify-env.ts`, `docs/STRIPE-BOOKS.md`
- **Verify:** `pnpm setup:stripe-webhook`. `pnpm debug:stripe-checkout`. Dashboard → Webhooks shows the Filter Hero URL enabled. Railway `STRIPE_WEBHOOK_SECRET` last4 matches the Dashboard endpoint, not `stripe listen`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-202 — Lead mail still used the Resend sandbox From
- **Status:** fixed
- **Area:** contact
- **Symptom:** `filterhero.net` was verified on Resend with sending enabled, but local and Railway `RESEND_FROM` was `Filter Hero <onboarding@resend.dev>`. That sandbox identity can only deliver to the Resend account email, so quote/support alerts to `info@filterhero.net` fail or never look like Filter Hero mail.
- **Do NOT:** Send production mail from `onboarding@resend.dev`. Do not enable Resend receiving on `@` (that steals Google MX). Do not replace the Google SPF. Do not orange-cloud `resend._domainkey`, `rsend`, or `send`.
- **Do:** `RESEND_FROM=Filter Hero <info@filterhero.net>`. Default in code is the same if the env is unset. Contact sends use idempotency key `lead-email/{id}`. DMARC is `p=none` at `_dmarc.filterhero.net`. SDK is `resend` 6.x.
- **Files:** `server/contact.ts`, `.env.example`, `scripts/verify-resend.ts`, `docs/CLOUDFLARE-NAMESERVERS.md`, `docs/RESEND-FULL-BUILD.md`
- **Verify:** `pnpm verify:resend` sends to `delivered@resend.dev` from `info@filterhero.net`. Railway `RESEND_FROM` matches.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-201 — Production shop had Klaviyo keys but no live routes
- **Status:** fixed
- **Area:** contact
- **Symptom:** Railway already had `KLAVIYO_PRIVATE_API_KEY` / `KLAVIYO_PUBLIC_API_KEY` / `KLAVIYO_LIST_ID`. The live shop still served the pre-Klaviyo build, so `/api/klaviyo/config` and catalog 404ed and onsite never loaded. Revenue mapping and sending-domain verify were leftover UI clicks.
- **Do NOT:** Point `send.filterhero.net` at Klaviyo. Do not write `next_change_date` from Filter Clock or `/api/identify`. Do not add an order-confirmation flow.
- **Do:** Keep the three Klaviyo vars on Railway. Deploy the integration (`ecfd4b1d`). Map Placed Order → revenue, Ordered Product, Started Checkout, Added to Cart, Viewed Product. Sending domain `klv.filterhero.net` stays active. A later GitHub autodeploy from `main` can roll this `railway up` back until main has the same code.
- **Files:** `server/klaviyo.ts`, `server/index.ts`, `scripts/map-klaviyo-metrics.ts`, `docs/KLAVIYO.md`
- **Verify:** Live `/api/klaviyo/config` enabled + public site ID. Catalog 299 SKUs. `POST /api/identify` and reminder `/api/contact` 200. Bundle fetches `/api/klaviyo/config` and `static.klaviyo.com/onsite`. `pnpm map:klaviyo-metrics` all `ok`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-200 — Smoke died on a hot contact limiter, and empty checkout leaked Zod
- **Status:** fixed
- **Area:** contact
- **Symptom:** After earlier quote posts, `pnpm smoke` POSTed `/api/contact` and treated `429 rate_limited_contact` as a total failure. Empty `POST /api/checkout` logged a Zod stack and returned `err.message`. Production staff magic links to `https://filterhero.net/admin` are still not on the Auth allowlist (Site URL fallback is localhost).
- **Do NOT:** Require a successful contact send for smoke. Do not return raw Zod text from checkout. Do not treat a 429 with `rate_limited_contact` as a broken shop.
- **Do:** Smoke proves invalid contact 400, honeypot ignore-or-429, CRM/account 401, and Stripe checkout. Empty cart is `400 checkout_failed`. Add `https://filterhero.net/admin` in Auth → URL configuration before production staff links.
- **Files:** `scripts/smoke-site.ts`, `server/index.ts`, `scripts/verify-supabase.ts`
- **Verify:** `pnpm smoke`. `pnpm verify:supabase`. `pnpm check`. Empty checkout is `{"code":"checkout_failed"}`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-199 — Python tooling crashed on cwd, imports, and wholesale print
- **Status:** fixed
- **Area:** other
- **Symptom:** `python .firecrawl/write_wholesale_doc.py` died with `No module named 'compare_wholesale'`. Firecrawl one-shots used `Path(".firecrawl")` so they failed unless cwd was the repo root. `count_gaps.py` counted `size(20,` calls that no longer exist and reported 0 catalog sizes. `compare_wholesale.py` matched 299 SKUs then crashed printing popular rows (`KeyError: heroQ1`). Default `python` in some shells is 3.11 without numpy/docx.
- **Do NOT:** Import sibling `.firecrawl` modules without putting that folder on `sys.path`. Do not read scrapes from `Path(".firecrawl")`. Do not count catalog sizes with `size(\s*\d+` in `products.ts`. Do not print `heroQ1` off the raw comparison rows. Do not assume `python` is 3.12.
- **Do:** Resolve paths from `__file__`. Put `.firecrawl` on `sys.path` before `compare_wholesale`. Count sizes from `shared/filter-catalog.json`. Print popular rows from the summary dict. Run tooling with `py -3.12` after `py -3.12 -m pip install -r scripts/requirements.txt`.
- **Files:** `.firecrawl/write_wholesale_doc.py`, `.firecrawl/compare_wholesale.py`, `.firecrawl/count_gaps.py`, `.firecrawl/count_sitemap_urls.py`, `.firecrawl/parse_qty_blocks.py`, `scripts/_test_py.py`, `scripts/requirements.txt`
- **Verify:** `py -3.12 scripts/_test_py.py`. `py -3.12 .firecrawl/_audit_remaining.py` — catalog missing scrape 0.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-198 — Local API 404ed size-page SSR that smoke now requires
- **Status:** fixed
- **Area:** seo
- **Symptom:** `pnpm smoke` fetched `http://127.0.0.1:3001/sizes/20x25x1` for crawler JSON-LD. Express only injected SEO HTML when `NODE_ENV=production`, so local returned 404 (`size SSR 404`) even though Vite on :3000 was 200.
- **Do NOT:** Keep document HTML behind the prod-only static block. Do not point smoke at Vite for JSON-LD — Vite does not inject `jsonld-ssr`.
- **Do:** In dev, serve `client/index.html` through `injectSeoIntoHtml` for non-`/api` GETs. Production still serves `dist/public`.
- **Files:** `server/index.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm smoke`. `curl.exe http://127.0.0.1:3001/sizes/20x25x1` includes `application/ld+json` and `OfferShippingDetails`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-197 — Custom quote honeypot and form reset were not live JS
- **Status:** fixed
- **Area:** contact
- **Symptom:** The custom-quote honeypot used an undeclared or unregistered `website` input, so Vite could fail the module and bots filling "website" still created leads. After a successful contact send, `website` and `turnstileToken` stayed on the form. Turnstile `load` listeners were not removed.
- **Do NOT:** Reference `websiteRef` without declaring it. Do not leave the honeypot as a bare `name="website"` input. Do not skip reset of `website` / `turnstileToken`.
- **Do:** Register the honeypot and POST `website`. Reset both fields after a successful send. Remove the Turnstile script `load` listener on unmount.
- **Files:** `client/src/components/CustomQuoteForm.tsx`, `client/src/components/ContactForm.tsx`, `client/src/components/TurnstileField.tsx`
- **Verify:** `pnpm check`. `pnpm smoke`. POST `/api/contact` with `website` set returns `id: ignored`. Open `/custom-air-filters`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-196 — This branch had Klaviyo keys and DNS but no live integration
- **Status:** fixed
- **Area:** contact
- **Symptom:** `.env` already had the Filter Hero Klaviyo site ID / list, and Cloudflare already served `klv` + DKIM + site verification. This branch had no `server/klaviyo.ts`, no onsite boot, and no events from contact / clock / cart / Stripe. Shoppers never reached the marketing list or the seven Filter Hero flows.
- **Do NOT:** Send a second order confirmation or quote receipt from a Klaviyo flow. Do not write `next_change_date` from Filter Clock or `/api/identify`. Do not point `send.filterhero.net` at Klaviyo.
- **Do:** Server tracks quote / support / clock / checkout / Placed Order. Marketing list join needs the checkbox. Clock save stores `clock_next_change_date` only. Replenish starts on `Placed Order`. Catalog feed is `/api/klaviyo/catalog.json`. Sending domain `klv.filterhero.net` stays the marketing host.
- **Files:** `server/klaviyo.ts`, `server/contact.ts`, `server/stripe.ts`, `server/index.ts`, `client/src/lib/klaviyo.ts`, `docs/KLAVIYO.md`, `scripts/setup-klaviyo-account.ts`
- **Verify:** `pnpm verify:klaviyo`. `pnpm setup:klaviyo`. Local `GET /api/klaviyo/config` returns the public site ID. Local catalog is 299 SKUs. Clock reminder posts without Turnstile and does not subscribe.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-195 — Filter King `n` size keys in live-price JSON never matched the catalog
- **Status:** fixed
- **Area:** pricing
- **Symptom:** `fk-live-prices.json` had 60 rows keyed `10x30x0.5n` (Filter King nominal). `normalizeSize` only stripped a trailing `a`, so those ladders never bound to `10x30x0.5`. Estimated MERV 11 on `10x30x0.5` undercut to $48.75 instead of the scraped $49.48.
- **Do NOT:** Drop trailing `n` from catalog slugs. Do not treat `n` rows as missing sizes. Do not prefer estimated ladders over scraped aliases.
- **Do:** Strip a trailing `a` or `n` in `normalizeSize`. Keep the non-`n` catalog slug. Prefer scraped over estimated when both keys collapse.
- **Files:** `shared/pricing/engine.ts`, `scripts/verify-json.ts`
- **Verify:** `pnpm verify:json` — `prices:n-alias-scraped` is $49.48. `pnpm verify:store`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-194 — Size JSON-LD spoke as the homepage and omitted free-shipping Offer fields
- **Status:** fixed
- **Area:** seo
- **Symptom:** `buildSpeakableSchema` always set `url` to `/`, so `/sizes/20x25x1`, custom quote, and the change guide told Google the speakable WebPage was the homepage. Product Offers had price but no `shippingDetails` / return policy. JSON-LD injected into HTML did not escape `<`.
- **Do NOT:** Point speakable `WebPage.url` at `/` on inner routes. Do not ship Product Offers without $0 US shipping. Do not put raw `<` inside `<script type="application/ld+json">`.
- **Do:** Pass `{ path, name }` into `buildSpeakableSchema`. Put `OfferShippingDetails` + `MerchantReturnPolicy` on the Offer. Escape `<` as `\u003c` in SSR and `useSeo`.
- **Files:** `shared/seo.ts`, `client/src/hooks/useSeo.ts`, `scripts/verify-json.ts`, `scripts/smoke-site.ts`
- **Verify:** `pnpm verify:json`. Size JSON-LD speakable URL is `https://filterhero.net/sizes/20x25x1` and includes `OfferShippingDetails`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-193 — Cart Klaviyo pack shots used an unsafe MERV cast
- **Status:** fixed
- **Area:** other
- **Symptom:** Added-to-cart lines called `packShotSrc(item.merv as 8 | 11 | 13)`, so a carbon cart line sent the MERV 8 pack shot and SKU `size-8`.
- **Do NOT:** Cast a cart `number` to `MervRating`. Do not skip `getProductById` when building Klaviyo cart lines.
- **Do:** Resolve the live product and pass `product.merv` + `product.isCarbon` into `packShotSrc`. Carbon SKUs use the `carbon` suffix.
- **Files:** `client/src/lib/klaviyo.ts`, `client/src/pages/SizeDetail.tsx`
- **Verify:** `pnpm check`. Add a carbon SKU and inspect Added to Cart `ImageURL` / `SKU`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-192 — Klaviyo onsite never loaded if config fetch failed once
- **Status:** fixed
- **Area:** other
- **Symptom:** `bootKlaviyo()` set `booted = true` before `/api/klaviyo/config`. A server restart (`ECONNREFUSED` on the Vite proxy) left `publicKey` empty and never retried, so `onsite.js` stayed unloaded for that tab. A mid-merge `App.tsx` also declared `AdminBoard` twice and broke Vite babel / `tsc`.
- **Do NOT:** Mark the boot finished before a successful config response. Do not paste admin imports or `AdminDealRoute` twice. Do not import `closeDealsOnPurchase` twice.
- **Do:** Retry the config fetch a few times. Set `booted` only after a 200. Load `onsite.js` from `App` on mount. Keep one admin import and `/admin/login` + `/admin/deals/:id` above `/admin`.
- **Files:** `client/src/lib/klaviyo.ts`, `client/src/App.tsx`, `server/stripe.ts`
- **Verify:** `pnpm check`. `pnpm smoke`. Reload `/` while the API is up; Network shows `/api/klaviyo/config`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-191 — Local `.env` had no live verifier and `.env.example` omitted live keys
- **Status:** fixed
- **Area:** other
- **Symptom:** Shop keys lived in `.env` (Stripe, Resend, Klaviyo, Supabase, Turnstile, Cloudflare) but nothing asserted formats or pinged the APIs in one pass. `.env.example` omitted Klaviyo list/site IDs and Turnstile/Cloudflare placeholders. A send-only Resend key looked like a domain-list failure if you called `/domains`.
- **Do NOT:** Print secret values. Do not put service-role, Resend, Stripe `sk_`, or Cloudflare tokens in `VITE_` vars. Do not treat a Resend 401 on `/domains` as a dead key when send to `delivered@resend.dev` works.
- **Do:** Keep `SITE_URL` / `VITE_SITE_URL=https://filterhero.net`. Run `pnpm verify:env` after changing `.env`. Local Stripe stays `sk_test_` / `pk_test_`. Klaviyo public site ID is `VnVNmQ`, list `RiTKiS`. Turnstile hostnames include localhost and filterhero.net.
- **Files:** `scripts/verify-env.ts`, `.env.example`, `package.json`, `README.md`
- **Verify:** `pnpm verify:env` (52 passed). `pnpm verify:supabase`. `pnpm debug:stripe-checkout`. `pnpm check`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-190 — Quote intake had no bot gate, and CRM routes imported a missing security module
- **Status:** fixed
- **Area:** contact
- **Symptom:** `server/crm/routes.ts` and `pnpm verify:crm` imported `crmLimiter` / `publicError` / Turnstile helpers from `server/security.ts`, which did not exist. `/api/contact` had no rate limit or honeypot. Production Turnstile keys sat unused. Filter Clock reminders must still post without a widget (FH-131).
- **Do NOT:** Require Turnstile on `intent=reminder`. Do not let the CRM send mail. Do not skip `requireStaff` on `/api/crm`.
- **Do:** Keep `server/security.ts` as the public-API gate. Contact limiter is 5 per 15 minutes. Quote/support forms send a honeypot + Turnstile token. `reminder` skips Turnstile. Paid checkout still closes CRM deals fail-soft.
- **Files:** `server/security.ts`, `shared/email-channels.ts`, `server/index.ts`, `server/contact.ts`, `client/src/components/ContactForm.tsx`, `client/src/components/CustomQuoteForm.tsx`, `client/src/components/TurnstileField.tsx`
- **Verify:** `pnpm verify:crm`. Local `GET /api/crm/health` is 401 without a staff session. Local `GET /admin` 200.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-189 — `pnpm check` failed and Vite env was incomplete
- **Status:** fixed
- **Area:** other
- **Symptom:** `tsc --noEmit` died on top-level await in `scripts/verify-resend.ts` because `tsconfig.json` had no `target`. `.env` had no `SITE_URL` / `VITE_SITE_URL`. The HTML fallback still said carbon was quote-only. Smoke did not hit `/login`, `/account`, or `/admin`.
- **Do NOT:** Leave `compilerOptions.target` unset. Do not put service-role keys in `VITE_` vars. Do not list `/admin` after `/admin/login` in a prefix matcher.
- **Do:** Keep `target` at `ES2022`. Type Vite keys in `client/src/vite-env.d.ts`. Set `VITE_SITE_URL=https://filterhero.net` for production builds. Keep `/admin/login` and `/admin/deals/:id` above `/admin`.
- **Files:** `tsconfig.json`, `client/src/vite-env.d.ts`, `client/src/App.tsx`, `client/index.html`, `.env.example`, `scripts/smoke-site.ts`
- **Verify:** `pnpm check`. `pnpm smoke`. Open `/`, `/login`, `/admin`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-188 — Supabase CRM and accounts were half-wired on this branch
- **Status:** fixed
- **Area:** other
- **Symptom:** The live `filter-hero` project already had CRM + customer-account tables, RLS, and keys in `.env`. This branch only had `0002_customer_accounts.sql`. `/admin` 404ed, `/api/crm` was missing, contact quotes never opened a deal, and a paid Stripe webhook never attached SKUs to a profile.
- **Do NOT:** Ship customer login without the CRM schema, staff routes, or the webhook/account attach. Do not put the service role key in a `VITE_` var. Do not add RLS policies that let the browser query Postgres.
- **Do:** Keep deny-by-default RLS (zero policies). Express uses the service role. Shoppers use `/login` + `/api/account`. Staff use `/admin` + `/api/crm` behind `STAFF_EMAILS`. Auth redirects include localhost and filterhero.net for `/login`, `/account`, and `/admin`.
- **Files:** `supabase/migrations/0001_crm.sql`, `server/crm/`, `server/index.ts`, `server/contact.ts`, `server/stripe.ts`, `client/src/App.tsx`, `scripts/verify-supabase.ts`
- **Verify:** `pnpm verify:supabase` and `pnpm verify:account` and `pnpm verify:crm`. Open `/login` and `/admin`. Add `https://filterhero.net/admin` under Auth → URL configuration if staff magic links from production should land there (localhost `/admin` already works).
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-187 — Live site still showed the old main build, not the local shop
- **Status:** fixed
- **Area:** photos
- **Symptom:** `https://filterhero.net` was Railway `main` (shipping-copy only). Local `design/family-section-blue` has the family-band, new life photos (`lady-asthma`, `carpet-clean`, `cat-dander`), header, and CSS. Live `/life/lady-asthma.jpg` returned the SPA HTML; `/life/girl-dog.jpg` was still the JPEG.
- **Do NOT:** Leave production on `main` while the local shop is this branch. Do not `railway up` only the shipping cherry-pick and call the sites matched.
- **Do:** Deploy this branch so live assets and UI match local. Keep `main` on the same commit so GitHub autodeploy does not roll the look back.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/FamilyAirSection.tsx`, `client/src/index.css`, `client/public/life/`
- **Verify:** Live `/life/lady-asthma.jpg` is `image/jpeg` 92301 bytes (same as local). `/life/girl-dog.jpg` is not a JPEG. Bundle `/assets/index-CEs62oYW.js` references lady-asthma, carpet-clean, cat-dander. Railway `ea335b33` SUCCESS. PR #4 merged to `main`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-186 — Live FAQ and crawler copy still said shipping over $50
- **Status:** fixed
- **Area:** seo
- **Symptom:** Shop policy is free shipping on every contiguous-US order (FH-177 / FH-178). Production `main` was still `27aac84`, so `/llms.txt`, homepage FAQ JSON-LD, and meta description said “over $50.”
- **Do NOT:** Put a dollar minimum back on free shipping. Do not deploy the whole `design/family-section-blue` branch just to ship this copy.
- **Do:** Keep FAQ, llms, schema, delivery, cart, and Stripe `$0` shipping on every order. Production is Railway deploy `98fd8aed` from PR #3 (`fix/live-shop-shipping` merged to `main`).
- **Files:** `shared/seo.ts`, `client/public/llms.txt`, `client/src/components/CartDrawer.tsx`, `client/src/components/DeliverySection.tsx`, `server/stripe.ts`
- **Verify:** `https://filterhero.net/llms.txt` has no `$50`. Homepage FAQ JSON-LD: “free shipping on every order.” `/sizes/20x25x1` meta has the same. `/custom-air-filters` has the custom-shipping FAQ.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-185 — Debug 2026-09-07 02:08: apex shop is 100%; www default and live $50 FAQ are not
- **Status:** mitigated
- **Area:** seo
- **Symptom:** Full resolver + route pass. Apex `https://filterhero.net` is Railway `69.46.46.70`, health ok, title Filter Hero. All 22 shop routes 200 with the SPA shell. **Not 100%:** this PC and Google DoH still cache `www` CNAME `ckury9c8.up.railway.app` (TTL 14400) so default `https://www` fails `SEC_E_WRONG_PRINCIPAL`. Live `$50` shipping copy is fixed (FH-186).
- **Do NOT:** Attach `www` on Railway trial. Do not treat the leftover Railway CNAME as a failed NS click. Do not redeploy the design branch to production just to clear DNS cache.
- **Do:** Share `https://filterhero.net`. Wait out the 4h `www` CNAME.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`, `shared/seo.ts`
- **Verify:** `curl.exe -sI https://www.filterhero.net/` → 301 without `--resolve`. `curl.exe -s https://filterhero.net/llms.txt` has no `$50` (done).
- **Added:** 2026-09-07

---

### FH-184 — Recheck 2026-09-07 02:02: apex shop is live; NS and www are not unanimous
- **Status:** mitigated
- **Area:** seo
- **Symptom:** Apex `https://filterhero.net` loads Filter Hero from this PC and from Google / Cloudflare / Quad9 / OpenDNS (all A `69.46.46.70`, health ok, `Server: railway-hikari`). Recheck 02:08: Google / Cloudflare / Quad9 NS are only `ganz` / `marjory`. Leftover is `www` CNAME cache (FH-185).
- **Do NOT:** Treat Google's leftover `nsc*` NS as proof the Squarespace click failed. Do not attach `www` on Railway. Do not change apex off Railway.
- **Do:** Wait for NS and `www` cache to die. Keep using `https://filterhero.net`. FH-181 stays the www ticket until default `https://www.filterhero.net` 301s without `--resolve`.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** `nslookup -type=NS filterhero.net 8.8.8.8` is only `ganz` / `marjory`. `nslookup www.filterhero.net 8.8.8.8` has no `69.46.46.70`. `curl.exe -sI https://www.filterhero.net/` is 301 to the apex.
- **Added:** 2026-09-07

---

### FH-183 — Cloudflare API token cannot create the filterhero.net zone
- **Status:** fixed
- **Area:** other
- **Symptom:** `CLOUDFLARE_API_TOKEN` returns Cloudflare `1000 Invalid API Token`. No `filterhero.net` zone exists. The nameserver cutover in `docs/CLOUDFLARE-NAMESERVERS.md` cannot be scripted until a valid token creates the zone and copies records.
- **Do NOT:** Point Squarespace nameservers at Cloudflare before the zone exists and matches live DNS. Do not commit a Cloudflare token. Do not paste the token into chat after this.
- **Do:** Keep the working user token in local `.env` only. Zone `filterhero.net` is created. All checklist records plus the FH-181 www redirect are in the zone. Public NS are now Cloudflare (`ganz` / `marjory`) as of 2026-09-07 01:58 EDT.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** Token verify `status=active`. Zone exists. `nslookup -type=NS filterhero.net 8.8.8.8` shows only `ganz` / `marjory`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-182 — Railway trial deploy failed when a second region was set
- **Status:** fixed
- **Area:** other
- **Symptom:** Deploy `1fb6e2a6` (2026-09-05 23:01 EDT) failed with “Your plan can only deploy to a single region.” The trial service had `ams` and `us-east4-eqdc4a` both at 1 replica. The FILTER-HERO card stayed Online on an older replica.
- **Do NOT:** Add Amsterdam, `eu-west`, or a second region while the workspace is on trial. Do not upgrade only to get a second region for this shop.
- **Do:** Keep one replica in `us-east4-eqdc4a`. `railway scale us-east=1` must stay `{"regions":{"us-east4-eqdc4a":{"numReplicas":1}}}`. Later SUCCESS deploy `499083eb` already runs that way.
- **Files:** `.railway/config.json`
- **Verify:** `railway deployment list --limit 5 --json` latest `status=SUCCESS`. `railway scale us-east=1 --json` shows only us-east.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-181 — www.filterhero.net does not load the shop
- **Status:** mitigated
- **Area:** seo
- **Symptom:** Railway trial allows one custom domain (`filterhero.net` only). `www` cannot be attached. After the Squarespace → Cloudflare NS click, some resolvers return Cloudflare anycast for `www`; others still cache Railway `69.46.46.70`. Recheck 2026-09-07 02:08: HTTPS to `104.21.41.176` completes and **301s** to apex (path + query kept). Default `https://www` on this PC still hits cached CNAME `ckury9c8.up.railway.app` (TTL 14400) and fails `SEC_E_WRONG_PRINCIPAL`. Apex stays 200. See FH-185.
- **Do NOT:** Expect the www CNAME alone to serve the app. Do not delete the apex custom domain to free the slot. Do not orange-cloud mail, DKIM, or verify hosts. Do not attach `www` on Railway.
- **Do:** Keep apex on Railway, DNS only. Keep `www` proxied. Leave the Single Redirect `www.filterhero.net/*` → `https://filterhero.net/$1` (301). Wait for Cloudflare to issue the `www` cert. Old Railway CNAME cache can take a few hours.
- **Files:** `docs/CLOUDFLARE-NAMESERVERS.md`
- **Verify:** `curl.exe -sI --resolve www.filterhero.net:80:104.21.41.176 http://www.filterhero.net/sizes/20x25x1` → 301 `https://filterhero.net/sizes/20x25x1`. Done when `curl.exe -sI https://www.filterhero.net/` → 301 to `https://filterhero.net/` with a valid cert.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07
- **Recheck:** 2026-09-20 — default `https://www.filterhero.net/` 301s to `https://filterhero.net/` via Cloudflare (`Server: cloudflare`). Apex A remains Railway `69.46.46.70`. Do not attach `www` on Railway.

---

### FH-180 — Size-page sticky Add to cart leaked onto desktop
- **Status:** fixed
- **Area:** cart
- **Symptom:** `.pdp-sticky { display: flex }` beat Tailwind `lg:hidden`, so the mobile Add to cart bar could sit over the desktop size page.
- **Do NOT:** Set `display: flex` on `.pdp-sticky` outside a max-width 1023px query.
- **Do:** Hide `.pdp-sticky` by default. Show flex only under 1024px. Keep the page bottom padding in that same query.
- **Files:** `client/src/index.css`
- **Verify:** `/sizes/20x25x1` at 1280px — no bottom Add to cart bar. At 390px the bar is there.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-179 — Header Measure chip was too short to tap
- **Status:** fixed
- **Area:** header
- **Symptom:** After shrinking How to Measure (FH-168), the crimson chip was ~19px tall. Width / Length numbers were readable, but the control missed the 44px tap target.
- **Do NOT:** Drop `.header-measure-chip` below `min-height: 44px` to save horizontal space.
- **Do:** Keep the compact `Measure` label. Chip stays 44px tall. Finder fields still show two-digit inches.
- **Files:** `client/src/index.css`
- **Verify:** `/` header — Measure chip height is 44px. Width still shows `20"`.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-178 — Free shipping was missing on delivery, cart, and checkout
- **Status:** fixed
- **Area:** other
- **Symptom:** FAQ said free shipping, but `#delivery`, the cart drawer, Stripe Checkout, size-page meta, and custom-quote FAQ did not. Shoppers could think shipping would be charged.
- **Do NOT:** Leave a shipping surface without “free.” Do not put a dollar minimum back on free shipping (FH-177).
- **Do:** Delivery section, cart line, Stripe `$0` shipping rate, homepage/size SEO, custom FAQ, and footer all say free shipping on every contiguous-US order.
- **Files:** `client/src/components/DeliverySection.tsx`, `client/src/components/CartDrawer.tsx`, `client/src/components/TrustSection.tsx`, `client/src/pages/Home.tsx`, `server/stripe.ts`, `shared/seo.ts`, `scripts/verify-store.ts`
- **Verify:** `/#delivery` — “Free shipping on every order.” Cart shows Shipping Free. `/#faq` and `/custom-air-filters` FAQ. Stripe Checkout lists Free shipping $0.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-177 — FAQ said free shipping only over $50
- **Status:** fixed
- **Area:** seo
- **Symptom:** Homepage `#faq` “Do you offer free shipping?” and `/llms.txt` said free shipping on orders over $50. Shipping is free on every order.
- **Do NOT:** Put a dollar minimum on free shipping in FAQ, llms, or schema copy.
- **Do:** Say free shipping on every order within the contiguous United States. Trust tiles and the delivery map already say free shipping with no minimum.
- **Files:** `shared/seo.ts`, `client/public/llms.txt`
- **Verify:** `/#faq` — answer has no $50. `/llms.txt` shipping line has no $50.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-176 — `pnpm check` died on NodeList spread in hero sky flight
- **Status:** fixed
- **Area:** other
- **Symptom:** `tsc --noEmit` failed with TS2802 in `createHeroSkyFlight` because the project tsconfig has no `target` and spreading `NodeListOf<HTMLImageElement>` needs downlevelIteration.
- **Do NOT:** Spread a DOM NodeList with `[...]` under the root tsconfig. Do not flip `target` just to silence this one call.
- **Do:** Collect pose images with `Array.from(rig.querySelectorAll("img"))`.
- **Files:** `client/src/lib/hero-sky-flight.ts`
- **Verify:** `pnpm check`
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-175 — Site-wide product prices must be live tickets
- **Status:** fixed
- **Area:** pricing
- **Symptom:** Home MERV cards, size pages, cart, Stripe, and JSON-LD already used `liveUnitPrice`, but `/how-often-to-change-air-filter` still said “A $18 filter.” That is not a Filter Hero ticket. A catalog SKU could also silently fall back to `listPriceFor` / `PACK_TIERS` and show a different number than checkout.
- **Do NOT:** Hardcode a filter dollar amount in shopper copy. Do not display `unitPriceForQty` when `liveUnitPrice` is missing for an in-stock SKU.
- **Do:** Editorial filter prices use `liveListPrice("20x25x1", 8)`. Every in-stock size × MERV × pack qty on the shop must equal `liveUnitPrice`. MERV `fromPrice`, size-page packs, cart, Stripe, and schema qty 1 share that function. Repair ranges stay editorial, not product tickets. Shipping is free on every order (FH-177).
- **Files:** `client/src/pages/FilterChangeGuide.tsx`, `scripts/verify-store.ts`, `shared/pricing/engine.ts`, `shared/products.ts`
- **Verify:** `/how-often-to-change-air-filter` Why it matters — “A $9.99 filter”. `/#merv` from-prices. `/sizes/20x25x1` pack eaches. `pnpm exec tsx scripts/verify-store.ts`
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-174 — Header account and cart icons did not label on hover
- **Status:** fixed
- **Area:** header
- **Symptom:** The circular Sign in and Cart controls only tinted a little on hover. Shoppers could not tell what the icons did.
- **Do NOT:** Leave those icon-only controls without a visible hover/focus label. Do not rely on the native `title` delay.
- **Do:** `.header-cart` shows `.header-cart-tip` on hover and `:focus-visible` (Sign in / Account, Cart). The button also brightens. Cart tip aligns to the right so it does not clip the viewport.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/index.css`
- **Verify:** Header — hover the user icon: “Sign in” (or “Account”). Hover the cart: “Cart”. Keyboard focus shows the same tips.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-173 — MERV 13 catch card still used the child nebulizer photo
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage `#merv` Ultimate / MERV 13 card opened with `LIFE.sickNebulizer` (parent helping a child with a mask). The shopper-supplied woman-with-inhaler photo belongs in that header.
- **Do NOT:** Point HOME_PICKS key `13` back at `LIFE.sickNebulizer`. Do not swap `LIFE.asthmaInhaler` or the Family Air kids card.
- **Do:** Keep `LIFE.ladyAsthma` (`/life/lady-asthma.jpg`, `object-position: center 38%`) on the MERV 13 catch card so face and inhaler stay in the 4:3 crop.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/MervCarousel.tsx`, `client/public/life/lady-asthma.jpg`
- **Verify:** `/#merv` Ultimate card shows the woman using the inhaler. `#family` Kids & asthma still uses the nebulizer photo.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-172 — MERV deck “from $” used Filter King undercut, not shop tickets
- **Status:** fixed
- **Area:** pricing
- **Symptom:** Home `#merv` cards read `from $4.96` / `$6.37` / `$5.64` / `$5.69`. Those numbers came from Filter King × 0.90, not `liveUnitPrice`. A Filtrete or FilterBuy match on the same rung would make the card cheaper than the size page.
- **Do NOT:** Compute merchandising `fromPrice` with `heroFromFk` alone. Do not hardcode the four card prices.
- **Do:** `liveFromPrice` is the cheapest `liveUnitPrice` across live ladders, Filtrete packs, and FilterBuy packs. `MERV_TYPES.fromPrice` must equal that ticket. Shop check walks every in-stock SKU × pack qty.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`
- **Verify:** `/#merv` — Standard `$4.96` (12x12x1 ×12), Odor `$6.37` (12x12x1 ×4), Advanced `$5.64` (18x18x1 ×6), Ultimate `$5.69` (16x16x1 ×12). `pnpm exec tsx scripts/verify-store.ts`
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-171 — Sign-in vanished after switching to family-section-blue
- **Status:** fixed
- **Area:** other
- **Symptom:** `/login` 404ed and the header had no Sign in control. `design/family-section-blue` did not include the customer-account files; they stayed on `feat/customer-accounts` and in `stash@{0}`.
- **Do NOT:** Ship this branch without `/login`, `AccountProvider`, and the header user icon. Do not send shoppers to a 404 for Sign in.
- **Do:** Keep email + password login on `/login` (compact card on the navy band). Header user icon goes to `/login` or `/account`. `/api/account` stays behind `requireCustomer`.
- **Files:** `client/src/App.tsx`, `client/src/pages/account/Login.tsx`, `client/src/contexts/AccountContext.tsx`, `client/src/components/SiteHeader.tsx`, `server/account-routes.ts`, `server/index.ts`
- **Verify:** Open `/login`. Email and password are on the first screen. Header Sign in lands there. Wrong password shows an error, not a blank page.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-170 — Pets card inset was the woman with dog and cat
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage `#family` Pets / MERV 11 card used `LIFE.womanPets` (woman hugging a dog and cat) as the overlapping inset. The shopper-supplied cat-only sofa / lint-roller photo belongs in that slot.
- **Do NOT:** Point the Pets story `inset` back at `LIFE.womanPets`. Do not swap the main `LIFE.petsSleep` dog-and-cat photo.
- **Do:** Keep `LIFE.catDander` (`/life/cat-dander.jpg`, `object-position: 58% 40%`) as the Pets inset so the cat's face stays in the square crop.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/FamilyAirSection.tsx`, `client/public/life/cat-dander.jpg`
- **Verify:** `/` `#family` Pets card — large photo is still the sleeping dog and cat; the small overlapping tile is the cat on the sofa with the lint roller.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-169 — Header Filter Clock on the home page did not scroll
- **Status:** fixed
- **Area:** header
- **Symptom:** From another home hash (`/#how-to-measure`), Filter Clock set `/#clock` but left the shopper on the measure section. Same-page jumps used smooth `scrollIntoView` and `replaceState`, which does not fire `hashchange`, so the retry helper never ran.
- **Do NOT:** Use only smooth scroll + `replaceState` for in-page header jumps. Do not skip the hash-landing retries.
- **Do:** `jumpToHashTarget` scrolls `auto`, writes the hash, and dispatches `hashchange` so `useHashScroll` retries until the section is in view.
- **Files:** `client/src/hooks/useHashScroll.ts`, `client/src/components/SiteHeader.tsx`
- **Verify:** On `/#how-to-measure`, click Filter Clock — `#clock` is in view. Measure still lands on `#how-to-measure`.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-168 — Header How to Measure chip squeezed Width / Length numbers
- **Status:** fixed
- **Area:** header
- **Symptom:** On the desktop header, the crimson How to Measure pill sat wide next to Enter Your Filter Size. Width and Length clipped values like `20` and `25` so shoppers could not read the size they picked.
- **Do NOT:** Let `.header-finder-field` shrink with `min-width: 0` / `flex: 1 1 0`. Do not grow How to Measure back to the wide padded chip. Do not nest the chip inside the finder (FH-032).
- **Do:** Keep How to Measure a compact crimson pill (`Measure` + ruler, full aria-label). Finder can use `max-w-3xl`. Hide the “Enter Your Filter Size” prompt between 1280–1535px. Custom CTA shortens to “Custom” below 1536px. Width / Length keep a min width that shows two-digit inches plus the quote.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/index.css`
- **Verify:** `/` header at ~1280px — Width shows `20"`, Length shows `25"`, Depth shows `1"`. Measure chip still jumps to `#how-to-measure`.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-167 — Everyday Home card still used the girl-and-dog photo
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage `#family` Everyday Home / MERV 8 card (and the size-page mosaic tile) showed a girl coloring next to a dog. The shopper-supplied carpet steam-clean photo belongs in that slot.
- **Do NOT:** Point `LIFE.carpetClean` back at `/life/girl-dog.jpg`. Do not restore `LIFE.girlDog`.
- **Do:** Keep `LIFE.carpetClean` (`/life/carpet-clean.jpg`) as the Everyday Home story photo and the size-page "Air the house can feel" mosaic tile.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/FamilyAirSection.tsx`, `client/src/pages/SizeDetail.tsx`, `client/public/life/carpet-clean.jpg`
- **Verify:** `/` `#family` Everyday Home card shows the steam-clean carpet. `/sizes/20x25x1` mosaic "Air the house can feel" uses the same photo.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-166 — Who you're protecting sat on a white sheet
- **Status:** fixed
- **Area:** photos
- **Symptom:** Homepage `#family` ("Who you're protecting") used `sheet-section` (white). The band read as another white block after the finder instead of a brand-blue section.
- **Do NOT:** Put `sheet-section` or a white fill back on `#family`. Do not let `.brand-band { color: #fff }` paint the white `.life-story` cards — titles and CTAs go invisible.
- **Do:** `#family` is `.brand-band` (same ice radials over `#1a3058` → `#2a4d82` → `#3a66a3`). Intro copy is white / `white/65`. Cards stay white with navy type, mesh labels, and navy links.
- **Files:** `client/src/components/FamilyAirSection.tsx`, `client/src/index.css`
- **Verify:** `/` — `#family` is the site blue band. Story cards stay white with dark titles and navy "Shop MERV" links. Filter Clock below stays a white sheet.
- **Added:** 2026-09-06
- **Fixed:** 2026-09-06

---

### FH-178 — Free shipping was missing on delivery, cart, and checkout
- **Status:** fixed
- **Area:** other
- **Symptom:** FAQ said free shipping, but `#delivery`, the cart drawer, Stripe Checkout, size-page meta, and custom-quote FAQ did not. Shoppers could think shipping would be charged.
- **Do NOT:** Leave a shipping surface without “free.” Do not put a dollar minimum back on free shipping (FH-177).
- **Do:** Delivery section, cart line, Stripe `$0` shipping rate, homepage/size SEO, custom FAQ, and footer all say free shipping on every contiguous-US order.
- **Files:** `client/src/components/DeliverySection.tsx`, `client/src/components/CartDrawer.tsx`, `client/src/components/TrustSection.tsx`, `client/src/pages/Home.tsx`, `server/stripe.ts`, `shared/seo.ts`, `scripts/verify-store.ts`
- **Verify:** `/#delivery` — “Free shipping on every order.” Cart shows Shipping Free. `/#faq` and `/custom-air-filters` FAQ. Stripe Checkout lists Free shipping $0.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-177 — FAQ said free shipping only over $50
- **Status:** fixed
- **Area:** seo
- **Symptom:** Homepage `#faq` “Do you offer free shipping?” and `/llms.txt` said free shipping on orders over $50. Shipping is free on every order.
- **Do NOT:** Put a dollar minimum on free shipping in FAQ, llms, or schema copy.
- **Do:** Say free shipping on every order within the contiguous United States. Trust tiles and the delivery map already say free shipping with no minimum.
- **Files:** `shared/seo.ts`, `client/public/llms.txt`
- **Verify:** `/#faq` — answer has no $50. `/llms.txt` shipping line has no $50.
- **Added:** 2026-09-07
- **Fixed:** 2026-09-07

---

### FH-165 — Delivery map sat in a solid blue square
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Homepage `#delivery` wrapped the US map in a solid `#d4e0ee` rounded card. The 3-day states (`#7ea8d4`) blended into that fill, so the map silhouette disappeared into a light-blue slab.
- **Do NOT:** Restore a solid `MAP_COLORS.bg` fill on the frame or the SVG `<rect>`. Do not paint an opaque ocean behind the states.
- **Do:** Keep `.delivery-map-frame` as a faded wash into the white sheet (`radial-gradient` to transparent). States stay the only opaque blues so the US shape reads.
- **Files:** `client/src/components/DeliverySection.tsx`, `client/src/index.css`
- **Verify:** Homepage `#delivery` — rounded square is a faint wash; WA / MT / ND / ME edges are visible against the sheet.
- **Added:** 2026-09-04

### FH-164 — Capture dots were smaller than MERV 13
- **Status:** mitigated
- **Area:** photos
- **Symptom:** On homepage `#merv` (and size-page Capture), MERV 8 / Carbon / 11 used even 8–10px dots. MERV 13 used the growing 7 / 10 / 13 / 16 / 19 scale, so its row read larger.
- **Do NOT:** Restore per-rating `grow: false` or a smaller even size for 8 / carbon / 11. Do not invent a second dot scale.
- **Do:** Every `CaptureDots` row uses the MERV 13 sizes (`7 + i * 3`). Fill count still follows `MERV_GUIDE.strength`. Carbon keeps the ice accent.
- **Files:** `client/src/components/CaptureDots.tsx`
- **Verify:** Homepage `#merv` and `/sizes/20x25x1` — all four Capture rows share the same five circle sizes. MERV 13 still fills all five.
- **Added:** 2026-09-04

### FH-163 — Catch-card photos were not one size
- **Status:** mitigated
- **Area:** photos
- **Symptom:** On homepage `#merv`, MERV 8 / 11 / 13 used a short `h-28` strip while MERV 8 Carbon used `aspect-[4/3]`. The cooking photo looked taller; the other three read as panoramic bars.
- **Do NOT:** Restore the carbon-only `aspect-[4/3]` / `h-28` split. Do not force `LIFE.familyCooking` back through `h-28` (FH-162 — that crops the pot).
- **Do:** All four `MervCard` LifeImages share `aspect-[4/3]`. Carbon source is 1472×1104 (4:3). Landscape sources cover-crop; keep `LIFE.pollenSneeze` `object-position: 28% center` so the sneezing woman stays in frame.
- **Files:** `client/src/components/MervCarousel.tsx`, `client/src/data/life-photos.ts`
- **Verify:** Homepage `#merv` — four header photos the same 4:3 height. Carbon still shows pot, steam, and all four people.
- **Added:** 2026-09-04

### FH-162 — MERV 8 Carbon cooking photo cropped the pot out
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-161 the family-of-four photo sat in the same `h-28` strip as the other catch cards. `object-cover` kept faces and steam and cut the pot, spoon, and food — shoppers could not see them cooking.
- **Do NOT:** Force `LIFE.familyCooking` through the short 2.6:1 header. Do not rely on `object-position` to reveal a square source in `h-28`.
- **Do:** Keep a 4:3 people-and-pot crop on `/life/family-cooking.jpg`. Give only the carbon tile `aspect-[4/3]` so the pot stays in frame.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/MervCarousel.tsx`, `client/public/life/family-cooking.jpg`
- **Verify:** Homepage `#merv` MERV 8 Carbon card — pot, steam, and all four people visible.
- **Added:** 2026-09-04

### FH-161 — MERV 8 Carbon catch card used the pizza-topping kitchen photo
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The MERV 8 Carbon tile in What should your filter catch? showed a woman and two children topping a pizza. The shopper-supplied family-of-four cooking photo belongs in that card slot, cropped so faces stay readable in the short header.
- **Do NOT:** Swap `LIFE.cookingWithLove` globally. Do not drop a square source into `object-cover` without a landscape people crop.
- **Do:** Keep a dedicated `LIFE.familyCooking` (`/life/family-cooking.jpg`, ~2.6:1 faces-and-steam crop) and point only `MervCarousel` HOME_PICKS key `carbon` at it.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/MervCarousel.tsx`, `client/public/life/family-cooking.jpg`
- **Verify:** Homepage `#merv` MERV 8 Carbon card header.
- **Added:** 2026-09-04

### FH-160 — Flyer grew off-screen; last pose was not the logo
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The live Seedance clip ended with the mascot filling the hero height (head and feet cropped). The last pose was not the Filter Hero logo flyer (profile right, leading fist, tucked knee, cape streaming left with filter-grid lining).
- **Do NOT:** Shrink the live `<video>` with `transform: scale(<1)` — that boxes the plate (FH-154–158). Do not swap the Seedance flight for a pose-sprite wander. Do not use `nav-icon.png` as the end pose.
- **Do:** Keep the clip full-bleed (`inset: 0` / `object-fit: cover`). Compose Seedance onto 4K navy at ~52% plate width so he stays in frame, feather and match Seedance navy so the inset does not read as a rectangle, then crossfade/hold the `logo.png` flyer cutout. Cache `?v=fh160`.
- **Files:** `client/public/hero/character-fly-natural.mp4`, `client/public/hero/character-fly-natural.webm`, `client/public/hero/character-fly-still.png`, `client/src/components/Hero.tsx`, `scripts/_compose_hero_fly_logo_end.py`
- **Verify:** Homepage hero — flyer stays on-screen for the whole loop; last hold is the logo pose; no square around the plate.
- **Added:** 2026-09-04

---

### FH-159 — Fly clip still read as a boxed plate inside the lineup
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-158 the video still sat in `.hero-character-slot` inside the lineup, so it could letterbox as a 16:9 square on the CSS navy.
- **Do NOT:** Nest the live fly clip in `.hero-lineup` / a sized slot. Do not scale the plate below 1.
- **Do:** Mount `HeroCharacter` as `.hero-sky-fill` on the stage — `position: absolute; inset: 0; object-fit: cover`. Stage fallback is `#1a2f50`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** Homepage hero — navy video is the full stage. No rectangle around the flyer.
- **Added:** 2026-09-04

---

### FH-158 — Scaled fly plate showed a square in the navy
- **Status:** mitigated
- **Area:** photos
- **Symptom:** FH-154–157 shrank the whole video with `scale(0.78–0.9)`, so the 16:9 plate sat as a rectangle on the hero navy.
- **Do NOT:** Scale `.hero-character` below 1 to shrink the mascot. That boxes the clip. Do not bring back the masked 37% slot.
- **Do:** Video and still stay `inset: 0` / `object-fit: cover` with no transform, so the navy plate is the stage.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero — no square edge around the fly clip. Stage navy is the video.
- **Added:** 2026-09-04

---

### FH-157 — Hero flyer still a tad large after FH-156
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After `scale(0.84)` the mascot still read a bit big on the full-bleed plate.
- **Do NOT:** Bring back the boxed slot, mask, or drop-shadow. Do not jump from 0.78 to a much smaller scale.
- **Do:** Keep the plate full-bleed. Flyer scale is `0.78`.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero — same Seedance clip, slightly smaller than FH-156.
- **Added:** 2026-09-04

---

### FH-156 — Hero flyer still a tad large after FH-154
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After the 4K full-bleed plate, `scale(0.9)` still read a bit big against the copy and packs.
- **Do NOT:** Bring back the boxed slot, mask, or drop-shadow. Do not jump from 0.84 to a much smaller scale.
- **Do:** Keep the plate full-bleed. Flyer scale is `0.84`.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero — same Seedance clip, slightly smaller than FH-154, no square plate edge.
- **Added:** 2026-09-04

---

### FH-155 — Hero fly plate was 720p on a full-bleed stage
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The live Seedance clip and poster were 1280×720, so the full-bleed hero looked soft on large screens.
- **Do NOT:** Drop the live files back to 720p. Do not swap the clip or change the flight.
- **Do:** Serve `character-fly-natural` mp4/webm and `character-fly-still.png` at 3840×2160. Cache `?v=fh155`.
- **Files:** `client/public/hero/character-fly-natural.mp4`, `client/public/hero/character-fly-natural.webm`, `client/public/hero/character-fly-still.png`, `client/src/components/Hero.tsx`
- **Verify:** Homepage hero — same Seedance motion, 4K sources in the network panel.
- **Added:** 2026-09-04

---

### FH-154 — Hero flyer read a notch too large on the full-bleed plate
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-153 the Seedance plate filled the stage, so the mascot read a bit big against the copy and packs.
- **Do NOT:** Bring back the boxed 37% / 72% slot, radial mask, or drop-shadow. Do not jump down more than a tad (this pass is `scale(0.9)`).
- **Do:** Keep the plate full-bleed. Shrink the flyer only with a centered scale on `.hero-character`.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero — same Seedance clip, slightly smaller character, no square plate edge.
- **Added:** 2026-09-03

---

### FH-153 — Hero fly plate sat in a boxed slot
- **Status:** mitigated
- **Area:** photos
- **Symptom:** `.hero-character-slot` was a receded rectangle (mask + drop-shadow), so the live fly clip read as a square card in the navy. A pose-composited wander plate was tried and rejected — keep the FH-152 Seedance clip.
- **Do NOT:** Box the flyer in a 37% / 72% slot, radial mask, or drop-shadow that outlines a plate. Do not swap the live mascot to the pose-sprite compose plate.
- **Do:** Full-bleed the FH-152 Seedance plate (`object-fit: cover`, `inset: 0`). Cache `?v=fh154`. Reduced motion uses `character-fly-still.png`.
- **Files:** `client/public/hero/character-fly-natural.mp4`, `client/public/hero/character-fly-natural.webm`, `client/public/hero/character-fly-still.png`, `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** Homepage hero — Seedance flyer, video fills the stage with no square edge. Copy and packs stay readable.
- **Added:** 2026-09-03

---

### FH-152 — Hero fly clip had a ghost second cape and locked-pose motion
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The FH-149 Seedance plate copied the old Veo lock-pose path and sometimes showed a second plaided cape. Shoppers need one sheet-accurate flyer on the same navy, with new entertaining travel (circle, cross, climb, dive) and no extra FX or costume pieces.
- **Do NOT:** Drive the live mascot from the old Veo warehouse clip. Do not add a second cape, extra horns, logos, particles, trails, or speed lines. Do not remount the pose-sprite sky rig while this plate is live.
- **Do:** Loop the 15s Seedance omni_reference plate from the latest three-panel sheet + clean navy still. One navy cape (grid only on the hem). Background stays `#1b3258` → `#23406a`. Cache `?v=fh152`.
- **Files:** `client/public/hero/character-fly-natural.mp4`, `client/public/hero/character-fly-natural.webm`, `client/public/hero/character-fly-still.png`, `client/src/components/Hero.tsx`
- **Verify:** Homepage hero — sheet costume, one cape, navy sky never changes, he circles then crosses then climbs and dives. `prefers-reduced-motion` shows the still.
- **Added:** 2026-09-03

---

### FH-151 — Hero flyer still a touch large after FH-150
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-150 the mascot was better but still a bit big in the middle lane.
- **Do NOT:** Jump back to FH-150 slot size (mobile 78% / 12% inset, desktop 40% × 84%).
- **Do:** Keep a small further shrink — mobile ~72% height with 14% side inset; desktop ~37% width and 78% height.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero. Noticeably smaller than FH-150, not a big drop.
- **Added:** 2026-09-03

---

### FH-150 — Hero flyer sat too large in the middle lane
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-149 the new navy fly plate filled most of the hero slot, so the mascot read too big against the copy and packs.
- **Do NOT:** Stretch `.hero-character-slot` back to full-bleed height / ~48% desktop width.
- **Do:** Keep the plate receded and a notch smaller — mobile ~78% height with 12% side inset; desktop ~40% width and 84% height.
- **Files:** `client/src/index.css`
- **Verify:** Homepage hero. Character is smaller than FH-149 but still readable in the middle lane.
- **Added:** 2026-09-03

---

### FH-149 — Hero fly clip used the old sheet and baked-in particle effects
- **Status:** mitigated
- **Area:** photos
- **Symptom:** `character-fly-natural.mp4` was the first Veo loop: old costume, warehouse beams, dust/sparkle trails. The latest V-abdomen character sheet and the site navy (`#1b3258` → `#23406a`) belong on that plate, with the original flight motion only.
- **Do NOT:** Restore the particle/sparkle/warehouse Veo as the hero source. Do not drive the live mascot with the pose-sprite sky rig while this plate is mounted.
- **Do:** Loop `character-fly-natural.webm` / `.mp4` from the latest sheet still. Poster and reduced-motion still are `character-fly-still.png`. Keep him receded in the middle lane so the navy plate blends into `.hero-cast-stage`.
- **Files:** `client/public/hero/character-fly-natural.mp4`, `client/public/hero/character-fly-natural.webm`, `client/public/hero/character-fly-still.png`, `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** Homepage hero — new sheet character flies on navy, no sparkles/dust. `prefers-reduced-motion` shows the still.
- **Added:** 2026-09-03

---

### FH-148 — MERV 8 Carbon catch card had no cooking photo
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-144 the odor card had no header image. The shopper-supplied kitchen shot (`E:\FILTER HEROE\PICS\cooking with love.jpeg`) belongs in that slot.
- **Do NOT:** Put `LIFE.womanPets` on carbon. Do not leave the carbon HOME_PICKS photo empty.
- **Do:** Keep a dedicated `LIFE.cookingWithLove` (`/life/cooking-with-love.jpg`) and point only `MervCarousel` HOME_PICKS key `carbon` at it.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/MervCarousel.tsx`, `client/public/life/cooking-with-love.jpg`
- **Verify:** Homepage `#merv` MERV 8 Carbon card header shows the woman and kids making pizza.
- **Added:** 2026-09-03

---

### FH-147 — Hero flyer vanished after the pose-machine swap
- **Status:** mitigated
- **Area:** other
- **Symptom:** After FH-146 the mascot was gone. The rig sat at 0,0 under the copy wash, the first path point started off-canvas, and a 0×0 absolute rig plus a pause-on-unseen observer could skip drawing.
- **Do NOT:** Park the flyer at the top-left of `.hero-copy`. Do not start the loop at a negative X. Do not leave `.hero-sky-rig` sizeless with both frames at opacity 0.
- **Do:** Keep a CSS fallback in the open sky. Paths stay on-stage. JS zeros `left/top` then translates. Opacity stays readable. Slot `z-index` 4, still under copy/packs.
- **Files:** `client/src/lib/hero-sky-flight.ts`, `client/src/components/HeroSkyFlight.tsx`, `client/src/index.css`
- **Verify:** Homepage hero shows the flyer immediately, then he moves through the sky.
- **Added:** 2026-09-03

### FH-146 — Hero flyer was still one locked pose on a path
- **Status:** mitigated
- **Area:** other
- **Symptom:** After FH-142 he still read as a sticker: one silhouette, slight cape warp, dragged along a spline.
- **Do NOT:** Translate or rotate a single fly PNG / 8-frame cape sheet and call it flying.
- **Do:** Switch distinct drawings — cruise, stroke, climb, dive, bank — from heading and turn rate. Crossfade. Flip for leftward travel. Only a small extra pitch. Keep him receded behind copy and packs.
- **Files:** `client/src/lib/hero-sky-flight.ts`, `client/src/components/HeroSkyFlight.tsx`, `client/src/index.css`, `client/public/hero/fly-poses/`
- **Verify:** Homepage hero. Level flight alternates cruise/stroke. Climbs and dives change the silhouette. Circles use the bank pose.
- **Added:** 2026-09-03

### FH-145 — Hero stage used a darker blue than the rest of the site
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The homepage hero sat on midnight `#122240` / `#162848`, so it did not match the header, footer, trust marquee, or brand-band navy (`#1b3258` → `#23406a`).
- **Do NOT:** Put `#122240`, `#162848`, or a near-black `#0a101e` wash back on `.hero-stage` / `.hero-cast-stage`. Do not add a bright ice/white center glow that reads as a different blue.
- **Do:** Hero stage uses the same navy as `.site-header` / `.site-footer` (`#1b3258` → `--navy` `#203868` → `#23406a`). Atmosphere stays subtle. Copy overlays stay in that navy, not midnight.
- **Files:** `client/src/index.css`
- **Verify:** `/` — hero sky matches the header above it and the trust / brand bands below. Other pages' `.brand-band` heroes unchanged.
- **Added:** 2026-09-03

---

### FH-144 — MERV 8 Carbon catch card showed the woman-with-pets photo
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The MERV 8 Carbon tile in What should your filter catch? opened with `/life/woman-pets.jpg` (woman hugging a dog and cat). Copy said cooking / odors, so the photo read as the wrong scene.
- **Do NOT:** Put `LIFE.womanPets` back on the carbon HOME_PICKS slot.
- **Do:** Carbon uses `LIFE.cookingWithLove` (FH-148). `LIFE.womanPets` stays on Family Air as the pets inset.
- **Files:** `client/src/components/MervCarousel.tsx`
- **Verify:** Homepage `#merv` MERV 8 Carbon card has no woman photo at the top.
- **Added:** 2026-09-03

---

### FH-143 — MERV 11 catch card used the sleeping cat-and-dog photo
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The MERV 11 tile in What should your filter catch? showed a sleeping golden dog and orange cat. The shopper-supplied doorway pair (terrier + Yorkie) belongs in that card slot.
- **Do NOT:** Swap `LIFE.petsSleep` globally. Family Air and the filter-change guide still use the sleeping pair.
- **Do:** Keep a dedicated `LIFE.petsDoorway` (`/life/pets-doorway.jpg`) and point only `MervCarousel` HOME_PICKS key `11` at it.
- **Files:** `client/src/data/life-photos.ts`, `client/src/components/MervCarousel.tsx`, `client/public/life/pets-doorway.jpg`
- **Verify:** Homepage `#merv` MERV 11 card header. Other pets photos unchanged.
- **Added:** 2026-09-03

### FH-142 — Hero flyer looked dragged because the pose never flew
- **Status:** mitigated
- **Area:** other
- **Symptom:** After FH-141 the vector sat in one flying pose and was translated along a path. He read as a sticker being pulled, not a body flying.
- **Do NOT:** Keep him screen-upright with a horizontal flip. Do not ease each beat to a stop. Do not drive the hero with a single still PNG.
- **Do:** Point the artwork along the velocity (head leads, `ART_PITCH` offset). Cycle the cape/limb sheet. Keep path timing linear and add a stroke heave perpendicular to the heading.
- **Files:** `client/src/lib/hero-sky-flight.ts`, `client/src/components/HeroSkyFlight.tsx`, `client/src/index.css`, `client/public/hero/character-sky-fly-cycle.png`
- **Verify:** Homepage hero. On a circle or figure-eight his nose follows the turn; cape and legs keep cycling.
- **Added:** 2026-09-03

### FH-141 — Hero character sat planted instead of flying the sky
- **Status:** mitigated
- **Area:** other
- **Symptom:** The homepage hero used an in-place `character-fly-natural` loop in the middle lane. He read as a foreground plate, not a receded mascot flying the navy sky.
- **Do NOT:** Plant a full-height video/still in `.hero-character-slot`. Do not remount the unused pack-presenting `HeroFlight` sales choreography on top of copy and MERV tiles.
- **Do:** Fly the transparent vector cutout (`character-sky-fly.png`) on a long background loop — crosses, ovals, weaves, figure-eight — behind copy (`z-index` 6) and packs. Keep him small and dim, and park a still when `prefers-reduced-motion` is on.
- **Files:** `client/src/components/Hero.tsx`, `client/src/components/HeroSkyFlight.tsx`, `client/src/lib/hero-sky-flight.ts`, `client/src/index.css`, `client/public/hero/character-sky-fly.png`
- **Verify:** Homepage hero, desktop and mobile. Copy and packs stay readable while he crosses and circles in the sky.
- **Added:** 2026-09-03

### FH-140 — Brand model/OEM search always opened /sizes, even off-catalog
- **Status:** mitigated
- **Area:** brands
- **Symptom:** Search hits in Shop by brand always linked to `/sizes/{slug}`. Brand detail size/model/OEM chips already sent off-catalog sizes to `/custom-air-filters?size=`. In wholesale mode those search hits landed on the quote empty-state PDP instead of the custom quote form.
- **Do NOT:** Hardcode `/sizes/` for brand codes. Do not skip `getFilterSize` / `shopOrQuotePath`.
- **Do:** One helper, `shopOrQuotePath(size)`, for brand search, brand chips, the finder, and the header finder. Shoppable → PDP. Not shoppable → custom quote with the size prefilled.
- **Files:** `client/src/lib/filter-size.ts`, `client/src/components/BrandDirectory.tsx`, `client/src/pages/BrandBrowse.tsx`, `client/src/components/FilterFinder.tsx`, `client/src/components/SiteHeader.tsx`
- **Verify:** `/brands` search `FC100` opens a size or custom-quote page. `pnpm exec tsx scripts/smoke-site.ts`.
- **Added:** 2026-09-01

---

### FH-139 — Checkout 400 when Stripe Tax had no head office
- **Status:** mitigated
- **Area:** cart
- **Symptom:** `checkout.sessions.create` with `automatic_tax.enabled=true` returned 400: “You must have a valid head office address to enable automatic tax calculation.” Cart checkout failed for every shopper.
- **Do NOT:** Force `automatic_tax.enabled=true` while Tax Settings `status` is `pending`.
- **Do:** Read Tax Settings first. Enable automatic tax only when status is `active`. Checkout still creates Customer + Invoice. After the Dashboard head office is set, the next session turns tax on with no deploy.
- **Files:** `server/stripe.ts`, `scripts/debug-stripe-checkout.ts`, `docs/STRIPE-BOOKS.md`
- **Verify:** `pnpm exec tsx scripts/debug-stripe-checkout.ts` — session creates; `automatic_tax` is off until head office exists.
- **Added:** 2026-09-01

---

### FH-138 — Match FilterBuy on confirmed cheaper 2-inch / 4-inch rungs
- **Status:** mitigated
- **Area:** pricing
- **Symptom:** After FH-136, Filtrete-gap 2-inch and 4-inch rungs stayed on Filter King × 0.90. FilterBuy’s Sep 1, 2026 10% sale (ends Sep 7) was cheaper on those singles and some packs.
- **Do NOT:** Stamp FilterBuy across sizes or MERVs we did not scrape. Do not match HDX. Do not undercut FilterBuy another 10%. Do not invent 16x25x2 MERV 13, 16x20x2 MERV 13, or 20x25x4 MERV 13 tickets — FilterBuy is not cheaper there.
- **Do:** `FILTERBUY_PACKS` holds only confirmed cheaper FilterBuy sale units. `liveUnitPrice` = min(existing Hero, FilterBuy) on those rungs. 6-packs that already beat FilterBuy stay on Filter King.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`, `docs/WHOLESALE-PRICE-LISTS.md`
- **Verify:** `pnpm exec tsx scripts/verify-store.ts` — 20x25x4 MERV 8 qty 1 === 30.59; 20x25x2 MERV 8 qty 1 === 24.29; 16x25x4 MERV 8 qty 6 === 14.39; 20x25x4 MERV 8 qty 6 === 14.91; 20x25x4 MERV 13 qty 1 === 39.95.
- **Added:** 2026-09-01

---

### FH-137 — Filtrete-gap rungs: cheapest peer is FilterBuy; HDX undercuts MERV 8 store-brand
- **Status:** mitigated
- **Area:** pricing
- **Symptom:** Rungs with no Filtrete listing still use Filter King × 0.90. Live Sep 1, 2026 research: FilterBuy (10% sale through Sep 7) beats Hero on several 2-inch and 4-inch qty-1 tickets. HDX MERV 8 at Home Depot is $3.50–$5.98 and sits near or below wholesale — not the same pleat. Do not invent Filtrete packs.
- **Do NOT:** Stamp FilterBuy or HDX tickets across sizes we did not scrape. Do not match HDX 3-packs we do not sell.
- **Do:** If we match the cheapest true peer, add confirmed FilterBuy rungs the same way as `FILTRETE_PACKS`. Keep HDX as a separate store-brand compare. FilterBuy match landed as FH-138.
- **Files:** `docs/ISSUES-AND-FIXES.md`, `shared/pricing/engine.ts`
- **Verify:** FilterBuy 20x25x4 / 14x25x1 / 20x25x2 hubs; Home Depot HDX 14x25x1 and 20x30x1.
- **Added:** 2026-09-01

---

### FH-136 — Match the cheaper of Filtrete and Filter King on compared rungs
- **Status:** mitigated
- **Area:** pricing
- **Symptom:** Hero undercut Filter King by 10% even on rungs where Filter King was already cheaper than Filtrete, and stayed under Filtrete’s Office Depot 12-pack on 16x25x1 MERV 8.
- **Do NOT:** Invent Filtrete multi-packs. Do not apply the 10% undercut on a rung that already has both a Filtrete listing and a Filter King listing. Do not drop `FILTRETE_1INCH_QTY1`.
- **Do:** `liveUnitPrice` = `min(Filtrete, Filter King)` when both exist. Otherwise 1-inch qty 1 = Filtrete; other rungs = Filter King × 0.90 (× 0.88 if modeled), capped at the Filtrete single.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`, `docs/WHOLESALE-PRICE-LISTS.md`
- **Verify:** `pnpm exec tsx scripts/verify-store.ts` — 20x25x1 MERV 8 qty 6 === 7.49; 16x25x1 MERV 8 qty 12 === 5.83; 20x25x1 MERV 13 qty 2 === 17.76; 14x25x1 MERV 11 qty 2 === 13.49.
- **Added:** 2026-09-01

---

### FH-135 — Full-catalog Filtrete match still leaves pack, MERV, and thick-size gaps
- **Status:** open
- **Area:** pricing
- **Symptom:** After FH-134, every 1-inch qty 1 (8 / 11 / 13 / carbon) matches a Filtrete 1-pack. Remaining gaps: (1) ~~253 pack rungs where a bigger pack costs more per filter~~ — mitigated by FH-361 carry-forward; (2) 815 size × qty cells where a higher MERV is cheaper; (3) Filtrete MERV 11 2-pack $11.00 only on five sizes — 9,376 other 1-inch MERV 11 stay at $13.49 at qty 2; (4) 2" / 4" / 5" / 0.5" (2,308 SKUs) have no Filtrete table, so they stay on Filter King × 0.90; (5) carbon is Filter King MERV 8 Carbon priced to Filtrete MERV 11 odor; (6) off-sheet SKUs, including all carbon, have no wholesale cost.
- **Do NOT:** Invent Filtrete 4-inch or 2-pack tickets. Do not expand `FILTRETE_BEAT` beyond confirmed scrapes. Do not flatten pack inversions by raising cheap rungs (FH-361 carries the cheap unlocked unit forward instead).
- **Do:** Keep 1-inch qty 1 on `FILTRETE_1INCH_QTY1`. Add a Filtrete-beat row only when a live Filtrete multi-pack still undercuts us. Thick sizes stay on the Filter King undercut unless a confirmed FilterBuy ticket is cheaper (FH-138). Pack ladders stay non-increasing via FH-361.
- **Files:** `shared/pricing/engine.ts`, `docs/WHOLESALE-PRICE-LISTS.md`
- **Verify:** Canvas `filtrete-match-gaps.canvas.tsx`. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-09-01

---

### FH-134 — 1-inch carbon qty 1 did not match Filtrete odor
- **Status:** mitigated
- **Area:** pricing
- **Symptom:** Full catalog put MERV 8 Carbon on sale, but `filtreteQty1` returned undefined for carbon, so qty 1 was Filter King × 0.90 (~$37.40 on 20x25x1) instead of Filtrete Allergen Defense Odor Reduction $16.70.
- **Do NOT:** Drop carbon from `FILTRETE_1INCH_QTY1`. Do not treat Filtrete odor as MERV 8. Do not invent a carbon 2-pack beat without a scrape.
- **Do:** 1-inch carbon qty 1 = Lowe’s Filtrete odor 1-pack $16.70 (same flat-ticket rule as MERV 8 / 11 / 13). Multi-packs stay on the Filter King undercut, capped at that single.
- **Files:** `shared/pricing/engine.ts`, `shared/products.ts`, `scripts/verify-store.ts`, `docs/WHOLESALE-PRICE-LISTS.md`
- **Verify:** `pnpm exec tsx scripts/verify-store.ts` — 20x25x1 and 20x20x1 carbon qty 1 === 16.70; carbon 6-pack ≤ 16.70.
- **Added:** 2026-09-01

---

### FH-133 — Full Filter King catalog stayed behind a code flag the .env did not read
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** `.env` already had `VITE_FULL_CATALOG=true`, but the shop still sold only the 299 wholesale-sheet SKUs. `SELLABLE_ONLY` was hardcoded `true` in `shared/products.ts`, so carbon, 20x25x4, and off-sheet MERVs stayed quote-only.
- **Do NOT:** Hardcode `SELLABLE_ONLY = true`. Do not ignore `VITE_FULL_CATALOG` / `FULL_CATALOG`. Do not delete `shared/filter-catalog.json` or `shared/sellable-skus.json`.
- **Do:** `VITE_FULL_CATALOG=true` (and `FULL_CATALOG=true` for the API) sells every archived size × MERV, including carbon. `false` restores the wholesale allowlist. Checkout still refuses `inStock: false`.
- **Files:** `shared/products.ts`, `.env.example`, `scripts/verify-store.ts`, `shared/seo.ts`, `client/public/llms.txt`, `docs/WHOLESALE-PRICE-LISTS.md`
- **Verify:** `pnpm exec tsx scripts/verify-store.ts`. `/sizes/20x25x4` and `/sizes/20x25x1?merv=carbon` add to cart. `/#merv` Carbon card shows `from $`.
- **Added:** 2026-09-01

---

### FH-132 — Checkout collected no sales tax and no Stripe customer
- **Status:** mitigated
- **Area:** cart
- **Symptom:** Payment-mode Checkout had line items and a US address but no `automatic_tax`, no product tax code, and no Customer/Invoice. QBO/Stripe Connector had nothing to attach; catalog prices never grew tax.
- **Do NOT:** Drop `customer_creation: "always"`, `invoice_creation`, exclusive `tax_behavior`, or `txcd_99999999` on filter line items. Do not invent a different `txcd_` without Stripe’s tax-code list. Do not force `automatic_tax` on while Tax Settings are pending (FH-139).
- **Do:** Enable `automatic_tax` when Tax Settings are `active`. Persist subtotal/tax/customer/invoice/payment_intent on `orders.json`. Head office + registrations still happen in the Dashboard.
- **Files:** `server/stripe.ts`, `shared/stripe-tax.ts`, `client/src/pages/CheckoutSuccess.tsx`, `docs/STRIPE-BOOKS.md`, `scripts/verify-stripe-books.ts`
- **Verify:** `pnpm exec tsx scripts/verify-stripe-books.ts`. Start checkout — Stripe Customer is created; tax line appears only after Tax Settings are active and a registration exists for the ship-to state.
- **Added:** 2026-09-01

---

### FH-131 — Filter Clock must not send replacement emails before a purchase
- **Status:** mitigated
- **Area:** clock
- **Symptom:** Clock copy promised “we’ll email you before {date}” when someone only checked or saved a cadence. Replenish mail must not start until they buy.
- **Do NOT:** Enroll `replenish` (or any send) from Filter Clock check, house-profile save, or `Signed Up Reminder` / `intent: "reminder"` without `Placed Order`.
- **Do:** Clock is a calculator. Store cadence on the profile if they save it. Set the sendable `next_change_date` and enroll replenish only on `Placed Order` (`paid_at + interval`). Copy must say emails start after checkout.
- **Files:** `docs/KLAVIYO-REPLICA-PLAN.md`, `client/src/components/FilterPower.tsx`
- **Verify:** Clock save / check produces no customer replenish mail. A paid order does.
- **Added:** 2026-09-01

---

### FH-130 — Stale public robots.txt and llms.txt lagged the server
- **Status:** mitigated
- **Area:** seo
- **Symptom:** `client/public/robots.txt` omitted AI crawler rules the Express route already allowed. Static `llms.txt` said carbon had bulk pricing after carbon became quote-only.
- **Do NOT:** Let the copied public files contradict `shared/seo.ts` / `server/index.ts`.
- **Do:** Keep static copies aligned with the server generators (AI bots allowed; carbon quote-only). Prefer the Express routes in production.
- **Files:** `client/public/robots.txt`, `client/public/llms.txt`, `server/index.ts`, `shared/seo.ts`
- **Verify:** `/robots.txt` and `/llms.txt` via the API server; `vite preview` still has matching static files.
- **Added:** 2026-08-31

---

### FH-129 — SPA navigation dropped `og:type=article`
- **Status:** mitigated
- **Area:** seo
- **Symptom:** Filter Change Guide is an article in SSR, but client `useSeo` always set `og:type` to `website` unless the page was a product.
- **Do NOT:** Map only `product` vs everything-else-as-website.
- **Do:** Pass through `article` as `og:type=article`.
- **Files:** `client/src/hooks/useSeo.ts`
- **Verify:** `/how-often-to-change-air-filter` — document head `og:type` is `article`.
- **Added:** 2026-08-31

---

### FH-128 — Unsellable cart lines vanished on reload with no notice
- **Status:** mitigated
- **Area:** cart
- **Symptom:** `normalizeCart()` dropped SKUs that were no longer `inStock` (carbon, delisted wholesale) on hydrate. Shoppers saw a smaller cart and no explanation.
- **Do NOT:** Silently omit those lines on `loadCart()`.
- **Do:** Toast when one or more saved lines cannot be restored.
- **Files:** `client/src/contexts/CartContext.tsx`
- **Verify:** Seed `fpf-cart-v1` with an unknown `productId`, reload — toast fires, remaining good lines stay.
- **Added:** 2026-08-31

---

### FH-127 — Checkout cancel “quote instead” raced Home paint
- **Status:** mitigated
- **Area:** cart
- **Symptom:** Cancel page called `setLocation("/")` then scrolled to `#contact` after 100ms. Home often had not painted, so the scroll no-op’d and the URL had no hash for `useHashScroll`.
- **Do NOT:** Timebox a scroll after a client route change with no hash.
- **Do:** Navigate with `window.location.href = "/#contact"` so Home mounts and hash-scrolls.
- **Files:** `client/src/pages/CheckoutCancel.tsx`
- **Verify:** `/checkout/cancel` → Request a quote instead → lands on `/#contact`.
- **Added:** 2026-08-31

---

### FH-126 — Filter Clock reminder stored MERV as “filter size”
- **Status:** mitigated
- **Area:** clock
- **Symptom:** Reminder POST sent `filterSize: "MERV 11"` instead of Width × Length × Depth. Leads looked like a size request.
- **Do NOT:** Put `recommendedMervName` in `filterSize`.
- **Do:** Leave `filterSize` empty. Put depth + MERV + pack in `message`.
- **Files:** `client/src/components/FilterPower.tsx`
- **Verify:** Submit a Filter Clock reminder — lead `filterSize` is empty; message names thickness and MERV.
- **Added:** 2026-08-31

---

### FH-125 — Carbon carousel showed a “from $” price while quote-only
- **Status:** mitigated
- **Area:** pricing
- **Symptom:** MERV 8 Carbon is not on the wholesale allowlist, but the home MERV deck still rendered `from $6.37`.
- **Do NOT:** Display `fromPrice` for a rating `isMervKeyOnSale` rejects.
- **Do:** Show “Quote only” when the rating is not on sale.
- **Files:** `client/src/components/MervCarousel.tsx`, `scripts/verify-store.ts`
- **Verify:** `/#merv` — Carbon card says Quote only. `pnpm exec tsx scripts/verify-store.ts`
- **Added:** 2026-08-31

---

### FH-124 — Contact email failure returned 400 after the lead was saved
- **Status:** mitigated
- **Area:** contact
- **Symptom:** `appendLead()` ran, then Resend threw or returned `{ error }`. The API answered 400, so the shopper retried and duplicated the lead.
- **Do NOT:** Treat a saved lead as a failed submit just because email delivery failed.
- **Do:** Return `{ ok: true, emailed: false }` after a successful save. Log the Resend error.
- **Files:** `server/contact.ts`
- **Verify:** POST `/api/contact` with no `RESEND_API_KEY` still returns `{ ok: true }`.
- **Added:** 2026-08-31

---

### FH-123 — Stripe webhook wrote duplicate orders on retry
- **Status:** mitigated
- **Area:** other
- **Symptom:** Every `checkout.session.completed` appended to `orders.json`. Stripe retries created duplicate rows for the same `session.id`.
- **Do NOT:** Push an order when that `sessionId` already exists.
- **Do:** Skip duplicates. Persist shipping + phone from the session.
- **Files:** `server/stripe.ts`
- **Verify:** Handle the same completed event twice — `orders.json` has one row.
- **Added:** 2026-08-31

---

### FH-122 — Production leads and orders wrote into `dist/data`
- **Status:** mitigated
- **Area:** other
- **Symptom:** Paths used `__dirname/data`. Dev wrote `server/data/`. Production `dist/index.js` wrote `dist/data/`, which a redeploy wipes.
- **Do NOT:** Resolve lead/order files from the bundled file’s directory.
- **Do:** Write to `DATA_DIR` or `<cwd>/server/data`.
- **Files:** `server/data-store.ts`, `server/contact.ts`, `server/stripe.ts`, `.env.example`
- **Verify:** After `pnpm start`, new leads land in `server/data/leads.json`.
- **Added:** 2026-08-31

---

### FH-121 — Success page cleared the cart without verifying payment
- **Status:** mitigated
- **Area:** cart
- **Symptom:** Visiting `/checkout/success` with no `session_id` still called `clearCart()` and said “Payment successful.”
- **Do NOT:** Trust the success URL alone.
- **Do:** `GET /api/checkout/session?session_id=` and clear the cart only when Stripe says `paid`.
- **Files:** `server/stripe.ts`, `server/index.ts`, `client/src/pages/CheckoutSuccess.tsx`
- **Verify:** Open `/checkout/success` — cart stays, copy says no session. Invalid `session_id` does not clear the cart.
- **Added:** 2026-08-31

---

### FH-120 — Stripe Checkout did not collect a shipping address
- **Status:** mitigated
- **Area:** other
- **Symptom:** `checkout.sessions.create()` had line items only. Stripe could charge with no deliverable US address.
- **Do NOT:** Create payment-mode sessions without `shipping_address_collection`.
- **Do:** Collect US shipping addresses and phone. Store them on the webhook order.
- **Files:** `server/stripe.ts`
- **Verify:** Start checkout — Stripe asks for a US shipping address.
- **Added:** 2026-08-31

---

### FH-119 — Hash scroll only ran on first mount
- **Status:** mitigated
- **Area:** other
- **Symptom:** `useHashScroll` used `[]` deps and no `hashchange` listener. Back/Forward between `/#contact` and `/#finder` did not re-scroll because Home stayed mounted.
- **Do NOT:** Scroll hash targets only once per page mount.
- **Do:** Re-run on `hashchange` with the same retry timers.
- **Files:** `client/src/hooks/useHashScroll.ts`
- **Verify:** On `/`, click footer Contact then Finder in the header — each hash scrolls to the matching section.
- **Added:** 2026-08-31

---

### FH-118 — Hero pack tiles ignored the selected MERV
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 8 / Carbon / 11 / 13 packs all linked to `/sizes/20x25x1` with no `?merv=` and no preferred-MERV stash. Carbon is not even sellable.
- **Do NOT:** Point every pack at the default MERV 8 PDP.
- **Do:** Shopable packs go to `/sizes/20x25x1?merv={key}` and `setPreferredMerv`. Carbon (quote-only) goes to `/custom-air-filters`.
- **Files:** `client/src/components/Hero.tsx`
- **Verify:** `/` — MERV 13 pack opens 20x25x1 on MERV 13. Carbon pack opens custom quote.
- **Added:** 2026-08-31

---

### FH-117 — Cart quote handoff was cleared before the destination page could read it
- **Status:** mitigated
- **Area:** cart
- **Symptom:** `CartDrawer` stashed the cart, then Home and Filter Change Guide called `takeQuoteHandoff()` and navigated away. The destination form read an empty stash, so “Cart attached” never appeared.
- **Do NOT:** Call `takeQuoteHandoff()` and then leave the page that needs that payload.
- **Do:** On Home, consume the stash into the contact form and scroll to `#contact`. On other pages, navigate to `/#contact` and let Home’s mount effect take it.
- **Files:** `client/src/pages/Home.tsx`, `client/src/pages/FilterChangeGuide.tsx`, `client/src/lib/quote-handoff.ts`
- **Verify:** Add a size to cart on Home → Request a quote → contact form shows the cart summary. Repeat from `/how-often-to-change-air-filter`.
- **Added:** 2026-08-31

---

### FH-116 — Hero video used invalid React `defaultMuted` prop
- **Status:** mitigated
- **Area:** photos
- **Symptom:** `pnpm check` (`tsc --noEmit`) failed: `defaultMuted` is not a valid React `<video>` prop, so the client typecheck did not pass.
- **Do NOT:** Put `defaultMuted` back on the JSX `<video>` element.
- **Do:** Keep `muted` on the element. Set `node.muted` and `node.defaultMuted` on the video ref so autoplay still starts muted.
- **Files:** `client/src/components/Hero.tsx`
- **Verify:** `pnpm check`
- **Added:** 2026-08-31

---

### FH-115 — Hero brand strip did not mention custom sizes
- **Status:** mitigated
- **Area:** brands
- **Symptom:** The navy brand-row line read “Filter King also fits 30+ major brands” and said nothing about custom filters.
- **Do NOT:** Restore “Filter King also fits 30+ major brands” as the strip copy.
- **Do:** Keep “Guaranteed to fit 30+ major brands and we can customize them” (uppercase via CSS) above the brand marks. Size the line so the longer sentence still fits the right-hand strip.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — brand strip shows the new line above the logos.
- **Added:** 2026-08-31

---

### FH-114 — Hero claim line named Trane, Carrier, Rheem + 30 more
- **Status:** mitigated
- **Area:** other
- **Symptom:** Under the Filter King lockup, desktop showed “GUARANTEED TO FIT TRANE, CARRIER, RHEEM + 30 MORE.”
- **Do NOT:** Restore `.hero-filter-claim-sub` or that brand list under the Filter King mark.
- **Do:** Keep only the Filter King lockup in `.hero-filter-claim`. Brand fit still lives in the lede and the brand row.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — no “Guaranteed to fit Trane, Carrier, Rheem + 30 more” under the lockup.
- **Added:** 2026-08-31

---

### FH-113 — Hero character used a warped still instead of a real flight clip
- **Status:** mitigated
- **Area:** photos
- **Symptom:** `character-fly.webm` was a procedural orbit of the standing PNG. Shoppers asked for a real flight of the official sheet character, cape-as-filter catching dust, not Higgsfield.
- **Do NOT:** Put the sliding-still loop back as the hero source. Do not swap in a look-alike. Do not restore the outlined HERO wordmark.
- **Do:** Loop Gemini Veo `character-fly-natural.webm` / `.mp4` from the official sheet still. Poster and reduced-motion still are `character-fly-still.png`. Keep him receded in the middle lane.
- **Files:** `client/public/hero/character-fly-natural.webm`, `client/public/hero/character-fly-natural.mp4`, `client/public/hero/character-fly-still.png`, `scripts/_veo_filter_hero_fly.py`, `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` — mascot flies naturally between FILTER HERO and the packs; cape mesh catches dust; reduced motion shows the flying still.
- **Added:** 2026-08-31

---

### FH-112 — Hero CTAs mixed a pill with the site slant
- **Status:** mitigated
- **Area:** other
- **Symptom:** “Find your filter size” used the crimson parallelogram, but “Start your clock” sat next to it as a rounded ghost pill — leftover outline styling that does not match header FIND, finder, or other shop buttons.
- **Do NOT:** Pair `.hero-shop-btn` with a rounded/pill outline, `variant="outline"`, or sentence-case type. Do not restyle the clock CTA as a navy pill.
- **Do:** Keep both hero actions on the Filter Hero CTA geometry — same slant, italic uppercase, and height. Primary stays crimson (`.hero-shop-btn`). Secondary is the ice ghost (`.hero-ghost-btn`). Reuse that pair on other navy bands (Filter Clock page).
- **Files:** `client/src/index.css`, `client/src/components/Hero.tsx`, `client/src/pages/FilterChangeGuide.tsx`
- **Verify:** `/` — both hero buttons share the slant and type; primary crimson, secondary ice. `/how-often-to-change-air-filter` — Get your number / Shop your size use the same pair.
- **Added:** 2026-08-31

---

### FH-111 — Trust marquee chips sat too small after the hero lift
- **Status:** mitigated
- **Area:** other
- **Symptom:** After FH-108–FH-110 moved the packs and brand row up, the Free Shipping / fit / MERV chips still read as a thin strip.
- **Do NOT:** Shrink `.trust-chip` / `.trust-ship-chip` back to `0.86rem` / `0.9rem` or restore `py-2.5 md:py-3` on the track.
- **Do:** Keep the first-screen marquee larger — taller bar, bigger pills and icons — while it still sits in the first viewport under the hero.
- **Files:** `client/src/components/TrustMarquee.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — marquee chips are clearly larger; still visible without scrolling; brand row stays above it.
- **Added:** 2026-08-31

---

### FH-110 — Hero brand row sat low and only showed three marks
- **Status:** mitigated
- **Superseded by:** FH-258 (quarter-inch raise of the 30+ brand strip)
- **Area:** brands
- **Symptom:** The “Filter King also fits 30+ major brands” strip sat too close to the marquee and only showed Trane, Carrier, and Rheem.
- **Do NOT:** Park `.hero-brands` at `bottom: 2.5%`. Do not drop Goodman or Lennox from the hero marks.
- **Do:** Keep the strip a tad higher (`bottom: 6%`) with Trane, Carrier, Rheem, Goodman, and Lennox in the same white pills. Packs stay above; marquee stays below.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — brand row sits closer to the packs and shows five logos, including Goodman and Lennox.
- **Added:** 2026-08-31

---

### FH-109 — Hero Filter King packs still sat a little low
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-108 the four packs still sat a tad low under the Filter King claim.
- **Do NOT:** Drop `.hero-pack-row` back to `top: 14%` / `bottom: 22%` (or `top: 19%` on short desktop). Do not cover the claim or the 30+ brand line.
- **Do:** Keep the lineup a little higher still (`top: 11%` / `bottom: 25%`, `top: 16%` on short desktop). Claim stays above, brands stay below.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — four packs sit closer to the Filter King claim, with clear space above the brand row.
- **Added:** 2026-08-31

---

### FH-108 — Hero Filter King packs sat too low
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-107 the four packs sat low in the right column, with extra empty air under the Filter King claim.
- **Do NOT:** Drop `.hero-pack-row` back to `top: 17%` / `bottom: 18%` (or `top: 22%` on short desktop). Do not cover the claim or the 30+ brand line.
- **Do:** Keep the lineup a little higher (`top: 14%` / `bottom: 22%`, `top: 19%` on short desktop). Claim stays above, brands stay below.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — four packs sit closer to the Filter King claim, with clear space above the brand row.
- **Added:** 2026-08-31

---

### FH-107 — Hero Filter King packs sat too close together
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 8 / Carbon / MERV 11 / MERV 13 in the home hero lineup had only a 0.2rem gap, so the four pack frames almost touched.
- **Do NOT:** Collapse `.hero-pack-row` back to `gap: 0.2rem` / `0.25rem`. Do not restack them into an overlapping fan.
- **Do:** Keep a little air between each isolated pack (`gap: 0.9rem`, `1rem` on short desktop). Claim stays above, brands stay below.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — four Filter King packs side by side with a visible gap between frames.
- **Added:** 2026-08-31

---

### FH-106 — Hero character needed a flight loop in his exact form
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Shoppers wanted the mascot flying around the background without changing his crossed-arms illustrated form. Higgsfield image-to-video was unavailable (expired session).
- **Do NOT:** Replace him with a new pose, a generated look-alike, or the outlined HERO wordmark. Do not freeze him as a still.
- **Do:** Loop `character-fly.webm` in the middle lane — same character, cape blowing, figure-eight flight on transparent. Poster is `character.png`. Reduced motion keeps the still.
- **Files:** `client/public/hero/character-fly.webm`, `scripts/_cape_fly.py`, `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` — character flies in the gap between FILTER HERO and the packs. `prefers-reduced-motion` shows the PNG.
- **Added:** 2026-08-31

---

### FH-105 — Hero character sat behind the packs instead of the middle lane
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-104 the mascot filled the old HERO-outline zone under the Filter King packs, not the gap beside FILTER HERO.
- **Do NOT:** Park him at `left: 40%` / `width: 58%` behind the packs. Do not put the outlined HERO back. Do not slide the copy or packs with him.
- **Do:** Receded idle character sits in the middle lane (`left: 26%`, `width: 40%`) between the FILTER HERO type and the packs. Copy and packs stay put.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — figure visible between the lockup and the four packs; cape may tuck under the packs.
- **Added:** 2026-08-31

---

### FH-104 — Giant outlined HERO sat where the mascot belongs
- **Status:** mitigated
- **Area:** photos
- **Symptom:** A faded outlined HERO wordmark filled the right background; the character was on the left instead of occupying that slot.
- **Do NOT:** Put `.hero-wordmark` back. Do not keep the mascot in the left letter lane.
- **Do:** Remove the outlined HERO. The idle character is the background in that right-center zone, receded behind the packs (`z-index: 2`, opacity ~0.4). Copy and packs stay in front.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — no giant HERO outline; cape-loop character fills that background behind the Filter King packs.
- **Added:** 2026-08-31

---

### FH-103 — Hero foreground sat too far right of the mascot
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Copy, packs, claim, and brand marks sat a bit too far right of the receded character.
- **Do NOT:** Move `.hero-character-slot`. Do not shift the mascot with the foreground.
- **Do:** Nudge only the live foreground left — copy `padding-left` 14/20vw → 11/17vw; packs, claim, and brands `left` 56% → 53%.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — FILTER HERO type and Filter King packs sit slightly left; character stays put.
- **Added:** 2026-08-31

---

### FH-102 — Hero character sat too far right of the lockup
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-101 the receded mascot sat under the Filter King packs on the right, away from FILTER HERO / the H1.
- **Do NOT:** Park him in the right-center pack lane. Do not put him front and center at full opacity.
- **Do:** Keep him receded (`z-index: 2`, opacity ~0.46). Desktop stands on the left, immediately beside the main letters. Copy starts after the torso (`padding-left` ~20vw). Packs stay on the right.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — figure on the left next to FILTER HERO; packs unchanged on the right.
- **Added:** 2026-08-31

---

### FH-101 — Hero character sat too far forward
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-100 the mascot filled the middle of the stage at full opacity, so he read as the main subject instead of background atmosphere.
- **Do NOT:** Scale him over the full stage at opacity 1 in front of the packs. Do not park him under the headline.
- **Do:** Keep him behind copy and packs (`z-index: 2`, opacity ~0.4, dimmed). Desktop sits in the right-center lane under the Filter King packs. Cape loop still plays.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — character visible as a receded figure behind the packs; lockup and H1 stay readable on the left.
- **Added:** 2026-08-31

---

### FH-100 — Hero character sat under the headline
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The faded mascot sat behind FILTER HERO / the H1, so the type was hard to read and the figure was hard to see.
- **Do NOT:** Park him under the lockup at ~0.5 opacity with a right-edge fade. Do not dim him with saturate/brightness filters.
- **Do:** Desktop — copy stays on the left over a navy wash. Character stands in the middle lane at full opacity and larger scale; packs stay on the right over the cape. Mobile — figure sits in the upper stage, copy stays on the bottom gradient.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — torso visible between headline and packs; lockup readable. `/` mobile — character above the copy block.
- **Added:** 2026-08-31

---

### FH-099 — Dual-logo claim lost its fade
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After the lighter wash, the lockup sat in a hard clipped box with a border. The old claim faded out into the hero.
- **Do NOT:** Put the clipped plate, border, or solid non-fading fill back. Do not restore the darker `rgba(10,16,30)` strip.
- **Do:** Same lighter navy/mesh color, same fade as the original claim — strong at the top, transparent at the bottom. No clip, no border.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — lockup panel is lighter blue and dissolves into the stage. No hard box edge.
- **Added:** 2026-08-31

---

### FH-098 — Dual-logo claim sat in a darker navy strip
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The Filter King now-at Filter Hero plate read as the same deep navy as the hero stage, so the lockup disappeared into the background.
- **Do NOT:** Recolor the whole hero stage. Do not put a white plate behind the marks.
- **Do:** Only `.hero-filter-claim` gets a lighter navy/mesh wash (`rgba(45,78,138)` into `#203868`). Marks stay transparent. Rest of the hero wash stays.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — lockup panel is a step lighter blue than the stage. Packs and left copy unchanged.
- **Added:** 2026-08-31

---

### FH-097 — Hero character was a frozen still again
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The background mascot used `character.png` and did not move; the cape-blowing idle loop was off.
- **Do NOT:** Leave a static PNG in `.hero-character-slot`. Do not put the video in front of the headline. Do not swap the pose.
- **Do:** Loop `character-idle.webm` in the same receded slot (behind copy, faded). Poster is `character.png`. `prefers-reduced-motion` keeps the still.
- **Files:** `client/src/components/Hero.tsx`, `client/public/hero/character-idle.webm`
- **Verify:** `/` — character stays planted behind FILTER HERO type; cape loops. Reduced motion shows the PNG.
- **Added:** 2026-08-31

---

### FH-096 — Dual-logo tag said FROM, which implied Filter Hero makes Filter King
- **Status:** mitigated
- **Area:** photos
- **Symptom:** “Filter King FROM Filter Hero” read as origin/manufacture. Filter Hero only sells Filter King.
- **Do NOT:** Use FROM, BY, or SELLS / sold by in the lockup. Do not imply Filter Hero manufactures Filter King.
- **Do:** Connector is “NOW AT” — Filter King now at Filter Hero. Transparent marks still sit on the hero wash.
- **Files:** `client/src/components/Hero.tsx`, `client/public/hero/fh-sells-fk.png`, `scripts/compose-brand-lockup.py`
- **Verify:** `/` desktop — reads Filter King now at Filter Hero. No FROM.
- **Added:** 2026-08-31

---

### FH-095 — Dual-logo tag sat on a white plate
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The Filter Hero / Filter King lockup used a white card and the word “SELLS,” so it floated off the navy hero and read like a checkout line.
- **Do NOT:** Put the white plate or `background: #f7f8fb` back on the tag image. Do not use “SELLS.”
- **Do:** Transparent lockup that sits on the hero wash. Ice-tinted official marks. Connector is “FROM” — Filter King from Filter Hero.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/fh-sells-fk.png`, `scripts/compose-brand-lockup.py`
- **Verify:** `/` desktop — no white box behind the marks. Reads Filter King from Filter Hero.
- **Added:** 2026-08-30

---

### FH-094 — Hero tag now uses both brand marks
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The claim still read as copy. Shoppers needed a visual that Filter Hero sells Filter King, using both official logos.
- **Do NOT:** Put the maroon text pill back. Do not drop either logo. Do not replace the lockup with a filter-only photo.
- **Do:** The tag is the official Filter Hero mark, a slanted SELLS ticket, and the official Filter King lion mark on one plate. Fit line stays under it.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/fh-sells-fk.png`, `scripts/compose-brand-lockup.py`
- **Verify:** `/` desktop — both logos readable, SELLS between them, no “Our Filter King filters.”
- **Added:** 2026-08-30

---

### FH-093 — Hero Filter King pill was not a statement
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The right-side lockup was a red pill that only said “Filter King — by Filter Hero,” then a second line “Our Filter King filters.” It read as a label, not a claim, and hid the actual filter.
- **Do NOT:** Put the maroon pill or the “Our Filter King filters.” headline back. Do not drop Filter King / Filter Hero from the statement. Do not replace the build plate with text-only attribution.
- **Do:** The claim is one slanted statement plate: cinematic shot of the bare filter build plus “This is Filter King. Built by Filter Hero.” Keep the fit line under it. Packs stay below.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/filter-build.png`
- **Verify:** `/` desktop — no “Our Filter King filters.” No red pill. Statement plate with the filter visual sits above the four packs.
- **Added:** 2026-08-30

---

### FH-092 — Hero captions redesigned off the pill
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Under-pack pills (text, then capture dots) read as a second bubble system and fought the lineup.
- **Do NOT:** Put pills, glass chips, or capture dots back under the hero packs. Do not invent another caption row below the filters.
- **Do:** Each pack wears a slanted rating ticket on the product — same cut as the shop CTAs. Grade + use (Dust / Odors / Pets / Allergies). Carbon is the ice ticket. Catch-page dots stay on the catch cards only.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — four slanted tickets sit on the packs. No pills under the row. Brands and claim stay clear.
- **Added:** 2026-08-30

---

### FH-091 — Hero captions did not match catch bubbles
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The four hero pills under the packs were text-only. They did not use the CAPTURE dots from “What should your filter catch?”
- **Do NOT:** Put the text-only navy pills back. Do not invent a second dot scale for the hero.
- **Do:** Hero captions use the shared `CaptureDots` (MERV 8 / Carbon: 1 filled, even size; MERV 11: 3 filled, slightly larger; MERV 13: 5 filled, growing). Pill chrome tints to the same accent. Catch cards and size-page Capture use the same component.
- **Files:** `client/src/components/CaptureDots.tsx`, `client/src/components/Hero.tsx`, `client/src/components/MervCarousel.tsx`, `client/src/pages/SizeDetail.tsx`, `client/src/lib/merv-guide.ts`, `client/src/index.css`
- **Verify:** `/` desktop — each pack caption shows the matching capture dots. `/` catch cards and `/sizes/20x25x1` Capture match those fills and sizes.
- **Added:** 2026-08-30

---

### FH-090 — Hero packs sat still after the lineup
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After the side-by-side restage, MERV 8 / Carbon / MERV 11 / MERV 13 no longer floated.
- **Do NOT:** Put the packs back on overlapping corners to get motion. Do not turn the float off.
- **Do:** Keep the row. Each pack uses its old `hero-float-*` idle. Reduced motion still kills the animation.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — four packs side by side and drifting on their old float cycles.
- **Added:** 2026-08-30

---

### FH-089 — Hero MERV 13 used the older pack shot
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The lineup still showed the previous MERV 13 render instead of the photoreal Filter King MERV 13 the shop should use.
- **Do NOT:** Point MERV 13 at `showcase-merv13.png` or the old `merv-13-packshot.png`. Do not leave MERV 13 on a different canvas than MERV 8 / 11.
- **Do:** Official and source pack shots are the uploaded photoreal MERV 13. Hero isolate is the same file, cropped to the 508×833 canvas as the other packs.
- **Files:** `client/public/products/merv-13-packshot.png`, `client/public/products/source/merv-13-packshot.png`, `client/public/hero/pack-merv13.png`, `client/src/components/Hero.tsx`, `shared/products.ts`
- **Verify:** `/` hero MERV 13 matches the photoreal upload and sits the same size as MERV 8 / 11 / Carbon. `/sizes/20x25x1` MERV 13 gallery uses the new pack shot.
- **Added:** 2026-08-30

---

### FH-088 — Hero packs sat in a small overlapping fan
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 8 / Carbon / MERV 11 / MERV 13 were tilted and stacked, so they read small and graphic instead of a product lineup.
- **Do NOT:** Put the four packs back on absolute overlapping corners or restore the tilt/float collage. Do not cover the Filter King claim or 30+ brand line.
- **Do:** Stand the official isolated pack shots in one row. Keep them large (`max-height: 52vh`, `34vh` on short screens). Claim stays above, brands stay below. Do not let MERV 8 cover the lede or CTAs.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/pack-merv8.png`, `client/public/hero/pack-merv11.png`, `client/public/hero/pack-merv13.png`
- **Verify:** `/` desktop — four filters side by side, larger, claim and brand type readable.
- **Added:** 2026-08-30

---

### FH-087 — Header CTAs drifted from the shop buttons
- **Status:** mitigated
- **Area:** header
- **Symptom:** FIND, Need a custom size, and How to measure did not share the Filter Hero crimson slant / italic used on hero and finder buttons. Header FIND also skipped the preferred MERV query the page finder sends. Cold `/#clock` and `/#how-to-measure` loads missed their sections.
- **Do NOT:** Style header actions as navy pills or plain text links. Do not send header FIND to a different size route than `FilterFinder`.
- **Do:** Header FIND / custom use the same crimson slanted CTA as `.hero-shop-btn`. How to measure stays a crimson pill. Header FIND appends `?merv=` from `getPreferredMerv()`. Hash landings retry until the section is in view.
- **Files:** `client/src/index.css`, `client/src/components/SiteHeader.tsx`, `client/src/hooks/useHashScroll.ts`
- **Verify:** `/` header — FIND and custom match the shop CTAs; FIND opens `/sizes/20x25x1`; How to measure / Filter Clock land on their sections from a fresh `/#` URL.
- **Added:** 2026-08-30

---

### FH-086 — Header lockup left the 8:09 shopper bar
- **Status:** mitigated
- **Area:** header
- **Symptom:** The top bar no longer matched the running-mark + Filter Hero shopper header (Shop / Brands / Filter Clock / Contact, How to Measure, size finder, Need a Custom Size, cart).
- **Do NOT:** Put `/hero/nav-icon.png` or the italic uppercase FILTER / HERO lockup back in the header. Do not hide `SiteHeader` from the top of `/`.
- **Do:** Header stays first. Emblem is the `/logo.png` running crop beside title-case Filter Hero. Full shopper chrome stays in one top row.
- **Files:** `client/src/components/BrandLockup.tsx`
- **Verify:** `/` — navy header at the top matches the 8:09 bar; trust chips still sit on the first screen under the hero.
- **Added:** 2026-08-30

---

### FH-085 — Trust marquee sat below the first screen
- **Status:** mitigated
- **Area:** other
- **Symptom:** Free Shipping / Built To Last / MERV / support chips only appeared after scrolling past the locked hero.
- **Do NOT:** Hide `.home-lock-rest` or lock `html` / `body` / `#root` overflow. Do not put the marquee back under the hero-only first viewport.
- **Do:** First screen is header + hero + `TrustMarquee`. Hero flexes into the leftover height. The rest of the shop still scrolls below.
- **Files:** `client/src/pages/Home.tsx`, `client/src/index.css`, `client/src/components/TrustMarquee.tsx`
- **Verify:** `/` — chips visible without scrolling; scroll still reaches finder, clock, footer.
- **Added:** 2026-08-30

---

### FH-084 — Home hid everything below the hero
- **Status:** mitigated
- **Area:** other
- **Symptom:** `/` showed only the header and hero. Shoppers could not scroll to Find your size, Filter Clock, brands, FAQ, contact, or the footer.
- **Do NOT:** Set `.home-lock-rest { display: none }` or lock `html` / `body` / `#root` / `.home-lock` to `100dvh` + `overflow: hidden`. Do not redirect `/#clock`, `/#faq`, `/#contact`, `/#finder`, or `/#how-to-measure` away from the home sections.
- **Do:** Header + hero still fill the first viewport. The rest of the page sits below in normal flow. Hash links scroll to those home sections.
- **Files:** `client/src/index.css`, `client/src/pages/Home.tsx`, `client/src/components/SiteHeader.tsx`
- **Verify:** `/` — scroll past the hero to the trust bar, finder, clock, brands, FAQ, contact, footer. Header Filter Clock / How to measure / FAQ / contact stay on `/`.
- **Added:** 2026-08-30

---

### FH-083 — Filter King claim sat under the packs
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After the scale-up, MERV 8 covered “Our Filter King filters” / “Guaranteed to fit…”, and Carbon covered “Filter King also fits 30+ major brands.”
- **Do NOT:** Let pack shots share the top or bottom type bands.
- **Do:** Top band for the claim, bottom band for the 30+ line, packs in the middle at `max-height: 34vh` so every word stays visible.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — claim and brand lines fully readable; packs do not cover type.
- **Added:** 2026-08-30

---

### FH-082 — Hero type and packs read too small
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The locked first screen left empty navy around the lockup, headline, and Filter King packs compared with the reworded preview.
- **Do NOT:** Shrink the desktop lockup back under 5rem or cap pack shots at 36vh.
- **Do:** Scale lockup, title, lede, CTAs, claim, packs, brand marks, and the character together. Keep the giant outlined HERO behind the packs.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — type and packs fill the stage like the preview; header still on the first screen.
- **Added:** 2026-08-30

---

### FH-081 — Leftover hero line overlays stayed on
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After hiding `.hero-mesh`, diagonal ray streaks and dust still read as leftover graph lines on the stage.
- **Do NOT:** Put `.hero-mesh`, `.hero-rays`, `.hero-slash`, or `.hero-dust` back on the home hero.
- **Do:** Navy wash only. The filter-grid lives on the cape, not the stage.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` — no grid, no diagonal streaks behind copy or packs.
- **Added:** 2026-08-30

---

### FH-080 — Hero graph-paper grid came off
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The stage still showed a graph-paper grid behind the figure and the Filter King packs.
- **Do NOT:** Turn `.hero-mesh` back on.
- **Do:** Keep the navy wash only. No graph overlay.
- **Files:** `client/src/index.css`
- **Verify:** `/` — smooth navy behind character and packs; no grid lines.
- **Added:** 2026-08-30

---

### FH-079 — Hero looked like two different backgrounds
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Dark grid sat behind the character; a lighter, ungridded blue sat behind the Filter King packs, with a diagonal seam in the middle.
- **Do NOT:** Mask `.hero-mesh` / `.hero-rays` to the left 24%. Do not keep `.hero-slash` or the 118° ramp that ends in `#2f5a96`.
- **Do:** One navy field across the stage. Grid and rays cover the full width. No copy-column wash. No diagonal slash.
- **Files:** `client/src/index.css`
- **Verify:** `/` — same navy + grid behind the figure and the packs; no left/right seam.
- **Added:** 2026-08-30

---

### FH-078 — Hero stage wash no longer matched the preview
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Shifting the mascot also moved the ice/red/navy blobs, so the stage no longer matched `hero-reworded-preview_2.html`.
- **Do NOT:** Recolor the 118° navy ramp. Do not keep the center-weighted ice blob from FH-077.
- **Do:** Use the preview wash: ice at 72% 42%, red at 8% 88%, blue at 4% 12%. Leave copy and Filter King packs in place.
- **Files:** `client/src/index.css`
- **Verify:** `/` — dark left, ice light on the right, same navy ramp as the preview.
- **Added:** 2026-08-30

---

### FH-077 — Hero background hugged the left crop
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After receding the mascot, the figure, grid, and glow still sat on the far left and clipped off the edge.
- **Do NOT:** Slide the Filter King packs or the headline with the background. Do not pin the character at `left: -6%`.
- **Do:** Keep copy and products where they are. Shift the stage wash, mesh, rays, glow, ground, red orb, and character slot right so the figure sits behind the lockup.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — full figure visible under FILTER HERO type, not cut off on the left; packs stay on the right.
- **Added:** 2026-08-30

---

### FH-076 — Hero character sat too far forward
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The crossed-arms figure read as the main subject, in front of the headline, instead of sitting behind FILTER HERO copy like the reworded preview.
- **Do NOT:** Put the idle video back in front of the type. Do not crop the cape or hide the filter-mesh lining. Do not paint a banner composite.
- **Do:** Keep the existing crossed-arms mascot (`character.png` — red chest, navy legs, filter-grid cape). Sit him left and back: `opacity` ~0.58, right-edge fade, dimmer glow, `z-index: 2` under `.hero-copy`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/character.png`
- **Verify:** `/` desktop — character visible behind the lockup and headline; Filter King packs stay on the right.
- **Added:** 2026-08-30

---

### FH-075 — Header character icon looked blank after the public swap
- **Status:** mitigated
- **Area:** header
- **Symptom:** The header mark stayed empty after `BrandLockup` pointed at `/hero/nav-icon.png`. The file was valid; the slot was still the old wide `logo.png` crop (`md:w-[4.6rem]` on a 48px-tall box), so the 528×650 portrait sat in empty navy and read as a blank gap.
- **Do NOT:** Route the icon through `useKnockoutLogo()` (punches out the eye slits). Do not keep the old crop (`h-[168%]` / `object-[center_8%]` / `overflow: hidden`) or the wide 4.6rem mark box.
- **Do:** Size `.brand-emblem` to the icon aspect (~0.81). Load `/hero/nav-icon.png` eagerly with intrinsic 528×650. `object-contain` / `object-center`.
- **Files:** `client/src/components/BrandLockup.tsx`, `client/src/components/SiteHeader.tsx`, `client/src/index.css`, `client/public/hero/nav-icon.png`
- **Verify:** `/` header — crossed-arms character fills the mark beside italic FILTER / HERO; Network `/hero/nav-icon.png?v=fh075` 200.
- **Added:** 2026-08-30

---

### FH-074 — Hero restaged left, header stays on the first screen
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The live hero still read as a right-side lineup, and the giant outlined HERO sat next to the character. The shopper header (logo, Shop / Brands / Filter Clock / Contact, How to Measure, size finder, Need a Custom Size, cart) must stay on the locked first screen.
- **Do NOT:** Hide or remove `SiteHeader` from `.home-lock`. Do not put a painted banner back. Do not crop the CAPE BLOW figure. Do not add Carbon / MERV 13 caption pills. Do not flood-fill pack shots.
- **Do:** Keep header + hero as the only first-screen stack. Character lives on the left with copy over the cape. Replace the lone HERO wordmark with the Filter / Hero lockup (white + crimson). Filters and 30+ brand claim stay on the right.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/src/pages/Home.tsx`
- **Verify:** `/` — navy header bar still sits above the hero; character left, copy on cape, Filter King packs right; no page scroll.
- **Added:** 2026-08-30

---

### FH-073 — Hero character was a frozen still
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The standing hero did not move; the cape did not blow.
- **Do NOT:** Replace him with a new pose, walk cycle, or a painted banner. Do not crop the figure.
- **Do:** Loop `character-idle.webm` in the same slot — crossed arms, subtle idle, cape blowing. Poster is `character.png`. Prefer reduced-motion still. Higgsfield image-to-video was unavailable (expired session).
- **Files:** `client/public/hero/character-idle.webm`, `client/src/components/Hero.tsx`, `scripts/_cape_idle.py`
- **Verify:** `/` — character stays planted; cape loops. `prefers-reduced-motion` shows the PNG.
- **Added:** 2026-08-30

---

### FH-072 — Hero brand fit claim was easy to miss
- **Status:** mitigated
- **Area:** photos
- **Symptom:** “Fits 38 brands” and the Trane / Carrier / Rheem marks were tiny and scattered under the packs.
- **Do NOT:** Scatter the three logos at different heights in 0.62rem type.
- **Do:** One brand strip under the filters: “We also fit 30+ major brands” plus larger white Trane, Carrier, and Rheem marks.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — the three logos read clearly; the 30+ line sits with them.
- **Added:** 2026-08-30

---

### FH-071 — Carbon and MERV 13 hero captions duplicated the boxes
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Extra pills under Carbon and MERV 13 repeated “Carbon / Odor eliminator” and “MERV 13 / Superior.”
- **Do NOT:** Paint those words off the pack-shot PNGs. Do not hide the printed labels on the boxes.
- **Do:** Leave those two hero captions off. The boxes already name the SKU.
- **Files:** `client/src/components/Hero.tsx`
- **Verify:** `/` desktop — no Carbon or MERV 13 caption pills under those two packs.
- **Added:** 2026-08-30

---

### FH-070 — Hero character sat too low under the filters
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The character needed a small lift without moving the filter cluster.
- **Do NOT:** Raise `.hero-lineup` or the pack bottoms for this.
- **Do:** Desktop `.hero-character-slot` is `bottom: 10%` / `height: 84%`.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — character a bit higher; filters stay put.
- **Added:** 2026-08-30

---

### FH-069 — Hero filters needed a guarantee line above them
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Filters sat low with no copy tying them to the brands we fit.
- **Do NOT:** Leave the packs on the bottom edge with no claim above them.
- **Do:** Raise the filter cluster. Desktop line above them: “These are the filters we sell. Guaranteed to fit all major brands.” Hidden on mobile.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — packs sit higher; guarantee line sits above the cluster.
- **Added:** 2026-08-30

---

### FH-068 — Hero filters sat too close to the character
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The four packs needed to sit a bit farther right of the character, without moving him.
- **Do NOT:** Shift `.hero-lineup` or the character slot for this.
- **Do:** Nudge only the showcase products (and the brand marks under them) ~5% right.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — character stays put; filters and brand marks sit slightly farther right.
- **Added:** 2026-08-30

---

### FH-067 — Hero cast needed another nudge right
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-066 the character and filters still sat too close to the copy.
- **Do NOT:** Leave `.hero-lineup` at `left: 36%`.
- **Do:** Desktop lineup starts at `left: 42%`.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — character and packs sit farther right, more air between title and the group.
- **Added:** 2026-08-30

---

### FH-066 — Hero cast sat too far left over the copy
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Character and filters crowded the headline instead of using the open right side.
- **Do NOT:** Pin `.hero-lineup` at `left: 28%` on desktop.
- **Do:** Desktop lineup starts at `left: 42%` so the character and packs sit farther right as one group.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — character and four filters clear of the title, more open space on the left.
- **Added:** 2026-08-30

---

### FH-065 — Logo font change was not visible in the hero
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The hero still looked like the old title face after FH-064. Google italic may not have loaded, and h1 utilities kept Plus Jakarta Regular Bold.
- **Do NOT:** Rely on the Google Fonts italic URL alone. Do not leave the lockup only in the header.
- **Do:** Self-host Plus Jakarta ExtraBold Italic as `FilterHero`. Show a FILTER / HERO lockup in the hero copy. Force `h1.hero-title` onto that face.
- **Files:** `client/public/fonts/plus-jakarta-extrabold-italic.woff2`, `client/src/index.css`, `client/src/components/Hero.tsx`
- **Verify:** `/` — ice FILTER + crimson HERO sit above the headline in the italic extra-bold lockup face.
- **Added:** 2026-08-30

---

### FH-064 — Hero headline did not use the logo font
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The new hero title set in Manrope, so it did not match the FILTER HERO wordmark.
- **Do NOT:** Leave the hero title on the body face. Do not load Plus Jakarta upright-only and fake the italic.
- **Do:** Hero title is Plus Jakarta Sans ExtraBold Italic — the lockup face. Load `ital,wght` 700/800. Title is uppercase; the accent line uses `--hero` red like HERO in the mark.
- **Files:** `client/index.html`, `client/src/index.css`
- **Verify:** `/` — headline matches the italic extra-bold FILTER HERO wordmark, not Manrope.
- **Added:** 2026-08-30

---

### FH-063 — Hero filters and brands sat in separate corners
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Four pack shots orbited the corners and Trane/Carrier/Rheem lived in their own pill, so the hero looked like a collage.
- **Do NOT:** Park filters in four corners with the character isolated in the middle. Do not keep the brand logos in a separate copy-column chip on desktop.
- **Do:** One grounded lineup: character, four filters, and brand marks share the same cluster. Filters sit as a family at his side, not a pile and not a tray. Desktop hides the copy-column brand row.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — one group, not four corners plus a logo bar. Character full-figure. Each filter still its own clickable shot.
- **Added:** 2026-08-30

---

### FH-062 — Hero character crowded out the filter shots
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The character filled most of the art, so the four pack shots stayed small.
- **Do NOT:** Grow the character back to full-stage height. Do not cap showcase images at ~28vh.
- **Do:** Character slot ~82% tall / 34vw wide on desktop. Showcase packs use ~14–15.5vw (up to 14.5rem) and 36vh max image height.
- **Files:** `client/src/index.css`
- **Verify:** `/` desktop — full-figure character, clearly smaller than before; four filters larger and still in their own corners.
- **Added:** 2026-08-30

---

### FH-061 — Home hero felt like a static catalog row
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Header + copy | character | four products sat in a rigid three-column grid and looked plain.
- **Do NOT:** Put the four filters back into even catalog cells. Do not pile them on the character or lock the page into a two-column split.
- **Do:** One cinematic stage. Character is the scene. Products orbit at different sizes, tilts, and float cycles. Copy overlays the left light. Giant outlined HERO wordmark, moving mesh, rays, and orbs stay behind the art. Viewport stays locked. Character stays full-figure.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — no three-column grid, products floating around a full character, page still does not scroll.
- **Added:** 2026-08-30

---

### FH-060 — MERV 13 hero cutout must keep the original product
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Background removal ate the white cardboard frame and lattice, so the MERV 13 shot no longer matched the uploaded pack photo.
- **Do NOT:** Flood-fill near-white as background. Do not recolor, relight, or rebuild the box.
- **Do:** Start from the original studio shot. Make only the exterior studio white transparent. Keep every product pixel, including the white frame and diamond grid. `?v=fh060`.
- **Files:** `client/public/hero/showcase-merv13.png`, `client/src/components/Hero.tsx`
- **Verify:** `/` desktop — MERV 13 is the original Filter King box, white frame intact, no black lattice.
- **Added:** 2026-08-30

---

### FH-059 — Home is a single locked hero screen
- **Status:** wontfix
- **Area:** photos
- **Symptom:** Header + hero did not fill the viewport, so the page still scrolled into the trust bar and finder.
- **Do NOT:** Re-lock `/` to a hero-only screen. Reversed by FH-084 — shoppers need the rest of the site.
- **Do:** Hero still fills the first viewport under the header (`100dvh` minus `--site-header-h`). Content below stays in normal flow.
- **Files:** `client/src/pages/Home.tsx`, `client/src/components/Hero.tsx`, `client/src/components/SiteHeader.tsx`, `client/src/index.css`
- **Verify:** `/` — first screen is header + hero. Scroll starts at the trust bar.
- **Added:** 2026-08-30

---

### FH-058 — Hero product showcase uses clean pack shots
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Shoppers needed the four filter SKUs in the hero as a product showcase, not a pile or a tray.
- **Do NOT:** Use the banner cutouts (`merv-8.png`, `stack-3.png`, etc.) in the hero. Do not box the four shots in a glass panel or overlap them on the character.
- **Do:** Stage the isolated showcase shots — MERV 8, Carbon, MERV 11, MERV 13 — in their own cells around the CAPE BLOW character. Labels stay under each shot. Hero stays one viewport. `?v=fh058`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/showcase-*.png`
- **Verify:** `/` desktop — character full body in the center; four labeled filters around him, none overlapping. Click a filter → `/sizes/20x25x1`. Mobile — character only.
- **Added:** 2026-08-30

---

### FH-057 — Home hero was a tall scroll region
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The home hero grew past the first screen, so shoppers scrolled through the hero itself.
- **Do NOT:** Give `.hero-cast` a `min-height` taller than the remaining viewport. Do not let the hero stage scroll internally.
- **Do:** Hero fills `100dvh` minus `--site-header-h` (published by `SiteHeader`). Overflow hidden. Rest of the page starts below.
- **Files:** `client/src/components/SiteHeader.tsx`, `client/src/index.css`
- **Verify:** `/` — first screen is header + full hero. Character, headline, and CTAs visible without scrolling the hero. Scroll starts at the trust bar.
- **Added:** 2026-08-30

---

### FH-056 — Hero used a chopped crop instead of the solo character
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The home hero character was a crop from the banner composite. The left half of the body was missing. Shoppers pointed at CAPE BLOW as the standalone figure.
- **Do NOT:** Cut the character out of `TESTING-with-logos.png` for the hero. Do not clip him with `overflow` + `translateX(-50%)` or a tight `max-width`.
- **Do:** Hero art is the full CAPE BLOW figure with white knocked out (`/hero/character.png`). Fit the whole image in the art stage with `object-fit: contain`. `?v=fh056`.
- **Files:** `client/public/hero/character.png`, `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` — full body and cape visible. No vertical cut through the torso.
- **Added:** 2026-08-30

---

### FH-055 — Home hero is character only
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Filter cutouts around the character read as a pile or a boxed tray. Shoppers asked to drop the products and keep the mascot.
- **Do NOT:** Add MERV / carbon / pack shots back onto the home hero art stage.
- **Do:** Hero art is the isolated character only (`/hero/character.png`). Live copy and CTAs stay on the left. `?v=fh055`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` — character stands alone on the right. No filter PNGs in the hero.
- **Added:** 2026-08-30

---

### FH-054 — Hero filters were trapped in a glass tray
- **Status:** mitigated
- **Area:** photos
- **Symptom:** After FH-053 the four filters sat in a dark rounded container under the character. The stack still showed through. Shoppers could not see each product as its own image.
- **Do NOT:** Put hero product cutouts in a card, tray, glass panel, or overlapping pile. Do not cover the character with filters.
- **Do:** Keep each filter as its own image in the art stage — pack, carbon, MERV 11 on the left; MERV 8, MERV 13, 6-pack on the right. Character stays in the open center. No container. `?v=fh054`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — six separate filter shots around the character, none boxed together. Mobile — character only behind the copy.
- **Added:** 2026-08-30

---

### FH-053 — Hero art was a pile of overlapping cutouts
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The live hero stacked MERV 8 / 11 / 13 / carbon PNGs on top of the character. It read as a collage, not a composition.
- **Do NOT:** Absolutely position product cutouts over the character’s torso, cape, or face. Do not float filters at mixed scales around him.
- **Do:** Character stands alone in the art stage. The four products sit in one labeled lineup at the bottom of the art (`hero-lineup`). Hide the lineup on mobile. Assets stay in `client/public/hero/` with `?v=fh053`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`
- **Verify:** `/` desktop — character unobstructed, MERV 8 / Carbon / MERV 11 / MERV 13 in one row with labels. Mobile — character only behind the copy, no product pile.
- **Added:** 2026-08-30

---

### FH-052 — Home hero rebuilt as a live stage, not a painted banner
- **Status:** mitigated
- **Area:** photos
- **Symptom:** The homepage hero was a single painted composite (`hero-banner.webp`). Copy, CTA, logos, and products were locked in one image, so the layout could not change without a new render.
- **Do NOT:** Put the old full-bleed `TESTING-with-logos.png` / `hero-banner.webp` composite back as the desktop hero. Do not bake the headline, tagline, or Shop Now into the artwork.
- **Do:** Keep a live HTML hero (`Hero.tsx`) that uses the isolated pieces from that artwork — character, MERV 8 / 11 / 13 / carbon filters — plus live type, CTAs, and Trane / Carrier / Rheem marks. Assets live in `client/public/hero/` with `?v=fh052`.
- **Files:** `client/src/components/Hero.tsx`, `client/src/index.css`, `client/public/hero/`
- **Verify:** `/` — navy split stage, live H1, Find your filter size scrolls to `#finder`, Start your clock scrolls to `#clock`, brand marks go to `/brands/{slug}`. Resize to mobile — character remains, copy overlays the bottom.
- **Added:** 2026-08-30

---

### FH-051 — Leftover Filter King ladders were modeled, not live
- **Status:** mitigated
- **Area:** pricing
- **Symptom:** About 19,540 leftover Filter King size×MERV pages had only estimated ladders. Page-by-page Firecrawl scrape would have needed ~19k credits. Direct fetches hit Cloudflare 403.
- **Do NOT:** Re-scrape those leftover MERV URLs one credit each. Do not treat `/api/sales/prices` as the retail ladder (it is a sale overlay). Do not store `cost_dollars` from Filter King search JSON.
- **Do:** After one Firecrawl browser load, same-origin-fetch each leftover **size hub**. Hub HTML embeds MERV 8/11/13/carbon `prices[]` (qty 1/2/4/6/12 = indexes 0/1/3/5/6). Harvest into `.firecrawl/fk-direct-leftover.json`, then `build_prices_from_local.py`. Catalog leftover scrape list should stay empty until FK adds sizes.
- **Files:** `.firecrawl/harvest_leftover_browser.py`, `.firecrawl/fk-direct-leftover.json`, `.firecrawl/build_prices_from_local.py`, `shared/pricing/fk-live-prices.json`
- **Verify:** `python .firecrawl/_audit_remaining.py` — catalog missing scrape 0; leftover URL file empty. `24x24x2` MERV 11 uses the live `24x24x2n` ladder.
- **Added:** 2026-08-29

---

### FH-050 — Navy FAQ answers were too close to the background
- **Status:** mitigated
- **Area:** seo
- **Symptom:** Size-page FAQ answers and “Measure and confirm size / Get a change date” links used ice (`#8eb0d8`) at 80–85% on navy, so the letters blended into the band.
- **Do NOT:** Put `text-ice`, `text-ice/80`, or `text-ice/85` on FAQ body copy or action links when `tone="band"`. Do not hover navy FAQ help links to ice.
- **Do:** Band FAQ answers, links, subtitle, and help copy stay near-white (`text-white` / `text-white/90`). Action links stay white with an underline so they still read as links.
- **Files:** `client/src/components/FaqSection.tsx`, `client/src/index.css`, `client/src/pages/SizeDetail.tsx`
- **Verify:** `/sizes/20x25x1` FAQ — open Fit and Replacement; answer text and arrows read as white on navy.
- **Added:** 2026-08-26

---

### FH-049 — Official MERV 11 pack shot for every size and pack
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 11 used a stamped MERV 8 6-pack. Pack qty 1 / 2 / 4 / 6 / 12 all still showed that stack.
- **Do NOT:** Point MERV 11 hero, cart, or schema at `merv-11-thin-rectangle-6pack.png`. Do not let `scripts/label-pack-shots.py` overwrite `merv-11-packshot.png`. Do not make a different MERV 11 photo per pack qty.
- **Do:** `packShotSrc(11)` and the MERV 11 gallery hero are `/products/merv-11-packshot.png` for every size and every pack. Keep a copy in `client/public/products/source/`. URLs use `?v=fh049`.
- **Files:** `client/public/products/merv-11-packshot.png`, `shared/products.ts`, `scripts/label-pack-shots.py`, `scripts/verify-store.ts`
- **Verify:** `/sizes/20x25x1?merv=11` — hero is the red MERV 11 single-filter shot; switch qty 1 and 12 — same photo. Cart thumbnail matches. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-08-26

---

### FH-048 — Official MERV 13 pack shot for every size and pack
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 13 used a stamped MERV-8 6-pack stack. Pack qty 1 / 2 / 4 / 6 / 12 all still showed that stack.
- **Do NOT:** Point MERV 13 hero, cart, or schema at `merv-13-thin-rectangle-6pack.png`. Do not let `scripts/label-pack-shots.py` overwrite `merv-13-packshot.png`. Do not make a different MERV 13 photo per pack qty.
- **Do:** `packShotSrc(13)` and the MERV 13 gallery hero are `/products/merv-13-packshot.png` for every size and every pack. Keep a copy in `client/public/products/source/`. Pack-shot URLs share `?v=fh050`.
- **Files:** `client/public/products/merv-13-packshot.png`, `shared/products.ts`, `scripts/label-pack-shots.py`, `scripts/verify-store.ts`
- **Verify:** `/sizes/20x25x1?merv=13` — hero is the orange MERV 13 single-filter shot; switch qty 1 and 12 — same photo. Cart thumbnail matches. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-08-26

---

### FH-047 — Official MERV 8 pack shot for every size and pack
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 8 used a 6-pack stack photo. Pack qty 1 / 2 / 4 / 6 / 12 all still showed that stack.
- **Do NOT:** Point MERV 8 hero, cart, or schema at `merv-8-thin-rectangle-6pack.png`. Do not let `scripts/label-pack-shots.py` overwrite `merv-8-packshot.png`. Do not make a different MERV 8 photo per pack qty.
- **Do:** `packShotSrc(8)` and the MERV 8 gallery hero are `/products/merv-8-packshot.png` for every size and every pack. Keep a copy in `client/public/products/source/`. URLs use `?v=fh047`.
- **Files:** `client/public/products/merv-8-packshot.png`, `shared/products.ts`, `scripts/label-pack-shots.py`, `scripts/verify-store.ts`
- **Verify:** `/sizes/20x25x1` MERV 8 — hero is the single-filter shot; switch qty 1 and 12 — same photo. Cart thumbnail matches. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-08-26

---

### FH-046 — Every MERV 8 size used the raw Filter King 6-pack
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Every MERV 8 size page showed the same source 6-pack with MERV 8 printed on every stack edge (and the standing-filter side). 11 / 13 / carbon had side print covered; MERV 8 did not.
- **Do NOT:** Point the shop at `client/public/products/source/merv-8-thin-rectangle-6pack.png`. Do not overwrite those source files. Do not stamp a vertical MERV badge on the stack.
- **Do:** Shop MERV 8 6-pack / 3/4 are generated: front Filter King MERV 8 label stays, stack-edge MERV 8 is cardboard. Rebuild with `python scripts/label-pack-shots.py`. Pack-shot URLs use `?v=fh046` so stale MERV 8 files are not cached. We still have only one MERV 8 photo — sizes share it until real photography lands.
- **Files:** `scripts/label-pack-shots.py`, `client/public/products/source/`, `client/public/products/merv-8-thin-rectangle-*.png`, `shared/products.ts`
- **Verify:** `/sizes/20x25x1` MERV 8 — front still says MERV 8, stack edges do not. Source folder unchanged. `python scripts/label-pack-shots.py`; `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-08-26

---

### FH-045 — Pack shots had a vertical MERV plate on the stack
- **Status:** mitigated
- **Area:** photos
- **Symptom:** MERV 11 / 13 / carbon 6-packs and 3/4 views showed a gray strip plus a colored “MERV 11 ADVANCED” / “MERV 13 ULTIMATE” / “MERV 8 CARBON” badge on the filter stack edge.
- **Do NOT:** Stamp `vertical_plate` (or any rating badge) on pack-shot sides. Do not leave the original printed MERV 8 on 11 / 13 / carbon sides either.
- **Do:** Front face can keep a MERV plate so the box matches the chosen rating. Side print is covered with cardboard in `scripts/label-pack-shots.py` — never a vertical MERV badge. Rebuild with `python scripts/label-pack-shots.py`.
- **Files:** `scripts/label-pack-shots.py`, `client/public/products/merv-{11,13,carbon}-thin-rectangle-*.png`, `docs/ISSUES-AND-FIXES.md`
- **Verify:** `/sizes/30x30x1` pack and 3/4 thumbs — stack edges have no colored MERV badge. MERV 8 original 6-pack is unchanged. `python scripts/label-pack-shots.py` (asserts no side badge).
- **Added:** 2026-08-26

---

### FH-044 — Pack shot said MERV 8 on every size page
- **Status:** mitigated
- **Area:** photos
- **Symptom:** Size pages and the cart used one Filter King MERV 8 6-pack photo. Choosing MERV 11 or 13 still showed a MERV 8 box (e.g. `/sizes/30x30x1`).
- **Do NOT:** Point every rating at `/products/merv-8-thin-rectangle-6pack.png`. Do not delete the MERV 8 source photos.
- **Do:** Hero, thumbs, cart, and product schema use `packShotSrc` / `productGalleryFor` for that MERV. Rebuild stamped 11 / 13 / carbon shots with `python scripts/label-pack-shots.py`. Keep MERV 8 source photos; stamped plates stay until real 11 / 13 / carbon photography lands.
- **Files:** `shared/products.ts`, `scripts/label-pack-shots.py`, `client/public/products/merv-*-thin-rectangle-*.png`, `client/src/pages/SizeDetail.tsx`, `client/src/components/CartDrawer.tsx`, `shared/seo.ts`, `scripts/verify-store.ts`
- **Verify:** `/sizes/30x30x1` — MERV 11 pack says MERV 11; switch to MERV 13; cart thumbnail matches. `pnpm exec tsx scripts/verify-store.ts`.
- **Added:** 2026-08-26

---

### FH-043 — Shop listed SKUs with no wholesale cost
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** The storefront sold every Filter King size × MERV (including carbon and sizes like 20x25x4) even though only Paul Sellaro’s 2025 dealer sheet can be supplied.
- **Do NOT:** Delete `shared/filter-catalog.json`, carbon MERV types, pricing ladders, or featured-size archives. Do not flip `SELLABLE_ONLY` back to false until new wholesale costs are on the sheet.
- **Do:** Live shop = `shared/sellable-skus.json` only (299 size × MERV lines / 182 sizes). Unsold sizes keep routing to the quote form. Checkout and cart refuse `inStock: false`. Rebuild the allowlist with `scripts/build-sellable-skus.ts` when the sheet grows.
- **Files:** `shared/products.ts`, `shared/sellable-skus.json`, `scripts/build-sellable-skus.ts`, `scripts/verify-store.ts`, size/finder/SEO/cart surfaces
- **Verify:** `pnpm exec tsx scripts/verify-store.ts`; shop `/sizes/20x25x1` (MERV 8/11/13 only); `/sizes/20x25x4` and `/sizes/14x25x1?merv=11` must not sell; `/sizes` lists 182 sizes.
- **Added:** 2026-08-26

---

### FH-042 — tsconfig `baseUrl` flagged as an error
- **Status:** mitigated
- **Area:** other
- **Symptom:** Cursor/TypeScript 6 marked `tsconfig.json` as an error: `baseUrl` is deprecated and stops working in TypeScript 7.
- **Do NOT:** Put `baseUrl` back, or silence it with `ignoreDeprecations` on TypeScript 5.6 (that option is unknown there).
- **Do:** Path aliases stand on `paths` only (`@/*` → `./client/src/*`, `@shared/*` → `./shared/*`). `pnpm check` includes `scripts/**/*.ts`.
- **Files:** `tsconfig.json`, `tsconfig.node.json`
- **Verify:** `pnpm check` and open `tsconfig.json` — no deprecation error.
- **Added:** 2026-08-24

---

### FH-041 — Carbon Capture dots read as black on white
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** MERV 8 Carbon used the navy-card silver accent (`#d8d8d8`), so Capture dots looked gray on the white size-page note.
- **Do NOT:** Paint carbon dots with the light silver accent on a white panel.
- **Do:** Carbon dots use the black badge (`#111111`). Other ratings keep `MERV_GUIDE.accent`.
- **Files:** `client/src/pages/SizeDetail.tsx`
- **Verify:** Choose MERV 8 Carbon — filled and outline dots are black.
- **Added:** 2026-08-21

---

### FH-040 — Size-page MERV note uses catch-page Capture
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** Choose MERV used gray capsule bars and a one-line blurb. It did not match Capture (growing dots + efficiency) from the catch page.
- **Do NOT:** Use vertical pips. Do not paint this strip navy.
- **Do:** White/light container. Capture label, five growing dots from `MERV_GUIDE.strength` / `accent`, `efficiency`, then that rating’s best-for, note, and catches.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/index.css`
- **Verify:** Switch MERV 8 / Carbon / 11 / 13 on a size page — dots, µm line, and copy all change.
- **Added:** 2026-08-21

---

### FH-039 — MERV chips span their column
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** MERV badges were only as wide as the label, so they sat short of the heading below.
- **Do NOT:** Size chips to the text (`inline-flex`, `max-w-[11rem]`).
- **Do:** Every MERV chip is `width: 100%` of its tile or column.
- **Files:** `client/src/index.css`, `client/src/components/MervCarousel.tsx`, `client/src/pages/SizeDetail.tsx`
- **Verify:** Size-page Choose MERV and catch-section cards — chips reach the right edge of the column.
- **Added:** 2026-08-21

---

### FH-038 — Size-page MERV picker matches catch-section columns
- **Status:** mitigated
- **Area:** catalog
- **Symptom:** Choose MERV used two-tone icon cards. Shopper wanted the catch-section column language on the white buy panel.
- **Do NOT:** Bring back the colored-bar + icon + short-label cards on the size page.
- **Do:** White panel stays. Four columns: color badge, bold MERV name, muted “best for” line, faint dividers. Selected column washes with that rating’s color.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/index.css`
- **Verify:** Any `/sizes/{slug}` page — Choose MERV looks like the catch-section columns on white.
- **Added:** 2026-08-21

---

### FH-037 — FAQ heading collage
- **Status:** mitigated
- **Area:** photos
- **Symptom:** FAQ opened with a wall-install + new/1-month/3-month + clean-vs-dirty mosaic.
- **Do NOT:** Put that collage back beside the FAQ heading.
- **Do:** FAQ is heading and answers only. Install and dirty-filter photos stay on how-to / size pages.
- **Files:** `client/src/components/FaqSection.tsx`
- **Verify:** Home FAQ has no photo mosaic next to the title.
- **Added:** 2026-08-21

---

### FH-031 — Filter Clock days must be 30 / 60 / 90 / 180 only
- **Status:** open
- **Area:** clock
- **Symptom:** Clock and calendar can show other intervals (120 / 270 / 330 bases, 7- or 15-day rounding).
- **Do NOT:** Keep those bases or that rounding.
- **Do:** Snap every day count, label, and calendar date to 30, 60, 90, or 180.
- **Files:** `client/src/lib/filter-cadence.ts`, `client/src/components/ClockDeck.tsx`, `scripts/verify-filter-clock.ts`
- **Verify:** Every MERV × thickness × household combo uses only those four days; then assert it in `verify-filter-clock.ts`.
- **Added:** 2026-08-20

### FH-032 — How to Measure chip belongs with Shop / Brands / Clock / Contact
- **Status:** mitigated
- **Area:** header
- **Symptom:** Measure help is not in the primary nav. Do not put it inside Enter Your Filter Size.
- **Do NOT:** Nest How to Measure in the header finder.
- **Do:** A How to Measure control in that nav row; it jumps to the tape-measure diagram.
- **Files:** `client/src/components/SiteHeader.tsx`
- **Verify:** Nav row has Shop, Brands, FILTER CLOCK, How to Measure, Contact. Chip is not in the finder card.
- **Added:** 2026-08-20

### FH-033 — Clock nav still says Clock, not FILTER CLOCK
- **Status:** mitigated
- **Area:** header
- **Symptom:** Header link is `Clock`.
- **Do NOT:** Label it Filter Hero or leave it as Clock.
- **Do:** Label **FILTER CLOCK**; still hashes to `#clock`.
- **Files:** `client/src/components/SiteHeader.tsx`
- **Verify:** Header reads FILTER CLOCK and opens the Filter Clock section.
- **Added:** 2026-08-20

### FH-034 — Custom CTA should read Need a custom size
- **Status:** fixed
- **Superseded by:** FH-255 (short Custom label at laptop widths)
- **Area:** header
- **Symptom:** Button says `Custom size`.
- **Do NOT:** Use Custom size or a second finder.
- **Do:** One button, **Need a custom size**, to `/custom-air-filters#custom-quote`.
- **Files:** `client/src/components/SiteHeader.tsx`
- **Verify:** Wording plus it opens the quote form.
- **Added:** 2026-08-20

### FH-035 — Tape-measure diagram missing from product pages
- **Status:** mitigated
- **Area:** measure
- **Symptom:** Size/product pages do not all show the filter + tape measure.
- **Do NOT:** Leave it homepage-only, or clip Width / Length / Depth labels.
- **Do:** Same How to Measure guide (tape diagram + Width / Length / Depth steps) on every `/sizes/{slug}` page, including the off-catalog quote empty state.
- **Files:** `client/src/pages/SizeDetail.tsx`, `client/src/components/HowToMeasureGuide.tsx`, `client/src/components/MeasureFilterDiagram.tsx`
- **Verify:** `/sizes/20x25x1` and `/sizes/99x99x9` show “How to measure your air filter”.
- **Added:** 2026-08-20

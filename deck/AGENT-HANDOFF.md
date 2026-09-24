# Agent handoff — Filter Hero investor materials

**Date:** 2026-09-24  
**Primary repo (shop):** `C:\Users\lazar\Downloads\Github\Filter-Hero-OFFICIAL`  
**Investor deck repo (Lovable):** `C:\Users\lazar\Downloads\Github\filter-hero-pro`  
**Remote deck repo:** https://github.com/Tilo-Syntiv/filter-hero-pro.git  

This handoff is for a **new agent**. Do not invent facts. Prefer numbers already locked in the artifacts below.

---

## What the user wanted (arc of this conversation)

1. Professional **investor pitch** for a **$60,000 zero-interest friend loan** (principal only).
2. Include Freezing Point AC ownership, **8,497** house-list contacts, B2B building-manager network, solo operator (marketing/AI/automation/site), ~**$300/mo** AI overhead, **53%** contribution margin, organic marketing, dropship (no stock/warehouse/employees).
3. Format evolved: Gamma-style HTML deck → carousel → Gamma paste prompt → Manus technical brief → **switch to Lovable `filter-hero-pro` as the deck to improve**.
4. Faceless explainer video was discussed: recommended **~3 minutes**; not fully produced. Higgsfield Seedance clips max **15s** each.
5. Explicit: Manus brief is **not** a creative prompt — raw technical facts only. Later: improve Lovable deck using **facts already in that repo**, not rewrite from OFFICIAL HTML.

---

## Locked business facts (use these)

| Item | Value |
|---|---|
| Ask | $60,000 · zero interest · principal only |
| Live site | https://filterhero.net |
| Related company | Freezing Point AC (do **not** disclose AC revenue) |
| House list | **8,497** cleaned (raw export 10,459). 100% email + street; 7,380 unique emails; 8,472 FL; 0 DNS |
| Contribution margin | **53%** (gross avg ~58.5% on 199 1″ SKUs) |
| Overhead | ~$300/mo AI tooling · $3,600/yr |
| Model | Dropship; no inventory/warehouse/employees/lease |
| Delivery copy | **2–3 day** only. **No free shipping. No 30-day guarantee.** |
| Sellable SKUs | 293 · sizes 153 · archive 9,958 · brands 38 · OEM 166 |
| Flagship 20×25×1 | M8 $9.99/$4.82 51.8% · M11 $13.49/$6.05 55.2% · M13 $22.99/$6.20 73.0% |
| Retail anchors | M8 $9.99 · M11 $13.49 · M13 $22.99 · Carbon $16.70 |
| Pricing rule | Match cheaper of Filtrete & Filter King; then FilterBuy if lower |
| AOV (model) | $68 |
| Tranches | 3 × $20k; worst-case draw **$20,000** if milestones miss |
| Repayment | Greater of $750 or 50% net profit |
| Scenarios (12 mo) | Worst $46,520 / net $21,056 / drawn $20k / repaid mo 24 · Base $186,700 / $95,351 / $60k / mo 19 · Best $512,300 / $267,919 / $60k / mo 9 |
| Use of funds | Mail $18k · WC $15k · Organic $9k · B2B kits $7.5k · Setup $5.5k · Reserve $5k |
| Honest risk | ~$27k outreach not liquidatable; contained by tranches / $300 OH / AC floor |
| Brand | Navy `#203868` · Burgundy `#7F2328` · Ice `#8EB0D8` |

**Do not** invent SKUs, freights, subscriptions, PM portal, CRM email, or Freezing Point financials.

---

## Artifacts by location

### A) `Filter-Hero-OFFICIAL/deck/` (earlier work — still useful)

| File | Role |
|---|---|
| `filter-hero-investor-deck.html` | 10-slide self-contained carousel (scroll-snap → later fixed carousel) |
| `Filter-Hero-Investor-Deck.pdf` | 10-page 16:9 PDF |
| `INVESTOR-SUMMARY.md` | Long-form assumptions + derivations |
| `GAMMA-PROMPT.md` | 10-card Gamma paste-in (simple/professional, not brand-heavy) |
| `MANUS-TECHNICAL-BRIEF.md` | Raw technical brief for Manus (not a creative prompt) |
| `AGENT-HANDOFF.md` | This file (if copied here) |

### B) `filter-hero-pro` — **current preferred deck to continue**

- Stack: Lovable + TanStack Start + Vite 8 + React 19 + Tailwind 4
- Slides: `src/components/slides/slides.tsx` — **10 slides** (condensed from Lovable’s 15)
- Shell: `src/routes/index.tsx` — slide/grid/print/present; keys ←→ Space G F5
- Layout helpers: `SlideLayout.tsx`, `ScaledSlide.tsx` (1920×1080 scale-to-fit)
- Images: loaded from live `https://filterhero.net/...` (logo, packs, clogged filter)
- README rewritten as short project readme
- Last verification: `npm i`, `npm run build` OK; dev tried on `http://127.0.0.1:5174/`
- **Not pushed** to GitHub unless user asks

**10-slide map in filter-hero-pro:**
1. Cover — “store live / buyers known / fund demand”
2. Thesis — already built / buyers known / downside capped
3. Problem — $9.99 vs repair ladder
4. Model + catalog — dropship + 293 SKUs
5. Pricing + unit economics — floor pricing + margins
6. House list + B2B
7. Live in production
8. Funds + tranche structure
9. Scenarios
10. Risk + ask

User instruction when improving pro deck: **use facts already in that repo**, don’t redo with alternate OFFICIAL-deck framing.

---

## Explicit user preferences

- Friend loan tone: professional, recovery-focused, not VC hype
- Prefer condensed, carousel/click-through over long scrolling sites
- Wanted simple/professional/catchy for Gamma (less Filter Hero brand chrome)
- “Matched cheapest competitor + I deliver 2–3 days” is important; freight cost **unset** — don’t invent free shipping
- Manus ≠ rewrite as prompt; pass technical source data
- filter-hero-pro = completely separate Lovable track from Manus/OFFICIAL HTML

---

## Open / unfinished

- [ ] Commit/push `filter-hero-pro` changes (not done)
- [ ] Faceless explainer video (~3 min script + VO + edit) — not built
- [ ] Sync OFFICIAL `deck/` vs `filter-hero-pro` if user wants one source of truth
- [ ] Preview servers may be stale; restart with `npm run dev` in `filter-hero-pro`

---

## Suggested next actions for the receiving agent

1. Open `filter-hero-pro`, run `npm run dev`, visually QA all 10 slides.
2. Ask user whether to **commit/push** to `Tilo-Syntiv/filter-hero-pro`.
3. If video: write timed 3-min VO script from locked facts; do not invent.
4. Do not mix Manus creative work with filter-hero-pro unless user says so.
5. Shop code lives in Filter-Hero-OFFICIAL — do not deploy Hostinger; Railway is the shop host; follow `.cursor/rules` there if touching the store.

---

## Workspace paths

```
C:\Users\lazar\Downloads\Github\Filter-Hero-OFFICIAL
C:\Users\lazar\Downloads\Github\filter-hero-pro
E:\FILTER HEROE\IMPORTANT PAPERS          (list CSVs, build docs)
E:\FILTER HEROE\PICTURES IN PROJECT       (source imagery)
```

House list CSV: `E:\FILTER HEROE\IMPORTANT PAPERS\FILTER HERO CONTACT LIST.csv`

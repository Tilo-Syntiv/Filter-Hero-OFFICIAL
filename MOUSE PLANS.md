# MOUSE PLANS

Flying Filter Hero companion — architecture plan.

**Status:** Plan only. No code yet.  
**Date:** August 19, 2026  
**Sources:** `Hero.tsx`, `App.tsx`, `Home.tsx`, `brand/filter-hero-brand-sheet.html`, `WEBSITE TRANSPARENT.jpeg`

---

## Verdict

This is feasible on the current React + Vite store. Build it as a **docked companion that flies to named targets**, not a free-roaming overlay.

| Decision | Choice |
|---|---|
| Possible? | Yes |
| Motion model | Directed docks, not chase-the-mouse |
| Engine to start | Framer Motion (already in `package.json`) |
| Mobile | Off below 1024px (desktop first) |

---

## What we should build

A site-wide `MascotGuide` overlay, mounted once in `App.tsx`, that parks in a safe dock and only flies when there is a reason. He should feel like a guide for Width × Length × Depth — not Clippy, not a chat bot, and never a second hero banner competing with the painted one.

| Approach | Verdict | Why |
|---|---|---|
| Directed companion | **Build this** | Idle hover in a corner. Fly to the size finder, MERV cards, or a CTA when the user needs a nudge. Click for one short line of help. Dismissible. Hidden when a drawer or form has focus. |
| Cursor-follow flight | Later, if at all | Subtle look-at / lean toward the pointer is fine. Continuous chase-the-mouse flight fights the header, finder, and Shop Now CTA. |
| Always-on AI mascot | Do not | Voice, LLM chat, or unsolicited tips every few seconds fight the brand voice (precise, no hype) and add cost, latency, and accessibility debt. Scripted lines only. |

---

## Brand-sheet conflict

The brand kit currently says not to redraw, rotate, or drop-shadow the mascot. The painted hero already uses the arms-crossed power pose.

True flight needs an approved pose sheet (idle, fly, point, celebrate) and a written exception:

- **Lockup emblem** stays frozen.
- **Living companion** may use the approved poses.

Do not rotate the idle pose 90° and call it flying.

---

## Why not free-fly everywhere

The character already occupies the homepage hero as painted artwork. Header is sticky at `z-50`. Cart is a drawer at `z-50`. Filter Finder, Shop Now, and checkout are the money path.

A full-viewport flyer either covers those controls or forces a giant hole in the hit-test layer. Directed docks solve that: he moves, but only between reserved parking spots that never overlap CTAs.

**Hero banner rule:** On the homepage, do not overlay the painted character. Start the companion only after the user scrolls past `.hero-stage` (or skip the home hero entirely and first appear at `#finder`). Two Filter Heroes on screen at once looks like a glitch.

---

## Engine comparison

| Approach | Look | Interaction | Cost | Verdict |
|---|---|---|---|---|
| Framer Motion + WebP sprites | Exact brand art, bob + fly paths | Click, hover, dock, speech bubble | Low — already in `package.json` | **Phase 1–2** |
| Rive state machine | Cape mesh can actually billow | Best: hover, drag, pose blend | Medium — new art + runtime | Phase 3 upgrade |
| Lottie / After Effects | Canned loops look polished | Weak — hard to interrupt mid-flight | Medium | Skip unless we only need loops |
| Alpha WebM video | Highest fidelity flight | Almost none — cannot branch poses | Heavy on LCP / mobile data | No |
| Three.js 3D model | Uncanny vs painted mascot | High, but brand-breaking | High | No |

---

## Component architecture

Keep the painted `Hero.tsx` banner as-is. The companion is a separate layer so we never animate the marketing art. Mount below `CartProvider` so he can react to cart events without every page wiring him up.

| Piece | Lives in | Job |
|---|---|---|
| `MascotGuide` | `App.tsx` portal | Renders the sprite, speech, dismiss control. `pointer-events` only on the character + bubble. |
| `mascotMachine` | `client/src/lib` | State: `hidden` \| `docked` \| `flying` \| `pointing` \| `celebrating` \| `dismissed`. One unsolicited tip per session. |
| `docks.ts` | per-route config | Named parking spots: finder, merv, clock, contact, size-cta, 404, success. Each has x/y, facing, max size. |
| `useMascotSafeZone` | hook | Hides or shrinks when header menus, cart drawer, dialogs, or focused inputs are open. |

---

## Scene map — what he does where

| Place | Pose | Line (max one) | Trigger |
|---|---|---|---|
| Home hero | Absent | — | Already in the painting |
| Filter Finder | Point | Width, Length, then Depth. | Section in view, or click the mascot |
| Popular sizes / brand chips | Docked hover | Silent, or “Most homes start here.” | Idle after finder is complete |
| MERV carousel | Point | Pets and pollen? MERV 13. | User clicks the mascot here |
| Filter Clock band | Docked | Dirty filters cost runtime. | Click only |
| Size detail / add to cart | Point at CTA | Silent | Product in view |
| Cart open | Hidden | — | Drawer `z-50` — get out of the way |
| Checkout success | Celebrate | You are covered. | Route enter, once |
| 404 | Search / idle | Lost? Let’s find your size. | Route enter |
| Contact / quote form | Rest, smaller | Silent unless clicked | Input focus hides him |

---

## Interaction model

**User can**

- Click the character for one contextual line plus a single action (Find size, Shop MERV, Open guide).
- Hover for a cape bob.
- Dismiss with an X that persists in `localStorage`.
- Reduced-motion users get a static dock with no flight.

**User never has to**

- Chase him.
- Wait for him to finish a loop.
- Hear voice.
- See more than one unsolicited bubble per session.

He never captures scroll, never sits on Shop Now, never blocks the header finder.

---

## Motion rules

| Rule | Why |
|---|---|
| Fly only between docks, 400–700ms, ease-out | Readable, not chaotic. Matches existing 0.55s hero fade. |
| Idle is a 12–18s bob, same family as `.hero-orb` | The site already has this language in `index.css`. |
| Flip horizontally to face the target; do not rotate in 3D | Cape mesh stays readable. Brand forbids arbitrary rotation. |
| Hitbox ~120px desktop, ~72px if we ever show on mobile | Big enough to click, small enough to miss CTAs. |
| Hide flight under `prefers-reduced-motion`; keep static sprite | Already a reduced-motion block in `index.css`. |

---

## Assets required

`WEBSITE TRANSPARENT.jpeg` is a full composition (hero, boxes, wordmark, Shop Now) on a checkerboard — not an isolated sprite. We need a true transparent WebP of the character only, plus three more poses if we want him to actually fly instead of sliding the power-pose around.

| File | Pose | Needed for |
|---|---|---|
| `mascot-idle.webp` | Arms crossed, cape to the right | Phase 1 dock. Can be cut from existing art. |
| `mascot-fly.webp` | Horizontal flight, cape trailing | Phase 2. New illustration — do not rotate idle 90°. |
| `mascot-point.webp` | One arm toward the target | Finder, MERV, size CTA. |
| `mascot-celebrate.webp` | Fist / filter held up | Add-to-cart + checkout success. |
| Optional Rive `.riv` | Same four states as a machine | Only if cape physics is worth the art pass. |

---

## Risks if we skip the guardrails

| Risk | Mitigation |
|---|---|
| Covers Shop Now / finder / cart — conversion drop | Reserved docks, collision list, hide on drawer + input focus. |
| Two heroes on the homepage | Appear only after `.hero-stage` leaves the viewport. |
| Mobile thumb-zone + battery | Default off under `lg` breakpoint, or a static corner badge. |
| SEO / LCP | Lazy-mount after first paint. Sprite is extra, not the hero image. |

---

## Build sequence

1. **Approve pose sheet** + brand-sheet exception (living companion vs frozen emblem).
2. **Export `mascot-idle.webp`** cutout (character only, no boxes or type).
3. **Phase 1** — Docked companion after hero: bob, click bubble, dismiss, reduced-motion, hide on cart.
4. **Phase 2** — Fly between docks (finder, MERV, size CTA, 404, success) with point/celebrate sprites.
5. **Phase 3 (optional)** — Rive cape, add-to-cart celebration, one scripted tip per session.

---

## Decisions before we write code

Lock these four before Phase 1:

| Decision | Options | Recommendation |
|---|---|---|
| Personality | Silent hover vs. one-line helper | Silent until clicked, plus at most one auto-tip per session at the finder. |
| Mobile | Off, static badge, or reduced dock | Off below 1024px — the mobile hero already is a character crop. |
| Art | Idle-only (slide the power pose) vs. four approved poses | Idle for a prototype, then fly/point before launch so it does not look like a sticker being dragged. |
| Scope of first build | Homepage finder only vs. every route | Home + 404 + checkout success. Size/brand pages after that. |

**Next:** Lock the four decisions, then Phase 1.

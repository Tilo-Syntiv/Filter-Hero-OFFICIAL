/**
 * Hero flight engine
 * -----------------------------------------------------------------------------
 * Choreographs the Filter Hero character around the hero stage. Target elements
 * (filter packs, CTA, brand row, headline column) are measured from the live DOM
 * on every layout change, so he genuinely pulls up beside each pack and presents
 * it at any viewport size.
 *
 * Framework-free on purpose: HeroFlight.tsx is a thin mount/unmount wrapper.
 */

const BASE = "/hero/flight";

/* ---------------------------------------------------------------- poses --- */

export type Pose = {
  src: string;
  /** small-screen replacement for a sprite sheet */
  still?: string;
  /** one frame's natural size */
  fw: number;
  fh: number;
  /** anchor inside the frame (0..1) — this point rides the flight path */
  ax: number;
  ay: number;
  cols?: number;
  rows?: number;
  frames?: number;
  fps?: number;
  /** direction the artwork points by default */
  faces: 1 | -1;
};

const POSES = {
  cruise: {
    src: `${BASE}/cruise-sheet.webp`, still: `${BASE}/cruise.webp`,
    fw: 613, fh: 489, ax: 0.7466, ay: 0.31,
    cols: 4, rows: 4, frames: 16, fps: 15, faces: 1,
  },
  present: {
    src: `${BASE}/present-sheet.webp`, still: `${BASE}/present.webp`,
    fw: 734, fh: 704, ax: 0.3774, ay: 0.2618,
    cols: 4, rows: 4, frames: 16, fps: 12, faces: -1,
  },
  bank:   { src: `${BASE}/bank.webp`,   fw: 450, fh: 457, ax: 0.7407, ay: 0.3471, faces: 1 },
  punch:  { src: `${BASE}/punch.webp`,  fw: 785, fh: 430, ax: 0.6625, ay: 0.3096, faces: 1 },
  thumb:  { src: `${BASE}/thumb.webp`,  fw: 690, fh: 727, ax: 0.3357, ay: 0.2618, faces: -1 },
  pullup: { src: `${BASE}/pullup.webp`, fw: 603, fh: 560, ax: 0.4994, ay: 0.46,   faces: 1 },
  idle:   { src: `${BASE}/idle.webp`,   fw: 596, fh: 730, ax: 0.2054, ay: 0.237,  faces: -1 },
  soar:   { src: `${BASE}/soar.webp`,   fw: 460, fh: 500, ax: 0.2299, ay: 0.3254, faces: -1 },
} as const satisfies Record<string, Pose>;

export type PoseKey = keyof typeof POSES;

/** every sprite shares one eye-size unit, so a single scalar sizes them all */
const REF_H = 700;

/* ------------------------------------------------------------- geometry --- */

type Rect = { x: number; y: number; w: number; h: number; cx: number; cy: number };
type Pt = { x: number; y: number };
type Geo = { W: number; H: number; u: number; t: Record<string, Rect> };

const rectOf = (x: number, y: number, w: number, h: number): Rect =>
  ({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });

const TARGETS: Record<string, string> = {
  merv8: ".hero-product-merv8",
  carbon: ".hero-product-carbon",
  merv11: ".hero-product-merv11",
  merv13: ".hero-product-merv13",
  cta: ".hero-shop-btn",
  brands: ".hero-brands-row",
  claim: ".hero-build-tag-visual",
  copy: ".hero-copy",
};

/** proportional stand-ins for anything the layout hides (mobile, etc.) */
const FALLBACK: Record<string, [number, number, number, number]> = {
  merv8:  [0.58, 0.66, 0.08, 0.16],
  carbon: [0.68, 0.66, 0.08, 0.16],
  merv11: [0.78, 0.66, 0.08, 0.16],
  merv13: [0.88, 0.66, 0.08, 0.16],
  cta:    [0.08, 0.74, 0.20, 0.07],
  brands: [0.62, 0.87, 0.32, 0.07],
  claim:  [0.62, 0.14, 0.32, 0.09],
  copy:   [0.0, 0.0, 0.54, 1.0],
};

/* ------------------------------------------------------------ path math --- */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
};

function spline(pts: Pt[], t: number): Pt {
  if (pts.length === 1) return pts[0];
  if (pts.length === 2) {
    return { x: lerp(pts[0].x, pts[1].x, t), y: lerp(pts[0].y, pts[1].y, t) };
  }
  const segs = pts.length - 1;
  const u = clamp(t, 0, 0.999999) * segs;
  const i = Math.floor(u);
  const f = u - i;
  const p = (k: number) => pts[clamp(k, 0, pts.length - 1)];
  const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
  const f2 = f * f, f3 = f2 * f;
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f2 + (-a + 3 * b - 3 * c + d) * f3);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}

/* ---------------------------------------------------------- choreography --- */

type Beat = {
  name: string;
  pose: PoseKey;
  dur: number;
  path: (g: Geo) => Pt[];
  ease?: (t: number) => number;
  /** 0 = hold level, 1 = bank fully into the heading */
  align?: number;
  /** extra full rotations across the beat */
  spin?: number;
  /** force the direction he faces */
  face?: 1 | -1;
  scale?: [number, number] | number;
  /** speed-trail strength, 0..1 */
  trail?: number;
  /** hover bob amplitude, px */
  bob?: number;
  /** brightness floor, so interaction beats stay readable over the copy */
  minDim?: number;
};

/** hover clear of a target's left edge, by half the target plus a third of him */
const beside = (g: Geo, r: Rect, k = 0): Pt => ({
  x: r.cx - (r.w * 0.5 + 0.34 * REF_H * g.u),
  y: r.cy - r.h * 0.34 - k * 10,
});

const packBeat = (key: string, dur: number): Beat => ({
  name: `present-${key}`,
  pose: "present",
  dur,
  ease: easeInOut,
  align: 0,
  face: 1,
  trail: 0,
  bob: 7,
  scale: 0.68,
  path: (g) => [beside(g, g.t[key], 0), beside(g, g.t[key], 1)],
});

const BEATS: Beat[] = [
    // --- open: arrive and show off ---
    { name: "enter", pose: "punch", dur: 2.2, ease: easeOut, align: .8, trail: 1, scale: [.42,.80],
      path: g => [{x:-.22*g.W,y:.84*g.H},{x:.12*g.W,y:.72*g.H},{x:.44*g.W,y:.52*g.H},{x:.66*g.W,y:.40*g.H}] },
    { name: "loop", pose: "bank", dur: 3.0, ease: easeInOut, align: 1, spin: 1, trail: .8, scale: .82,
      path: g => { const cx=.68*g.W, cy=.34*g.H, rx=.15*g.W, ry=.20*g.H;
        return Array.from({length:13},(_,i)=>{const a=-Math.PI/2+(i/12)*Math.PI*2;
          return {x:cx+Math.cos(a)*rx, y:cy+Math.sin(a)*ry};}); } },
    { name: "cross-RL", pose: "cruise", dur: 2.6, ease: easeInOut, align: .55, trail: 1, scale: [.82,.72],
      path: g => [{x:1.12*g.W,y:.26*g.H},{x:.74*g.W,y:.14*g.H},{x:.38*g.W,y:.11*g.H},{x:.04*g.W,y:.16*g.H}] },
    { name: "u-turn", pose: "bank", dur: 2.2, ease: easeInOut, align: 1, spin: .5, trail: .7, scale: [.72,.78],
      path: g => [{x:.04*g.W,y:.16*g.H},{x:.14*g.W,y:.46*g.H},{x:.17*g.W,y:.74*g.H},{x:.05*g.W,y:.87*g.H}] },
    { name: "barrel-roll", pose: "bank", dur: 2.6, ease: easeInOut, align: 0, spin: 2, trail: 1, scale: [.78,.74],
      path: g => [{x:.05*g.W,y:.87*g.H},{x:.34*g.W,y:.72*g.H},{x:.64*g.W,y:.52*g.H},{x:.86*g.W,y:.34*g.H}] },

    // --- the sales beat: present each filter in turn ---
    { name: "to-merv8", pose: "cruise", dur: 1.3, ease: easeInOut, align: .5, trail: .35, scale: [.74,.68],
      path: g => [{x:.86*g.W,y:.34*g.H},{x:.62*g.W,y:.40*g.H}, beside(g,g.t.merv8,0)] },
    packBeat("merv8", 2.0),
    { name: "to-carbon", pose: "cruise", dur: .8, ease: easeInOut, align: .45, trail: .3, scale: .68,
      path: g => [beside(g,g.t.merv8,1),{x:(g.t.merv8.cx+g.t.carbon.cx)/2,y:g.t.carbon.cy-g.t.carbon.h}, beside(g,g.t.carbon,0)] },
    packBeat("carbon", 1.5),
    { name: "to-merv11", pose: "cruise", dur: .8, ease: easeInOut, align: .45, trail: .3, scale: .68,
      path: g => [beside(g,g.t.carbon,1),{x:(g.t.carbon.cx+g.t.merv11.cx)/2,y:g.t.merv11.cy-g.t.merv11.h}, beside(g,g.t.merv11,0)] },
    packBeat("merv11", 1.5),
    { name: "to-merv13", pose: "cruise", dur: .8, ease: easeInOut, align: .45, trail: .3, scale: .68,
      path: g => [beside(g,g.t.merv11,1),{x:(g.t.merv11.cx+g.t.merv13.cx)/2,y:g.t.merv13.cy-g.t.merv13.h}, beside(g,g.t.merv13,0)] },
    packBeat("merv13", 1.5),
    { name: "thumbs-merv13", pose: "thumb", dur: 1.3, ease: easeInOut, align: 0, face: 1, trail: 0, bob: 6, scale: .68,
      path: g => [beside(g,g.t.merv13,1), beside(g,g.t.merv13,2)] },

    // --- across the headline, dive, and work the CTA ---
    { name: "climb-left", pose: "soar", dur: 2.2, ease: easeInOut, align: .55, trail: .6, scale: [.68,.92],
      path: g => [beside(g,g.t.merv13,2),{x:.70*g.W,y:.44*g.H},{x:.46*g.W,y:.26*g.H},{x:.27*g.W,y:.24*g.H}] },
    { name: "dive-left", pose: "punch", dur: 1.6, ease: easeIn, align: .85, trail: 1, scale: [.92,.76],
      path: g => [{x:.27*g.W,y:.24*g.H},{x:.19*g.W,y:.40*g.H},{x:.15*g.W,y:.58*g.H}] },
    { name: "to-cta", pose: "pullup", dur: 1.1, ease: easeOut, align: .2, trail: .3, scale: [.76,.6], minDim: .88,
      path: g => [{x:.15*g.W,y:.58*g.H},
                  {x:g.t.cta.cx+g.t.cta.w*.30,y:g.t.cta.cy-g.t.cta.h*2.4},
                  {x:g.t.cta.cx+g.t.cta.w*.78,y:g.t.cta.cy-g.t.cta.h*1.1}] },
    { name: "salute-cta", pose: "thumb", dur: 1.5, ease: easeInOut, align: 0, face: -1, trail: 0, bob: 6, scale: .6, minDim: .92,
      path: g => [{x:g.t.cta.cx+g.t.cta.w*.78,y:g.t.cta.cy-g.t.cta.h*1.1},
                  {x:g.t.cta.cx+g.t.cta.w*.82,y:g.t.cta.cy-g.t.cta.h*1.4}] },
    { name: "brand-run", pose: "cruise", dur: 2.0, ease: easeInOut, align: .5, trail: .8, scale: [.6,.7], minDim: .8,
      path: g => [{x:g.t.cta.cx+g.t.cta.w*.82,y:g.t.cta.cy-g.t.cta.h*1.4},
                  {x:.40*g.W,y:.80*g.H},
                  {x:g.t.brands.x,y:g.t.brands.cy-g.t.brands.h*1.7},
                  {x:g.t.brands.x+g.t.brands.w,y:g.t.brands.cy-g.t.brands.h*1.9}] },

    // --- close: figure-eight in the open right, then away ---
    { name: "swoop-up", pose: "soar", dur: 1.2, ease: easeOut, align: .6, trail: .7, scale: [.7,.8],
      path: g => [{x:g.t.brands.x+g.t.brands.w,y:g.t.brands.cy-g.t.brands.h*1.9},
                  {x:.92*g.W,y:.60*g.H},{x:.88*g.W,y:.40*g.H}] },
    { name: "figure-8", pose: "bank", dur: 3.2, ease: easeInOut, align: 1, trail: .8, scale: [.8,.88],
      path: g => { const cx=.62*g.W, cy=.40*g.H, rx=.26*g.W, ry=.26*g.H;
        return Array.from({length:17},(_,i)=>{const a=Math.PI/2+(i/16)*Math.PI*2;
          return {x:cx+Math.sin(a)*rx, y:cy+Math.sin(a*2)*ry*.5};}); } },
    { name: "exit", pose: "punch", dur: 1.8, ease: easeIn, align: .8, trail: 1, scale: [.88,.44],
      path: g => [{x:.88*g.W,y:.40*g.H},{x:1.02*g.W,y:.56*g.H},{x:1.20*g.W,y:.74*g.H},{x:1.34*g.W,y:.86*g.H}] },
  ];

const TOTAL = BEATS.reduce((s, b) => s + b.dur, 0);

/** every image the layer will need, for preloading */
export const FLIGHT_ASSETS: string[] = Array.from(
  new Set(Object.values(POSES).flatMap((p) => [p.src, (p as Pose).still ?? p.src])),
);

/* ------------------------------------------------------------- the engine --- */

export function createHeroFlight(
  layer: HTMLElement,
  sprite: HTMLElement,
  trail: HTMLElement,
  assetVersion = "",
): () => void {
  let geo: Geo = { W: 1, H: 1, u: 0.3, t: {} };
  let paths: Pt[][] = [];
  let unit = 0.3;
  let lite = window.innerWidth < 1024;
  let curPose: PoseKey | null = null;
  let frameIdx = 0;
  let frameAcc = 0;
  let angle = 0;
  let dim = 1;

  const measure = () => {
    const stage = layer.getBoundingClientRect();
    const W = stage.width || 1;
    const H = stage.height || 1;
    const t: Record<string, Rect> = {};
    for (const name of Object.keys(TARGETS)) {
      const el = document.querySelector(TARGETS[name]) as HTMLElement | null;
      const r = el?.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) {
        t[name] = rectOf(r.left - stage.left, r.top - stage.top, r.width, r.height);
      } else {
        const [x, y, w, h] = FALLBACK[name] ?? [0.5, 0.5, 0.1, 0.1];
        t[name] = rectOf(x * W, y * H, w * W, h * H);
      }
    }
    unit = clamp(Math.min(W * 0.3, H * 0.5), 170, 430) / REF_H;
    geo = { W, H, u: unit, t };
    lite = window.innerWidth < 1024;
    paths = BEATS.map((b) => b.path(geo));
    curPose = null; // force the sprite box to be re-laid-out
  };

  measure();

  const ro = new ResizeObserver(measure);
  ro.observe(layer);
  ro.observe(document.body);

  let running = true;
  const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; }, { threshold: 0 });
  io.observe(layer);
  const onVis = () => { if (document.hidden) running = false; };
  document.addEventListener("visibilitychange", onVis);

  const setPose = (key: PoseKey) => {
    if (curPose === key) return;
    curPose = key;
    const p: Pose = POSES[key];
    const useSheet = !lite && !!p.cols;
    sprite.style.backgroundImage = `url(${(useSheet ? p.src : p.still ?? p.src)}${assetVersion})`;
    sprite.style.width = `${p.fw * unit}px`;
    sprite.style.height = `${p.fh * unit}px`;
    sprite.style.transformOrigin = `${p.ax * 100}% ${p.ay * 100}%`;
    if (useSheet) {
      sprite.style.backgroundSize = `${p.cols! * 100}% ${p.rows! * 100}%`;
    } else {
      sprite.style.backgroundSize = "100% 100%";
      sprite.style.backgroundPosition = "0% 0%";
    }
    frameIdx = 0;
    frameAcc = 0;
  };

  let raf = 0;
  let last = performance.now();
  let clock = 0;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!running) return;

    clock = (clock + dt) % TOTAL;

    let acc = 0, bi = 0;
    for (; bi < BEATS.length - 1; bi++) {
      if (clock < acc + BEATS[bi].dur) break;
      acc += BEATS[bi].dur;
    }
    const beat = BEATS[bi];
    const e = (beat.ease ?? easeInOut)(clamp((clock - acc) / beat.dur, 0, 1));
    const pts = paths[bi] ?? [{ x: 0, y: 0 }];

    const pos = spline(pts, e);
    const a1 = spline(pts, Math.min(1, e + 0.004));
    const a0 = spline(pts, Math.max(0, e - 0.004));
    const dx = a1.x - a0.x, dy = a1.y - a0.y;
    const speed = Math.hypot(dx, dy) / 0.008;

    setPose(beat.pose);
    const p: Pose = POSES[beat.pose];

    const sc = Array.isArray(beat.scale)
      ? lerp(beat.scale[0], beat.scale[1], e)
      : beat.scale ?? 0.8;

    const heading = Math.atan2(dy, dx);
    const face: 1 | -1 = beat.face ?? (Math.abs(dx) < 0.0005 ? p.faces : dx >= 0 ? 1 : -1);
    const flip = face !== p.faces;

    // transform order is translate -> rotate -> scale, so the mirror is applied
    // first: mirrored art points along -x, hence the PI offset.
    let target = norm(flip ? heading - Math.PI : heading) * (beat.align ?? 0.5);
    if (beat.spin) {
      target += beat.spin * Math.PI * 2 * e;
      angle = target;
    } else {
      angle += norm(target - angle) * Math.min(1, dt * 9);
    }

    const bob = beat.bob ? Math.sin(clock * 2.1) * beat.bob : 0;

    const copy = geo.t.copy;
    const dTarget = Math.max(
      beat.minDim ?? 0,
      lerp(1, 0.68, smoothstep(copy.x + copy.w, copy.x + copy.w * 0.45, pos.x)),
    );
    dim += (dTarget - dim) * Math.min(1, dt * 3.5);

    if (!lite && p.frames && p.cols && p.rows && p.fps) {
      frameAcc += dt * p.fps * lerp(0.8, 1.3, clamp(speed / 900, 0, 1));
      while (frameAcc >= 1) { frameAcc -= 1; frameIdx = (frameIdx + 1) % p.frames; }
      const col = frameIdx % p.cols;
      const row = Math.floor(frameIdx / p.cols) % p.rows;
      sprite.style.backgroundPosition =
        `${(col / (p.cols - 1)) * 100}% ${(row / (p.rows - 1)) * 100}%`;
    }

    sprite.style.transform =
      `translate3d(${pos.x - p.ax * p.fw * unit}px, ${pos.y + bob - p.ay * p.fh * unit}px, 0)` +
      ` rotate(${(angle * 180) / Math.PI}deg)` +
      ` scale(${sc * (flip ? -1 : 1)}, ${sc})`;
    sprite.style.opacity = String(dim);
    sprite.style.filter =
      `saturate(${lerp(0.88, 1, dim)}) brightness(${lerp(0.84, 1, dim)})` +
      ` drop-shadow(0 ${8 * sc}px ${20 * sc}px rgba(6, 12, 26, 0.42))`;

    const tStr = (beat.trail ?? 0) * dim;
    if (tStr > 0.02) {
      const h = REF_H * unit;
      trail.style.opacity = String(0.5 * tStr);
      trail.style.width = `${h * 1.4 * sc * tStr}px`;
      trail.style.height = `${h * 0.12 * sc}px`;
      trail.style.transform =
        `translate3d(${pos.x}px, ${pos.y + bob}px, 0)` +
        ` rotate(${(heading * 180) / Math.PI + 180}deg) translateX(${h * 0.1 * sc}px)`;
    } else {
      trail.style.opacity = "0";
    }
  };

  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}

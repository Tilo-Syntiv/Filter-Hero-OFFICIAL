/**
 * Receded background flight. Distinct drawings for cruise, stroke, climb,
 * dive, and bank. Head stays on-stage; the path never starts off-canvas.
 */

export type PoseKey = "cruise" | "stroke" | "climb" | "dive" | "bank";

export type Pose = {
  src: string;
  w: number;
  h: number;
  ax: number;
  ay: number;
  pitch: number;
};

export const POSES: Record<PoseKey, Pose> = {
  cruise: { src: "/hero/fly-poses/cruise.png", w: 1314, h: 520, ax: 0.58, ay: 0.5, pitch: 0.04 },
  stroke: { src: "/hero/fly-poses/stroke.png", w: 1460, h: 803, ax: 0.58, ay: 0.48, pitch: 0.38 },
  climb: { src: "/hero/fly-poses/climb.png", w: 824, h: 932, ax: 0.54, ay: 0.42, pitch: -0.72 },
  dive: { src: "/hero/fly-poses/dive.png", w: 845, h: 959, ax: 0.56, ay: 0.4, pitch: 0.88 },
  bank: { src: "/hero/fly-poses/bank.png", w: 1400, h: 844, ax: 0.54, ay: 0.46, pitch: 0.18 },
};

export const SKY_FLYER_SRC = POSES.cruise.src;

const ASSET = "?v=fh147";
const FADE = 0.2;
const STROKE = 0.7;

type Pt = { x: number; y: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

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
  const p0 = p(i - 1);
  const p1 = p(i);
  const p2 = p(i + 1);
  const p3 = p(i + 2);
  const f2 = f * f;
  const f3 = f2 * f;
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * f +
      (2 * a - 5 * b + 4 * c - d) * f2 +
      (-a + 3 * b - 3 * c + d) * f3);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}

type Band = { W: number; H: number; y0: number; y1: number };

const xy = (g: Band, nx: number, ny: number): Pt => ({
  x: clamp(nx, 0.08, 0.92) * g.W,
  y: g.y0 + clamp(ny, 0.04, 0.96) * (g.y1 - g.y0),
});

const oval = (g: Band, cx: number, cy: number, rx: number, ry: number, n = 16, a0 = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / (n - 1)) * Math.PI * 2;
    return xy(g, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });

type Beat = {
  dur: number;
  path: (g: Band) => Pt[];
  scale: number | [number, number];
};

const BEATS: Beat[] = [
  {
    dur: 7.2,
    scale: [0.86, 0.94],
    path: (g) => [xy(g, 0.12, 0.38), xy(g, 0.32, 0.2), xy(g, 0.52, 0.34), xy(g, 0.74, 0.18), xy(g, 0.88, 0.36)],
  },
  {
    dur: 8.4,
    scale: 0.92,
    path: (g) => [xy(g, 0.88, 0.36), ...oval(g, 0.68, 0.4, 0.18, 0.3, 18, 0)],
  },
  {
    dur: 6.8,
    scale: [0.9, 0.82],
    path: (g) => [xy(g, 0.86, 0.4), xy(g, 0.64, 0.18), xy(g, 0.42, 0.48), xy(g, 0.22, 0.22), xy(g, 0.14, 0.32)],
  },
  {
    dur: 8.8,
    scale: [0.82, 0.9],
    path: (g) => [
      xy(g, 0.14, 0.32),
      xy(g, 0.28, 0.12),
      xy(g, 0.46, 0.52),
      xy(g, 0.64, 0.14),
      xy(g, 0.8, 0.48),
      xy(g, 0.86, 0.3),
    ],
  },
  {
    dur: 9.6,
    scale: 0.88,
    path: (g) => [
      xy(g, 0.86, 0.3),
      ...Array.from({ length: 21 }, (_, i) => {
        const a = Math.PI / 2 + (i / 20) * Math.PI * 2;
        return xy(g, 0.5 + Math.sin(a) * 0.26, 0.4 + Math.sin(a * 2) * 0.28);
      }),
    ],
  },
  {
    dur: 7.6,
    scale: [0.88, 0.84],
    path: (g) => [
      xy(g, 0.76, 0.4),
      xy(g, 0.56, 0.2),
      xy(g, 0.36, 0.46),
      xy(g, 0.2, 0.18),
      xy(g, 0.34, 0.5),
      xy(g, 0.16, 0.34),
    ],
  },
  {
    dur: 5.4,
    scale: [0.84, 0.86],
    path: (g) => [xy(g, 0.16, 0.34), xy(g, 0.12, 0.46), xy(g, 0.1, 0.3), xy(g, 0.12, 0.38)],
  },
];

const TOTAL = BEATS.reduce((sum, beat) => sum + beat.dur, 0);

function pickPose(heading: number, turnRate: number, clock: number): PoseKey {
  const downness = Math.sin(heading);
  if (Math.abs(turnRate) > 2.4) return "bank";
  if (downness < -0.42) return "climb";
  if (downness > 0.46) return "dive";
  return clock % (STROKE * 2) < STROKE ? "cruise" : "stroke";
}

function finite(n: number, fallback: number) {
  return Number.isFinite(n) ? n : fallback;
}

export function createHeroSkyFlight(layer: HTMLElement, rig: HTMLElement): () => void {
  const layers = Array.from(rig.querySelectorAll<HTMLImageElement>("img"));
  if (layers.length < 2) return () => undefined;

  let band: Band = { W: 1, H: 1, y0: 0, y1: 1 };
  let paths: Pt[][] = [];
  let size = 168;
  let running = true;
  let dim = 0.62;
  let heading = 0;
  let shown: PoseKey = "cruise";
  let incoming: PoseKey | null = null;
  let fadeT = 1;
  let front = 0;

  const applyPose = (node: HTMLImageElement, key: PoseKey) => {
    const pose = POSES[key];
    if (!node.src.includes(pose.src)) node.src = `${pose.src}${ASSET}`;
    node.style.height = `${size}px`;
    node.style.width = `${size * (pose.w / pose.h)}px`;
  };

  const measure = () => {
    const box = layer.getBoundingClientRect();
    const W = Math.max(box.width, 1);
    const H = Math.max(box.height, 1);
    const mobile = W < 1024;
    band = {
      W,
      H,
      y0: H * (mobile ? 0.06 : 0.1),
      y1: H * (mobile ? 0.46 : 0.56),
    };
    size = clamp(Math.min(W, H) * (mobile ? 0.26 : 0.24), 140, 240);
    paths = BEATS.map((beat) => beat.path(band));
    applyPose(layers[0], shown);
    applyPose(layers[1], incoming ?? shown);
  };

  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(layer);
  const io = new IntersectionObserver(([entry]) => {
    if (entry.boundingClientRect.height > 8) running = entry.isIntersecting && !document.hidden;
  }, { threshold: 0 });
  io.observe(layer);
  const onVis = () => {
    if (!document.hidden) running = true;
  };
  document.addEventListener("visibilitychange", onVis);

  applyPose(layers[0], "cruise");
  applyPose(layers[1], "stroke");
  layers[0].style.opacity = "1";
  layers[1].style.opacity = "0";
  rig.style.left = "0px";
  rig.style.top = "0px";

  let raf = 0;
  let last = performance.now();
  let clock = 1.2;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!running) return;

    clock = (clock + dt) % TOTAL;
    let acc = 0;
    let i = 0;
    for (; i < BEATS.length - 1; i++) {
      if (clock < acc + BEATS[i].dur) break;
      acc += BEATS[i].dur;
    }
    const beat = BEATS[i];
    const raw = clamp((clock - acc) / beat.dur, 0, 1);
    const pts = paths[i] ?? [{ x: band.W * 0.4, y: band.H * 0.28 }];
    const pos = spline(pts, raw);
    const ahead = spline(pts, Math.min(1, raw + 0.04));
    const dx = ahead.x - pos.x;
    const dy = ahead.y - pos.y;
    const nextHeading = Math.atan2(dy, dx);
    const turnRate = norm(nextHeading - heading) / Math.max(dt, 0.016);
    heading += norm(nextHeading - heading) * Math.min(1, dt * 5.2);

    const want = pickPose(heading, turnRate, clock);
    if (!incoming && want !== shown) {
      incoming = want;
      fadeT = 0;
      applyPose(layers[1 - front], want);
    }
    if (incoming) {
      fadeT = Math.min(1, fadeT + dt / FADE);
      layers[front].style.opacity = String(1 - fadeT);
      layers[1 - front].style.opacity = String(fadeT);
      if (fadeT >= 1) {
        front = 1 - front;
        shown = incoming;
        incoming = null;
        layers[front].style.opacity = "1";
        layers[1 - front].style.opacity = "0";
      }
    } else {
      layers[front].style.opacity = "1";
      layers[1 - front].style.opacity = "0";
    }

    const pose = POSES[incoming && fadeT > 0.5 ? incoming : shown];
    const faceLeft = Math.cos(heading) < -0.15;
    const travelPitch = Math.atan2(dy, Math.abs(dx) + 0.0001);
    const extra = clamp(travelPitch - pose.pitch, -0.18, 0.18);
    const sc = Array.isArray(beat.scale) ? lerp(beat.scale[0], beat.scale[1], raw) : beat.scale;
    const overCopy = clamp((band.W * 0.42 - pos.x) / (band.W * 0.2), 0, 1);
    dim += (lerp(0.72, 0.42, overCopy) - dim) * Math.min(1, dt * 2.4);

    const fw = size * (pose.w / pose.h);
    const x = finite(pos.x - pose.ax * fw, band.W * 0.28);
    const y = finite(pos.y - pose.ay * size, band.H * 0.18);
    const rot = finite((extra * 180) / Math.PI, 0);
    const scale = finite(sc, 0.9);
    rig.style.opacity = String(finite(dim, 0.62));
    rig.style.transform =
      `translate3d(${x}px, ${y}px, 0)` +
      ` rotate(${rot}deg)` +
      ` scale(${scale * (faceLeft ? -1 : 1)}, ${scale})`;
  };

  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}

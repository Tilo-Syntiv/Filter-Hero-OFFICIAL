import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type DimKey = "width" | "length" | "depth";

const DIMS: {
  key: DimKey;
  label: string;
  hint: string;
  inches: string;
  color: string;
  text: string;
  hintColor: string;
  mark: string;
}[] = [
  {
    key: "width",
    label: "Width",
    hint: "Side to side",
    inches: "20",
    color: "#8eb0d8",
    text: "#141e30",
    hintColor: "#2c3d55",
    mark: "#3a66a3",
  },
  {
    key: "length",
    label: "Length",
    hint: "Top to bottom",
    inches: "25",
    color: "#203868",
    text: "#ffffff",
    hintColor: "#e8eef8",
    mark: "#203868",
  },
  {
    key: "depth",
    label: "Depth",
    hint: "Thickness",
    inches: "2",
    color: "#7f2328",
    text: "#ffffff",
    hintColor: "#f3d6d7",
    mark: "#7f2328",
  },
];

const CYCLE_MS = 3800;
const PAUSE_MS = 9000;

/** Front-face rectangle + isometric extrusion. Length is the tall edge.
 *  Face width (214) is 20"; extrusion is 2" at the same isometric angle. */
const F = {
  x: 198,
  y: 158,
  w: 214,
  h: 236,
  dx: 18,
  dy: -11,
};

const front = {
  tl: { x: F.x, y: F.y },
  tr: { x: F.x + F.w, y: F.y },
  br: { x: F.x + F.w, y: F.y + F.h },
  bl: { x: F.x, y: F.y + F.h },
};

const topBack = {
  tl: { x: F.x + F.dx, y: F.y + F.dy },
  tr: { x: F.x + F.w + F.dx, y: F.y + F.dy },
};

const rightBackBottom = {
  x: F.x + F.w + F.dx,
  y: F.y + F.h + F.dy,
};

function poly(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function TapeMeasure({
  x1,
  y1,
  x2,
  y2,
  reduceMotion,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  reduceMotion: boolean | null;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const short = len < 48;
  const h = short ? 9 : 15;
  const cap = short ? 2.2 : 5;
  const ticks: number[] = [];
  const step = short ? 5 : 10;
  for (let t = step; t < len - cap; t += step) ticks.push(t);

  return (
    <motion.g
      transform={`translate(${x1} ${y1}) rotate(${angle})`}
      initial={{ opacity: reduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      style={{ pointerEvents: "none" }}
    >
      <rect
        x={0}
        y={-h / 2}
        width={len}
        height={h}
        rx={short ? 1.4 : 2.2}
        fill="#F5C518"
        stroke="#1c1c1c"
        strokeWidth={0.7}
      />
      {ticks.map((t, i) => {
        const major = i % 5 === 4;
        return (
          <line
            key={t}
            x1={t}
            y1={-h / 2 + 1.2}
            x2={t}
            y2={major ? h / 2 - 1.2 : -0.8}
            stroke="#1c1c1c"
            strokeWidth={major ? 0.85 : 0.55}
          />
        );
      })}
      <rect x={0} y={-h / 2} width={cap} height={h} fill="#1c1c1c" />
      <rect x={len - cap} y={-h / 2} width={cap} height={h} fill="#1c1c1c" />
    </motion.g>
  );
}

function DimChip({
  dim,
  x,
  y,
  anchor = "middle",
}: {
  dim: (typeof DIMS)[number];
  x: number;
  y: number;
  anchor?: "middle" | "start" | "end";
}) {
  const w = 118;
  const h = 38;
  const ox = anchor === "middle" ? -w / 2 : anchor === "end" ? -w : 0;
  return (
    <g transform={`translate(${x + ox} ${y - h / 2})`}>
      <rect
        width={w}
        height={h}
        rx={19}
        fill={dim.color}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
      <text
        x={w / 2}
        y={15}
        textAnchor="middle"
        dominantBaseline="central"
        fill={dim.text}
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.16em"
        fontFamily="Plus Jakarta Sans, Manrope, sans-serif"
      >
        {dim.label.toUpperCase()}
      </text>
      <text
        x={w / 2}
        y={28}
        textAnchor="middle"
        dominantBaseline="central"
        fill={dim.hintColor}
        fontSize="9"
        fontWeight="600"
        fontFamily="Manrope, sans-serif"
      >
        {dim.hint}
      </text>
    </g>
  );
}

interface MeasureFilterDiagramProps {
  active?: DimKey;
  onActiveChange?: (key: DimKey) => void;
  autoplay?: boolean;
}

export default function MeasureFilterDiagram({
  active: controlled,
  onActiveChange,
  autoplay = true,
}: MeasureFilterDiagramProps) {
  const reduceMotion = useReducedMotion();
  const [internal, setInternal] = useState<DimKey>("width");
  const active = controlled ?? internal;
  const pauseUntil = useRef(0);
  const fromAutoplay = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const setActive = (key: DimKey, user = true) => {
    if (user) pauseUntil.current = Date.now() + PAUSE_MS;
    setInternal(key);
    onActiveChange?.(key);
  };

  useEffect(() => {
    if (!controlled) return;
    if (fromAutoplay.current) {
      fromAutoplay.current = false;
      return;
    }
    pauseUntil.current = Date.now() + PAUSE_MS;
  }, [controlled]);

  useEffect(() => {
    if (!autoplay || reduceMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      const current = activeRef.current;
      const i = DIMS.findIndex((d) => d.key === current);
      const next = DIMS[(i < 0 ? 0 : i + 1) % DIMS.length].key;
      fromAutoplay.current = true;
      setInternal(next);
      onActiveChange?.(next);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [autoplay, reduceMotion, onActiveChange]);

  const widthOn = active === "width";
  const lengthOn = active === "length";
  const depthOn = active === "depth";
  const activeDim = DIMS.find((d) => d.key === active) ?? DIMS[0];

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-[#eef2f6]">
        <svg
          viewBox="0 0 640 520"
          className="w-full h-auto"
          role="group"
          aria-label={`Sample air filter. ${activeDim.label}: ${activeDim.hint}. Example size 20 by 25 by 2 inches.`}
        >
          <defs>
            <linearGradient id="mfdFace" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f4f7fb" />
              <stop offset="100%" stopColor="#d9e4f0" />
            </linearGradient>
            <linearGradient id="mfdPleat" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c5d6e8" />
              <stop offset="50%" stopColor="#8eb0d8" />
              <stop offset="100%" stopColor="#6d93bb" />
            </linearGradient>
            <linearGradient id="mfdTop" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dce5ef" />
              <stop offset="100%" stopColor="#f7f9fc" />
            </linearGradient>
            <linearGradient id="mfdSide" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#203868" />
              <stop offset="100%" stopColor="#141e30" />
            </linearGradient>
            <clipPath id="mfdFrontClip">
              <rect x={F.x + 14} y={F.y + 14} width={F.w - 28} height={F.h - 28} rx="2" />
            </clipPath>
            <pattern id="mfdGrid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path
                d="M11 0 L22 11 L11 22 L0 11 Z"
                fill="none"
                stroke="#203868"
                strokeWidth="0.7"
                opacity="0.28"
              />
            </pattern>
          </defs>

          <ellipse cx="330" cy="478" rx="150" ry="14" fill="#203868" opacity="0.08" />

          {/* Top (depth) face */}
          <polygon
            points={poly([front.tl, front.tr, topBack.tr, topBack.tl])}
            fill="url(#mfdTop)"
            stroke="#203868"
            strokeWidth={widthOn || depthOn ? 1.2 : 1}
          />

          {/* Right (depth) face */}
          <polygon
            points={poly([front.tr, topBack.tr, rightBackBottom, front.br])}
            fill="url(#mfdSide)"
          />

          {/* Front cardboard frame */}
          <rect
            x={F.x}
            y={F.y}
            width={F.w}
            height={F.h}
            fill="url(#mfdFace)"
            stroke="#c5ced8"
            strokeWidth="1"
          />
          <rect
            x={F.x + 10}
            y={F.y + 10}
            width={F.w - 20}
            height={F.h - 20}
            fill="none"
            stroke="#b7c3d0"
            strokeWidth="6"
          />

          {/* Pleated media */}
          <g clipPath="url(#mfdFrontClip)">
            {Array.from({ length: 14 }, (_, i) => {
              const x = F.x + 16 + i * ((F.w - 32) / 13);
              return (
                <rect
                  key={i}
                  x={x}
                  y={F.y + 14}
                  width={8}
                  height={F.h - 28}
                  fill="url(#mfdPleat)"
                  opacity={0.55 + (i % 2) * 0.25}
                />
              );
            })}
            <rect
              x={F.x + 14}
              y={F.y + 14}
              width={F.w - 28}
              height={F.h - 28}
              fill="url(#mfdGrid)"
            />
          </g>

          {/* Active edge glow — locked to the real cardboard edges */}
          <g fill="none" strokeLinecap="square">
            <motion.line
              x1={front.tl.x}
              y1={front.tl.y}
              x2={front.tr.x}
              y2={front.tr.y}
              stroke="#8eb0d8"
              strokeWidth={widthOn ? 7 : 2}
              initial={{ opacity: widthOn ? 1 : 0.18 }}
              animate={{ opacity: widthOn ? 1 : 0.18 }}
              transition={{ duration: 0.3 }}
            />
            <motion.line
              x1={front.tl.x}
              y1={front.tl.y}
              x2={front.bl.x}
              y2={front.bl.y}
              stroke="#203868"
              strokeWidth={lengthOn ? 7 : 2}
              initial={{ opacity: lengthOn ? 1 : 0.18 }}
              animate={{ opacity: lengthOn ? 1 : 0.18 }}
              transition={{ duration: 0.3 }}
            />
            <motion.line
              x1={front.tr.x}
              y1={front.tr.y}
              x2={topBack.tr.x}
              y2={topBack.tr.y}
              stroke="#7f2328"
              strokeWidth={depthOn ? 7 : 2}
              initial={{ opacity: depthOn ? 1 : 0.22 }}
              animate={{ opacity: depthOn ? 1 : 0.22 }}
              transition={{ duration: 0.3 }}
            />
          </g>

          <AnimatePresence>
            {widthOn && (
              <TapeMeasure
                key="tape-w"
                x1={front.tl.x}
                y1={front.tl.y}
                x2={front.tr.x}
                y2={front.tr.y}
                reduceMotion={reduceMotion}
              />
            )}
            {lengthOn && (
              <TapeMeasure
                key="tape-l"
                x1={front.tl.x}
                y1={front.tl.y}
                x2={front.bl.x}
                y2={front.bl.y}
                reduceMotion={reduceMotion}
              />
            )}
            {depthOn && (
              <TapeMeasure
                key="tape-d"
                x1={front.tr.x}
                y1={front.tr.y}
                x2={topBack.tr.x}
                y2={topBack.tr.y}
                reduceMotion={reduceMotion}
              />
            )}
          </AnimatePresence>

          {widthOn && <DimChip dim={DIMS[0]} x={F.x + F.w / 2} y={118} />}
          {lengthOn && (
            <DimChip dim={DIMS[1]} x={108} y={F.y + F.h / 2} anchor="middle" />
          )}
          {depthOn && (
            <DimChip dim={DIMS[2]} x={topBack.tr.x + 78} y={topBack.tr.y - 6} />
          )}

          {/* Printed size on the cardboard — this is what customers actually order */}
          <text
            x={F.x + F.w / 2}
            y={F.y + F.h - 8}
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, Manrope, sans-serif"
            fontSize="13"
            fontWeight="800"
            letterSpacing="0.04em"
            style={{ pointerEvents: "none" }}
          >
            <tspan fill={widthOn ? DIMS[0].mark : "#203868"}>20</tspan>
            <tspan fill="#8a96a8"> × </tspan>
            <tspan fill={lengthOn ? DIMS[1].mark : "#5c6b80"}>25</tspan>
            <tspan fill="#8a96a8"> × </tspan>
            <tspan fill={depthOn ? DIMS[2].mark : "#5c6b80"}>2</tspan>
          </text>

          {/* Hit targets last so the tape never swallows the click */}
          <line
            x1={front.tl.x}
            y1={front.tl.y}
            x2={front.tr.x}
            y2={front.tr.y}
            stroke="transparent"
            strokeWidth="36"
            className="cursor-pointer"
            onClick={() => setActive("width")}
          />
          <line
            x1={front.tl.x}
            y1={front.tl.y}
            x2={front.bl.x}
            y2={front.bl.y}
            stroke="transparent"
            strokeWidth="36"
            className="cursor-pointer"
            onClick={() => setActive("length")}
          />
          <line
            x1={front.tr.x}
            y1={front.tr.y}
            x2={topBack.tr.x}
            y2={topBack.tr.y}
            stroke="transparent"
            strokeWidth="36"
            className="cursor-pointer"
            onClick={() => setActive("depth")}
          />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-center gap-2 md:gap-3">
        {DIMS.map((dim) => {
          const isOn = active === dim.key;
          return (
            <button
              key={dim.key}
              type="button"
              onClick={() => setActive(dim.key)}
              className={[
                "min-w-[5.5rem] rounded-2xl border px-3 py-2.5 text-center transition-all",
                isOn
                  ? "border-transparent shadow-md"
                  : "border-border bg-white/90 text-muted-foreground hover:border-ice/60 hover:text-foreground",
              ].join(" ")}
              style={isOn ? { background: dim.color, color: dim.text } : undefined}
              aria-pressed={isOn}
            >
              <span className="block text-[10px] font-bold tracking-[0.16em] uppercase">
                {dim.label}
              </span>
              <span
                className={[
                  "block text-lg font-extrabold leading-tight",
                  isOn ? "" : "text-foreground",
                ].join(" ")}
              >
                {dim.inches}"
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-foreground">
        Order as{" "}
        {DIMS.map((dim, i) => (
          <span key={dim.key}>
            <span
              className="transition-colors"
              style={{ color: active === dim.key ? dim.mark : undefined }}
            >
              {dim.inches}
            </span>
            {i < DIMS.length - 1 ? <span className="text-muted-foreground"> × </span> : null}
          </span>
        ))}
        <span className="text-muted-foreground"> — Width × Length × Depth</span>
      </p>
    </div>
  );
}

export type { DimKey };
export { DIMS };

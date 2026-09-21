import { motion } from "framer-motion";
import {
  DAY1_PATH,
  DELIVERY_HUBS,
  DELIVERY_STATES,
  MAP_COLORS,
  MAP_VIEW,
} from "@/data/usDeliveryMap";

const CALLOUT_ABBR = new Set(["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"]);

const CALLOUT_STACK: { abbr: string; tx: number; ty: number }[] = [
  { abbr: "VT", tx: 948, ty: 112 },
  { abbr: "NH", tx: 948, ty: 130 },
  { abbr: "MA", tx: 948, ty: 148 },
  { abbr: "RI", tx: 948, ty: 166 },
  { abbr: "CT", tx: 948, ty: 184 },
  { abbr: "NJ", tx: 948, ty: 210 },
  { abbr: "DE", tx: 948, ty: 228 },
  { abbr: "MD", tx: 948, ty: 246 },
];

const LEGEND = [
  { color: MAP_COLORS.day1, label: "1 day" },
  { color: MAP_COLORS.day2, label: "2 days" },
  { color: MAP_COLORS.day3, label: "3+ days" },
] as const;

function HubPin({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }}>
      <path
        d="M0 0 l-9 -10 h-12 a7 7 0 0 1 -7 -7 v-16 a7 7 0 0 1 7 -7 h42 a7 7 0 0 1 7 7 v16 a7 7 0 0 1 -7 7 h-12 z"
        fill={MAP_COLORS.pin}
      />
      <text
        y={-22}
        textAnchor="middle"
        fill="#fff"
        fontSize="13"
        fontWeight="800"
        fontFamily="Manrope, Plus Jakarta Sans, sans-serif"
        letterSpacing="0.04em"
      >
        {id}
      </text>
    </g>
  );
}

function DeliveryMap() {
  const callouts = CALLOUT_STACK.map((c) => {
    const st = DELIVERY_STATES.find((s) => s.abbr === c.abbr);
    return st ? { ...c, x: st.cx, y: st.cy } : null;
  }).filter((c): c is { abbr: string; x: number; y: number; tx: number; ty: number } =>
    Boolean(c),
  );

  return (
    <div
      className="delivery-map-frame relative overflow-hidden rounded-2xl"
      style={{ ["--map-wash" as string]: MAP_COLORS.bg }}
    >
      <svg
        viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`}
        role="img"
        aria-label="Estimated delivery times from Filter Hero fulfillment centers in Nevada, Texas, Pennsylvania, and Florida"
        className="block h-auto w-full"
      >
        <title>US delivery map</title>

        <defs>
          <clipPath id="us-land">
            {DELIVERY_STATES.map((s) => (
              <path key={`clip-${s.id}`} d={s.path} />
            ))}
          </clipPath>
        </defs>

        {DELIVERY_STATES.map((s) => (
          <path
            key={s.id}
            d={s.path}
            fill={s.days === 2 ? MAP_COLORS.day2 : MAP_COLORS.day3}
            stroke={MAP_COLORS.border}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        ))}

        <path
          d={DAY1_PATH}
          fill={MAP_COLORS.day1}
          clipPath="url(#us-land)"
          style={{ pointerEvents: "none" }}
        />

        {DELIVERY_STATES.map((s) => (
          <path
            key={`stroke-${s.id}`}
            d={s.path}
            fill="none"
            stroke={MAP_COLORS.border}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        ))}

        {DELIVERY_STATES.filter((s) => !CALLOUT_ABBR.has(s.abbr)).map((s) => (
          <text
            key={`label-${s.id}`}
            x={s.cx}
            y={s.cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={MAP_COLORS.label}
            stroke="rgba(20,30,48,0.32)"
            strokeWidth={2.4}
            paintOrder="stroke"
            fontSize={s.abbr === "AK" || s.abbr === "HI" ? 9 : 11}
            fontWeight="700"
            fontFamily="Manrope, Plus Jakarta Sans, sans-serif"
            style={{ pointerEvents: "none" }}
          >
            {s.abbr}
          </text>
        ))}

        {callouts.map((c) => (
          <g key={`callout-${c.abbr}`}>
            <line
              x1={c.x}
              y1={c.y}
              x2={c.tx - 14}
              y2={c.ty}
              stroke={MAP_COLORS.leader}
              strokeWidth={0.8}
            />
            <text
              x={c.tx}
              y={c.ty}
              textAnchor="start"
              dominantBaseline="middle"
              fill={MAP_COLORS.callout}
              fontSize={11}
              fontWeight="700"
              fontFamily="Manrope, Plus Jakarta Sans, sans-serif"
            >
              {c.abbr}
            </text>
          </g>
        ))}

        {DELIVERY_HUBS.map((hub) => (
          <HubPin key={hub.id} x={hub.x} y={hub.y} id={hub.id} />
        ))}
      </svg>

      <ul className="absolute bottom-3 right-3 space-y-1.5 sm:bottom-5 sm:right-5">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="size-3.5 shrink-0 rounded-[4px] sm:size-4"
              style={{ background: item.color }}
              aria-hidden
            />
            <span className="text-[13px] font-semibold leading-none text-navy">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DeliverySection() {
  return (
    <section
      id="delivery"
      className="sheet-section py-16 md:py-24 scroll-mt-28"
      aria-labelledby="delivery-heading"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center md:mb-14"
        >
          <span className="section-label">Nationwide</span>
          <h2
            id="delivery-heading"
            className="text-3xl font-bold tracking-tight text-navy md:text-4xl lg:text-[2.6rem]"
          >
            2–3 day delivery across the US
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-navy/70 md:text-lg">
            Exact-fit filters from US fulfillment.
          </p>
        </motion.div>

        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-8"
          >
            <DeliveryMap />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-4"
          >
            <h3 className="mb-3 text-2xl font-bold tracking-tight text-navy">
              Shipped from the USA
            </h3>
            <p className="text-base leading-relaxed text-navy/80 md:text-lg">
              Ships from 4 fulfillment centers across the USA — 2–3 day
              delivery with real HVAC support.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

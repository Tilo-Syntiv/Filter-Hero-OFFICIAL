import { useState, type ReactNode } from "react";
import { BRAND_NAME } from "@/const";
import MeasureFilterDiagram, {
  type DimKey,
} from "@/components/MeasureFilterDiagram";

const STEPS: {
  key: DimKey;
  num: string;
  title: string;
  body: string;
  tag: string;
  icon: ReactNode;
}[] = [
  {
    key: "width",
    num: "01",
    title: "Width — side to side",
    body: "Lay the tape across the shorter face of the frame, left to right. That first number is Width.",
    tag: "First number",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="3" y="7" width="18" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 10v4M19 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "length",
    num: "02",
    title: "Length — top to bottom",
    body: "Measure the taller face of the frame, top to bottom. That second number is Length.",
    tag: "Second number",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 5h4M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "depth",
    num: "03",
    title: "Depth — the thickness",
    body: 'Measure the cardboard edge, front to back. Common depths are 1", 2", and 4".',
    tag: "Third number",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 8h12l4 4v8H8L4 16V8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M16 8v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const NOTES = [
  {
    label: "Nominal size",
    value: "20 × 25 × 2",
    desc: "The rounded size printed on the filter — use this when ordering.",
    tone: "bg-deep",
  },
  {
    label: "Actual size",
    value: "19½ × 24½ × 1¾",
    desc: "The true dimensions when you put a tape to the filter itself.",
    tone: "bg-navy",
  },
  {
    label: "Depth note",
    value: '2" ≈ 1¾" actual',
    desc: "Actual depth can vary by brand even when the nominal depth matches.",
    tone: "bg-mesh",
  },
];

export default function HowToMeasureGuide() {
  const [activeDim, setActiveDim] = useState<DimKey>("width");

  return (
    <div className="space-y-8 md:space-y-10">
      <div className="relative overflow-hidden rounded-3xl surface-panel">
        <div className="relative bg-[linear-gradient(125deg,#141e30_0%,#203868_55%,#3a66a3_120%)] px-4 py-7 md:px-10 md:py-10 text-white overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(500px 280px at 90% -10%, rgba(142,176,216,0.45), transparent 60%)",
            }}
          />
          <p className="relative text-xs font-bold tracking-[0.2em] uppercase text-ice mb-3">
            Sizing guide
          </p>
          <h3 className="relative text-2xl md:text-3xl font-bold tracking-tight mb-3 max-w-xl">
            How to measure your air filter
          </h3>
          <p className="relative text-sm md:text-base text-white/75 max-w-2xl leading-relaxed">
            Fastest path: read the size already printed on the cardboard. If that
            ink is gone, put a tape on one edge at a time — Width, then Length,
            then Depth — and {BRAND_NAME} will match the exact size.
          </p>
        </div>

        <div className="relative px-4 pb-6 pt-6 md:px-8 md:pb-8 space-y-5">
          <div className="rounded-2xl border border-ice/40 bg-white p-4 md:p-5">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-3">
              Skip the tape if you can
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 rounded-xl border-2 border-dashed border-navy/30 bg-[#f4f1ea] px-4 py-3">
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-navy/60 mb-1">
                  Printed on the frame
                </p>
                <p className="font-extrabold text-2xl md:text-3xl tracking-tight text-deep">
                  <span className="text-[#3a66a3]">20</span>
                  <span className="text-muted-foreground"> × </span>
                  <span className="text-navy">25</span>
                  <span className="text-muted-foreground"> × </span>
                  <span className="text-hero">2</span>
                </p>
                <div className="mt-1 grid grid-cols-3 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                  <span>Width</span>
                  <span className="text-center">Length</span>
                  <span className="text-right">Depth</span>
                </div>
              </div>
              <p className="sm:max-w-xs text-sm text-muted-foreground leading-relaxed">
                Almost every filter already says{" "}
                <strong className="text-foreground">Width × Length × Depth</strong> on
                the cardboard. Shop that printed size — not the slightly smaller
                number your tape will show.
              </p>
            </div>
          </div>

          <div
            id="how-to-measure"
            className="relative scroll-mt-40 rounded-2xl border border-border/80 bg-[linear-gradient(180deg,#fafbfc_0%,#eef1f6_100%)] p-4 pt-6 md:scroll-mt-32 md:p-6 md:pt-7"
          >
            <span className="absolute top-0 left-3 -translate-y-1/2 rounded-full bg-hero text-white text-[10px] md:text-xs font-bold tracking-[0.12em] uppercase px-3 py-1.5">
              If you do measure
            </span>
            <p className="text-center text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Tap a dimension. The yellow tape sits on that exact edge so Width,
              Length, and Depth cannot be mixed up.
            </p>
            <MeasureFilterDiagram
              active={activeDim}
              onActiveChange={setActiveDim}
              autoplay
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-lg md:text-xl font-bold mb-1 tracking-tight">
          Three edges, one order
        </h4>
        <p className="text-sm text-muted-foreground mb-5">
          Round to the nearest ¼ inch, then use the nominal size. Tap a step to
          pin the tape on that edge.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
          {STEPS.map((step) => {
            const isActive = activeDim === step.key;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveDim(step.key)}
                className={[
                  "relative rounded-2xl border p-5 text-left transition-all",
                  isActive
                    ? "border-ice bg-white shadow-md ring-2 ring-ice/40"
                    : "border-border/80 bg-white/80 hover:border-ice/50",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl mb-4 transition-colors",
                    isActive ? "bg-deep text-ice" : "bg-deep/90 text-ice/80",
                  ].join(" ")}
                >
                  {step.icon}
                </div>
                <span className="absolute top-4 right-4 text-3xl font-extrabold text-muted/80 leading-none">
                  {step.num}
                </span>
                <h5 className="font-bold text-base mb-2 tracking-tight">{step.title}</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                <span className="inline-block mt-4 text-[10px] font-bold tracking-[0.14em] uppercase text-primary bg-secondary px-2.5 py-1 rounded-full">
                  {step.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 md:gap-4">
        {NOTES.map((note) => (
          <div
            key={note.label}
            className={`relative overflow-hidden rounded-2xl ${note.tone} text-white p-5`}
          >
            <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-ice/20" />
            <p className="relative text-[10px] font-bold tracking-[0.18em] uppercase text-white/80 mb-2">
              {note.label}
            </p>
            <p className="relative text-xl md:text-2xl font-bold tracking-tight mb-2">
              {note.value}
            </p>
            <p className="relative text-sm text-white/85 leading-relaxed">{note.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

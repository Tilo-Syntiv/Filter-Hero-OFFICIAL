import type { PreferredMerv } from "@/lib/merv-pref";
import { MERV_GUIDE } from "@/lib/merv-guide";

const BASE = 7;
const STEP = 3;
const CARBON_ACCENT = "#111111";

export default function CaptureDots({
  merv,
  compact = false,
}: {
  merv: PreferredMerv;
  compact?: boolean;
}) {
  const filled = MERV_GUIDE[merv].strength;
  const accent = merv === "carbon" ? CARBON_ACCENT : MERV_GUIDE[merv].accent;
  const scale = compact ? 0.82 : 1;

  return (
    <div className="flex items-end justify-center gap-1.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i < filled;
        const size = (BASE + i * STEP) * scale;
        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: size,
              height: size,
              background: on ? accent : "transparent",
              border: `${1.5 * scale}px solid ${accent}`,
              opacity: on ? 1 : 0.28,
            }}
          />
        );
      })}
    </div>
  );
}

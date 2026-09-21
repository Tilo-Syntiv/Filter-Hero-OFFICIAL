import { useId, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import HowToMeasureGuide from "@/components/HowToMeasureGuide";
import FilterSizeDiagram from "@/components/FilterSizeDiagram";
import PopularSizesCarousel from "@/components/PopularSizesCarousel";
import { shopOrQuotePath } from "@/lib/filter-size";
import {
  finderLengths,
  finderWidths,
  THICKNESSES,
} from "@shared/products";
import { getPreferredMerv } from "@/lib/merv-pref";

interface FilterFinderProps {
  onSizeSelect?: (size: string) => void;
  showPopular?: boolean;
  compact?: boolean;
}

const WIDTHS = finderWidths().map(String);
const LENGTHS = finderLengths().map(String);
const DEPTHS = THICKNESSES.map(String);

export default function FilterFinder({
  onSizeSelect,
  showPopular = true,
  compact = false,
}: FilterFinderProps) {
  const [, setLocation] = useLocation();
  const [width, setWidth] = useState("20");
  const [length, setLength] = useState("25");
  const [depth, setDepth] = useState("1");
  const formId = useId();

  const goToSize = (size: string) => {
    if (onSizeSelect) {
      onSizeSelect(size);
      return;
    }
    const merv = getPreferredMerv();
    const mervQuery = merv ? `?merv=${merv}` : "";
    const dest = shopOrQuotePath(size);
    setLocation(dest.startsWith("/sizes/") ? `${dest}${mervQuery}` : dest);
  };

  const handleFind = () => {
    goToSize(`${width}x${length}x${depth}`);
  };

  return (
    <div className={compact ? "space-y-8" : "space-y-12"}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-2xl mx-auto"
      >
        <span className="section-label">Exact fit</span>
        <h2 className="text-2xl md:text-5xl font-bold mb-4 tracking-tight">
          Find your Filter Hero size
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          Measure{" "}
          <strong className="text-foreground font-semibold">Width</strong>,{" "}
          <strong className="text-foreground font-semibold">Length</strong>, and{" "}
          <strong className="text-foreground font-semibold">Depth</strong> — then
          enter those numbers below to shop your exact fit.
        </p>
      </motion.div>

      {!compact && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <HowToMeasureGuide />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className={
          compact
            ? "grid lg:grid-cols-2 gap-8 lg:gap-16 items-center surface-panel rounded-3xl p-4 sm:p-6 md:p-10"
            : "surface-panel rounded-3xl p-4 sm:p-6 md:p-10 max-w-3xl mx-auto"
        }
      >
        {compact && <FilterSizeDiagram />}

        <div>
          <p className="section-label mb-6">Width × Length × Depth</p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-8">
            <div className="space-y-2">
              <Label
                htmlFor={`${formId}-width`}
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Width
              </Label>
              <select
                id={`${formId}-width`}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="select-modern"
              >
                {WIDTHS.map((w) => (
                  <option key={w} value={w}>
                    {w}"
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`${formId}-length`}
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Length
              </Label>
              <select
                id={`${formId}-length`}
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="select-modern"
              >
                {LENGTHS.map((l) => (
                  <option key={l} value={l}>
                    {l}"
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`${formId}-depth`}
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Depth
              </Label>
              <select
                id={`${formId}-depth`}
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="select-modern"
              >
                {DEPTHS.map((d) => (
                  <option key={d} value={d}>
                    {d}"
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={handleFind} size="lg" className="hero-shop-btn w-full text-white">
            Find my size
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground mt-5 leading-relaxed">
            Use the nominal size printed on your cardboard frame (example: 20×25×1).
          </p>
        </div>
      </motion.div>

      {showPopular && <PopularSizesCarousel embedded />}
    </div>
  );
}

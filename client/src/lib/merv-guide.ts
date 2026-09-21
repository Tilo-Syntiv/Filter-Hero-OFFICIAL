import { Flame, HeartPulse, Home, PawPrint, type LucideIcon } from "lucide-react";
import type { PreferredMerv } from "@/lib/merv-pref";

export type MervGuide = {
  accent: string;
  icon: LucideIcon;
  bestFor: string;
  catches: string[];
  efficiency: string;
  strength: number;
  note: string;
  pickTitle: string;
  pickBlurb: string;
};

export const MERV_GUIDE: Record<PreferredMerv, MervGuide> = {
  "8": {
    accent: "#8eb0d8",
    icon: Home,
    bestFor: "Typical homes",
    catches: ["Household dust & lint", "Pollen", "Carpet fibers"],
    efficiency: "70%+ of 3–10 μm particles",
    strength: 1,
    note: "The workhorse rating. Everyday dust without extra strain on most systems.",
    pickTitle: "Everyday dust",
    pickBlurb: "Pollen, lint, household dust",
  },
  "11": {
    accent: "#e45a5f",
    icon: PawPrint,
    bestFor: "Pets & mild allergies",
    catches: ["Pet dander", "Mold spores", "Auto emissions"],
    efficiency: "85%+ of 3–10 μm · 65%+ of 1–3 μm",
    strength: 3,
    note: "The usual upgrade when fur, spring pollen, or city air is in the mix.",
    pickTitle: "Pets",
    pickBlurb: "Fur, dander, extra dust",
  },
  "13": {
    accent: "#ee9e10",
    icon: HeartPulse,
    bestFor: "Asthma & sensitivities",
    catches: ["Smoke & smog", "Bacteria-sized particles", "Fine droplets"],
    efficiency: "90%+ of 3–10 μm · 50%+ of 0.3–1 μm",
    strength: 5,
    note: "Hospital-adjacent capture for home HVAC — confirm the system can take the extra resistance.",
    pickTitle: "Allergies",
    pickBlurb: "Smoke, fine particles, asthma",
  },
  carbon: {
    accent: "#111111",
    icon: Flame,
    bestFor: "Cooking, pets & odors",
    catches: ["Cooking smells", "Pet odors", "VOCs & smoke smell"],
    efficiency: "MERV 8 capture + odor adsorption",
    strength: 1,
    note: "Activated carbon grabs gases that a pleat alone will not. Particle rating stays MERV 8.",
    pickTitle: "Cooking smells",
    pickBlurb: "Odors and smoke smell",
  },
};

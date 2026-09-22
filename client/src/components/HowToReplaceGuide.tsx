import type { ReactNode } from "react";
import { Eye, Fan, Lightbulb, Package, Power } from "lucide-react";
import { CHANGE_GUIDE_PATH } from "@shared/seo";
import { Link } from "wouter";

const STEPS: { num: string; title: string; body: string; icon: ReactNode }[] = [
  {
    num: "01",
    title: "Kill the system",
    body: "Set the thermostat to off. Do not let the blower pull while the slot is empty.",
    icon: <Power className="h-5 w-5" />,
  },
  {
    num: "02",
    title: "Find the slot",
    body: "Wall or ceiling return, or a rack on the furnace / air handler. Change every filter in the house.",
    icon: <Eye className="h-5 w-5" />,
  },
  {
    num: "03",
    title: "Read the frame",
    body: "Width × Length × Depth is printed on the cardboard. Note the airflow arrow — it points toward the equipment.",
    icon: <Package className="h-5 w-5" />,
  },
  {
    num: "04",
    title: "Light-test the old one",
    body: "Hold it to a lamp. Gray, torn, wet, or opaque? It does not go back in.",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    num: "05",
    title: "Seat the new one",
    body: "Arrow toward the furnace. Snug in the rack, no gaps. Restore power and feel a vent.",
    icon: <Fan className="h-5 w-5" />,
  },
];

export default function HowToReplaceGuide() {
  return (
    <div id="replace" className="scroll-mt-28 space-y-6">
      <div>
        <span className="section-label">How to replace</span>
        <h2 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
          Swap the filter in five moves
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Thermostat off, arrow toward the equipment, light-test the old one.
          Full walkthrough lives on the{" "}
          <Link
            href={CHANGE_GUIDE_PATH}
            className="font-semibold text-navy underline decoration-ice underline-offset-4 hover:text-hero"
          >
            change-date guide
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step) => (
          <article
            key={step.num}
            className="relative rounded-2xl border border-border/80 bg-white/85 p-5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-deep-fill text-ice">
              {step.icon}
            </div>
            <span className="absolute right-4 top-4 text-3xl font-extrabold leading-none text-muted/80">
              {step.num}
            </span>
            <h3 className="mb-2 text-base font-bold tracking-tight">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LIFE, type LifePhoto } from "@/data/life-photos";
import LifeImage from "@/components/LifeImage";
import { scrollToHashTarget } from "@/hooks/useHashScroll";
import { setPreferredMerv, type PreferredMerv } from "@/lib/merv-pref";

const STORIES: {
  merv: PreferredMerv;
  photo: LifePhoto;
  inset: LifePhoto;
  label: string;
  title: string;
  body: string;
  cta: string;
}[] = [
  {
    merv: "13",
    photo: LIFE.sickNebulizer,
    inset: LIFE.sickSisters,
    label: "Kids & asthma",
    title: "When a cough starts at home",
    body: "Pollen, dust, and smoke-sized particles recirculate until a tighter filter catches them. MERV 13 is the usual pick for asthma, allergies, and kids who get sick indoors.",
    cta: "Shop MERV 13",
  },
  {
    merv: "11",
    photo: LIFE.petsSleep,
    inset: LIFE.catDander,
    label: "Pets",
    title: "Fur, dander, and a pack on the couch",
    body: "Dogs and cats load a filter faster than a quiet house. MERV 11 is the upgrade when there's fur on the vents and someone in the family is sniffly.",
    cta: "Shop MERV 11",
  },
  {
    merv: "8",
    photo: LIFE.carpetClean,
    inset: LIFE.familyKitchen,
    label: "Everyday home",
    title: "Dust, lint, and a house that stays busy",
    body: "Most homes just need a honest workhorse. MERV 8 catches household dust and pollen without extra strain on older furnaces.",
    cta: "Shop MERV 8",
  },
];

function shopMerv(key: PreferredMerv) {
  setPreferredMerv(key);
  const onHome =
    window.location.pathname === "/" || window.location.pathname === "";
  if (onHome) {
    window.history.replaceState(null, "", "/#finder");
    scrollToHashTarget("finder");
    return;
  }
  window.location.assign("/#finder");
}

export default function FamilyAirSection() {
  return (
    <section id="family" className="brand-band scroll-mt-28 py-16 md:py-24">
      <div className="container">
        <div className="mb-8 grid items-end gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="section-label">Who you're protecting</span>
            <h2 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
              Clean air for the people — and pets — you live with.
            </h2>
            <p className="max-w-xl text-white/65 leading-relaxed md:text-lg">
              A filter isn't a box on a shelf. It's the air kids breathe during
              a cold, the dander that settles on the couch, and the dust that
              films the house when the media is spent.
            </p>
          </div>
          <p className="lg:col-span-5 lg:text-right text-sm text-white/65 leading-relaxed">
            Pick the house you actually have. Then we'll match MERV and a change
            date.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STORIES.map((story, i) => (
            <motion.article
              key={story.merv}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="life-story"
            >
              <div className="relative mb-2">
                <LifeImage
                  photo={story.photo}
                  className="aspect-[16/10] rounded-t-[1.1rem]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <LifeImage
                  photo={story.inset}
                  className="life-story-inset"
                  sizes="120px"
                />
              </div>
              <div className="p-5">
                <p className="section-label !mb-2">{story.label}</p>
                <h3 className="mb-2 text-xl font-bold tracking-tight">
                  {story.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {story.body}
                </p>
                <button
                  type="button"
                  onClick={() => shopMerv(story.merv)}
                  className="section-link"
                >
                  {story.cta} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        <LifeImage
          photo={LIFE.petsLineup}
          className="mt-8 h-24 rounded-2xl sm:h-28 md:h-32"
          imgClassName="object-contain bg-white"
          sizes="(max-width: 1200px) 100vw, 1120px"
        />
        <p className="mt-3 text-center text-sm text-white/65">
          Pets load a filter faster. Tell the Filter Clock how many you have —
          it pulls the change date closer.
        </p>
      </div>
    </section>
  );
}

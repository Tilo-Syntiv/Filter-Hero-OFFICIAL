import type { CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { HVAC_BRAND_LIST } from "@shared/hvac-brands";
import { MERV_TYPES, isMervKeyOnSale } from "@shared/products";
import { setPreferredMerv, type PreferredMerv } from "@/lib/merv-pref";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

const ASSET = "?v=fh244";
const LOCKUP_MASCOT = "/hero/lockup-mascot.png?v=fh249";

const COMPAT = [
  { slug: "trane", name: "Trane" },
  { slug: "carrier", name: "Carrier" },
  { slug: "rheem", name: "Rheem" },
  { slug: "goodman", name: "Goodman" },
  { slug: "lennox", name: "Lennox" },
] as const;

const SHOWCASE: {
  src: string;
  merv: PreferredMerv;
  grade: string;
  kicker: string;
  use: string;
  className: string;
  alt: string;
}[] = [
  {
    src: `/hero/pack-merv8.png${ASSET}`,
    merv: "8",
    grade: "8",
    kicker: "MERV",
    use: "Dust",
    className: "hero-product hero-product-merv8",
    alt: "Filter Hero MERV 8 standard air filter",
  },
  {
    src: `/hero/showcase-carbon.png${ASSET}`,
    merv: "carbon",
    grade: "C",
    kicker: "Carbon",
    use: "Odors",
    className: "hero-product hero-product-carbon",
    alt: "Filter Hero carbon odor-eliminator air filter",
  },
  {
    src: `/hero/pack-merv11.png${ASSET}`,
    merv: "11",
    grade: "11",
    kicker: "MERV",
    use: "Pets",
    className: "hero-product hero-product-merv11",
    alt: "Filter Hero MERV 11 advanced air filter",
  },
  {
    src: `/hero/pack-merv13.png${ASSET}`,
    merv: "13",
    grade: "13",
    kicker: "MERV",
    use: "Allergies",
    className: "hero-product hero-product-merv13",
    alt: "Filter Hero MERV 13 superior air filter",
  },
];

function BrandMarks({ compact }: { compact?: boolean }) {
  return (
    <>
      {COMPAT.map((brand) => (
        <Link
          key={brand.slug}
          href={`/brands/${brand.slug}`}
          className="hero-compat-mark"
          aria-label={`Shop ${brand.name} filter sizes`}
        >
          <BrandLogo
            slug={brand.slug}
            name={brand.name}
            className={compact ? "h-6 w-auto max-w-[4.75rem]" : "h-7 w-auto max-w-[5.75rem]"}
          />
        </Link>
      ))}
    </>
  );
}

export default function Hero() {
  const [, setLocation] = useLocation();
  const brandCount = HVAC_BRAND_LIST.length;
  const { heroKicker, heroLede } = useSiteConfig();

  return (
    <section className="hero-stage hero-cast-stage">
      <div className="hero-atmosphere" aria-hidden>
        <div className="hero-orb hero-orb-ice" />
        <div className="hero-orb hero-orb-red" />
      </div>

      <div className="hero-cast">
        <div className="hero-copy">
          <motion.div
            initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="hero-lockup">
              <span className="hero-lockup-filter">Filter</span>
              <span className="hero-lockup-hero">
                <span>Hero</span>
                <span className="hero-lockup-mascot" aria-hidden>
                  <img
                    src={LOCKUP_MASCOT}
                    alt=""
                    width={522}
                    height={348}
                    decoding="async"
                    draggable={false}
                  />
                </span>
              </span>
            </p>
            <p className="hero-kicker">
              <span className="hero-live-dot" aria-hidden />
              {heroKicker}
            </p>
            <h1 className="hero-title">
              The first line
              <em>of defense</em>
              <span className="hero-title-rest">
                for your <em>indoor air.</em>
              </span>
            </h1>
            <p className="seo-answer hero-lede">{heroLede}</p>
            <div className="hero-actions">
              <Button
                size="lg"
                className="hero-shop-btn hero-shop-btn-glow w-full text-white sm:w-auto"
                onClick={() => setLocation("/sizes")}
              >
                Find your filter size
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="hero-ghost-btn w-full sm:w-auto"
                onClick={() => setLocation("/how-often-to-change-air-filter")}
              >
                Start your clock
              </Button>
            </div>
            <div className="hero-compat hero-compat-mobile">
              <p className="hero-compat-label">
                Fits {COMPAT[0].name}, {COMPAT[1].name}, {COMPAT[2].name}
                {" + "}
                {brandCount} brands
              </p>
              <div className="hero-compat-row">
                <BrandMarks />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="hero-art">
          <div className="hero-glow" aria-hidden />
          <div className="hero-showcase">
            <div className="hero-lineup">
              <div className="hero-ground" aria-hidden />
              <div className="hero-pack-row">
                {SHOWCASE.map((item) => {
                  const type = MERV_TYPES.find((t) => t.key === item.merv) ?? MERV_TYPES[0];
                  const onSale = isMervKeyOnSale(item.merv);
                  const href = onSale
                    ? `/sizes/20x25x1?merv=${item.merv}`
                    : "/custom-air-filters";
                  return (
                    <div key={item.merv} className={item.className}>
                      <Link
                        href={href}
                        className="hero-product-link"
                        onClick={() => {
                          if (onSale) setPreferredMerv(item.merv);
                        }}
                      >
                        <img
                          src={item.src}
                          alt={item.alt}
                          width={508}
                          height={834}
                          decoding="async"
                        />
                        <span
                          className={
                            item.merv === "carbon"
                              ? "hero-pack-ticket hero-pack-ticket-carbon"
                              : "hero-pack-ticket"
                          }
                          style={{ "--ticket": type.badgeColor } as CSSProperties}
                        >
                          <span className="hero-pack-ticket-grade">{item.grade}</span>
                          <span className="hero-pack-ticket-copy">
                            <span className="hero-pack-ticket-kicker">{item.kicker}</span>
                            <span className="hero-pack-ticket-use">{item.use}</span>
                            <span className="hero-pack-ticket-price">
                              ${type.fromPrice.toFixed(2)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
              <div className="hero-brands">
                <p className="hero-brands-label">
                  Guaranteed to fit <strong>30+ major brands</strong> and we
                  can customize them
                </p>
                <div className="hero-brands-row">
                  {COMPAT.map((brand) => (
                    <Link
                      key={brand.slug}
                      href={`/brands/${brand.slug}`}
                      className="hero-compat-mark"
                      aria-label={`Shop ${brand.name} filter sizes`}
                    >
                      <BrandLogo
                        slug={brand.slug}
                        name={brand.name}
                        className="h-9 w-auto max-w-[6.75rem]"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

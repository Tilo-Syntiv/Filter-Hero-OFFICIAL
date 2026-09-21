import { useEffect, useMemo, useRef, useState } from "react";
import { useHashScroll } from "@/hooks/useHashScroll";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { THICKNESSES } from "@shared/products";
import { HVAC_BRAND_LIST, featuredBrandFamilies } from "@shared/hvac-brands";
import {
  SITE_FAQS,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildHowToMeasureSchema,
  buildOnlineStoreSchema,
  buildOrganizationSchema,
  buildSpeakableSchema,
  buildWebSiteSchema,
  homeSeo,
} from "@shared/seo";
import { BRAND_EMAIL, BRAND_NAME } from "@/const";
import { Button } from "@/components/ui/button";
import FilterFinder from "@/components/FilterFinder";
import TrustSection from "@/components/TrustSection";
import TrustMarquee from "@/components/TrustMarquee";
import OverdueCostsBand from "@/components/OverdueCostsBand";
import SizeDirectory from "@/components/SizeDirectory";
import MervCarousel from "@/components/MervCarousel";
import DeliverySection from "@/components/DeliverySection";
import ContactForm from "@/components/ContactForm";
import CartDrawer from "@/components/CartDrawer";
import SiteHeader from "@/components/SiteHeader";
import BrandLockup from "@/components/BrandLockup";
import Hero from "@/components/Hero";
import FaqSection from "@/components/FaqSection";
import FilterPower from "@/components/FilterPower";
import FamilyAirSection from "@/components/FamilyAirSection";
import { BrandFamilyGrid } from "@/components/BrandDirectory";
import { LIFE } from "@/data/life-photos";
import { useCart } from "@/contexts/CartContext";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { takeQuoteHandoff } from "@/lib/quote-handoff";
import { getSiteUrl, useSeo } from "@/hooks/useSeo";

export default function Home() {
  useHashScroll();
  const { cartSummaryText } = useCart();
  const { faqsForStore } = useSiteConfig();
  const [quoteSize, setQuoteSize] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteCartSummary, setQuoteCartSummary] = useState("");
  const contactRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handed = takeQuoteHandoff();
    if (handed.size) setQuoteSize(handed.size);
    if (handed.message) setQuoteMessage(handed.message);
    if (handed.cart) setQuoteCartSummary(handed.cart);
    const size = new URLSearchParams(window.location.search).get("size");
    if (size) setQuoteSize(size);
  }, []);

  const siteUrl = getSiteUrl();
  const seo = homeSeo(siteUrl);
  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(siteUrl),
      buildOnlineStoreSchema(siteUrl),
      buildWebSiteSchema(siteUrl),
      buildFaqSchema(faqsForStore.length ? faqsForStore : SITE_FAQS),
      buildHowToMeasureSchema(siteUrl),
      buildSpeakableSchema(siteUrl, [
        ".seo-answer",
        ".seo-speakable-q",
        ".seo-speakable-a",
        "#faq-heading",
      ], { path: "/", name: BRAND_NAME }),
      buildBreadcrumbSchema(siteUrl, [{ name: "Home", path: "/" }]),
    ],
    [siteUrl, faqsForStore],
  );
  useSeo({ ...seo, jsonLd });

  const scrollToContact = (opts?: {
    size?: string;
    message?: string;
    withCart?: boolean;
  }) => {
    if (opts?.size) setQuoteSize(opts.size);
    if (opts?.message) setQuoteMessage(opts.message);
    setQuoteCartSummary(opts?.withCart ? cartSummaryText() : "");
    contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="home-lock">
      <SiteHeader />
      <div className="home-first">
        <Hero />
        <TrustMarquee />
      </div>

      <div className="home-lock-rest">

      <main>
        <section
          id="finder"
          className="sheet-section pt-16 md:pt-24 pb-10 md:pb-12 scroll-mt-28 -mt-6 relative z-10"
        >
          <div className="container">
            <FilterFinder showPopular={false} />
          </div>
        </section>

        <FamilyAirSection />

        <section
          id="clock"
          className="sheet-section scroll-mt-28 py-12 md:py-16"
        >
          <div className="container">
            <div className="mb-8 max-w-2xl">
              <span className="section-label">Filter Clock</span>
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                When's your next filter change?
              </h2>
              <p className="text-muted-foreground leading-relaxed md:text-lg">
                Pets, kids, allergies, and a fan that never shuts off pull the
                date closer. Tell us about the house. We'll give you the date.
              </p>
            </div>
            <FilterPower />
          </div>
        </section>

        <OverdueCostsBand />

        <div className="sheet-section">
          <SizeDirectory />
        </div>

        <MervCarousel />

        <DeliverySection />

        <section
          id="brands"
          className="brand-band py-16 md:py-24 scroll-mt-28"
          aria-labelledby="brands-heading"
        >
          <div className="container relative">
            <div className="mb-10 flex flex-col gap-5 md:mb-12 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <span className="section-label">System match</span>
                <h2
                  id="brands-heading"
                  className="mb-3 text-3xl font-bold tracking-tight text-white md:text-4xl"
                >
                  Shop by HVAC brand
                </h2>
                <p className="text-base leading-relaxed text-white/75 md:text-lg">
                  Exact-fit replacements for {HVAC_BRAND_LIST.length} HVAC brands.
                  Same Width × Length × Depth as the original media.
                </p>
              </div>
              <Link href="/brands" className="section-link">
                See all brands
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <BrandFamilyGrid families={featuredBrandFamilies()} />
          </div>
        </section>

        <div className="sheet-section">
          <TrustSection />
        </div>

        <div className="sheet-section">
          <FaqSection faqs={faqsForStore.length ? faqsForStore : SITE_FAQS} />
        </div>

        <section className="brand-band cta-photo-band py-20 md:py-28 relative overflow-hidden">
          <img
            src={LIFE.filterHold.src}
            alt=""
            width={LIFE.filterHold.width}
            height={LIFE.filterHold.height}
            decoding="async"
            className="cta-photo-img"
          />
          <div className="container relative text-center">
            <span className="section-label">Need a match</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Can't read the label?
            </h2>
            <p className="text-base md:text-lg text-white/70 mb-8 max-w-xl mx-auto leading-relaxed">
              Send a photo of the label on your current filter — we’ll match it for
              you.
            </p>
            <Button
              size="lg"
              className="hero-shop-btn w-full text-white sm:w-auto"
              onClick={() =>
                scrollToContact({
                  message:
                    "I need help identifying my filter size. Here's what I know…",
                })
              }
            >
              Get size help
            </Button>
          </div>
        </section>

        <section
          id="contact"
          ref={contactRef}
          className="sheet-section py-16 md:py-24 scroll-mt-28"
        >
          <div className="container max-w-xl">
            <span className="section-label">Real support</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Contact Filter Hero</h2>
            <p className="text-muted-foreground mb-10 leading-relaxed">
              Questions about size, MERV, or an order — we’ll respond promptly.
            </p>
            <div className="surface-panel rounded-2xl p-4 sm:p-6 md:p-8">
              <ContactForm
                defaultSize={quoteSize}
                defaultMessage={quoteMessage}
                cartSummary={quoteCartSummary}
                intent="support"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer pt-14">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 mb-12">
            <div className="col-span-2 md:col-span-5">
              <BrandLockup tone="footer" className="mb-5" />
              <p className="text-sm leading-relaxed max-w-xs">
                Precise HVAC filters for the people and pets under your roof.
                Find your exact size and order with confidence.
              </p>
              <p className="text-sm mt-4 text-ice/90">{BRAND_EMAIL}</p>
            </div>
            <div className="md:col-span-3">
              <h4 className="font-bold text-white mb-4 text-sm tracking-wide uppercase">
                Shop
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#finder" className="hover:text-ice transition-colors">
                    Find size
                  </a>
                </li>
                <li>
                  <Link href="/sizes" className="hover:text-ice transition-colors">
                    All sizes
                  </Link>
                </li>
                <li>
                  <Link href="/brands" className="hover:text-ice transition-colors">
                    Shop by brand
                  </Link>
                </li>
                {THICKNESSES.map((d) => (
                  <li key={d}>
                    <Link
                      href={`/filters/${d}-inch`}
                      className="hover:text-ice transition-colors"
                    >
                      {d}" filters
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/custom-air-filters"
                    className="hover:text-ice transition-colors"
                  >
                    Custom Air Filters
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-4">
              <h4 className="font-bold text-white mb-4 text-sm tracking-wide uppercase">
                Support
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#clock" className="hover:text-ice transition-colors">
                    Filter Clock
                  </a>
                </li>
                <li>
                  <Link
                    href="/how-often-to-change-air-filter"
                    className="hover:text-ice transition-colors"
                  >
                    When to change your filter
                  </Link>
                </li>
                <li>
                  <a href="#delivery" className="hover:text-ice transition-colors">
                    2–3 day delivery
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-ice transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-ice transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-xs">
            <p>
              &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>

      <CartDrawer
        onRequestQuote={() => {
          const handed = takeQuoteHandoff();
          scrollToContact({
            size: handed.size,
            message: handed.message,
            withCart: true,
          });
        }}
      />
    </div>
  );
}

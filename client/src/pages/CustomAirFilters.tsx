import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import CustomQuoteForm from "@/components/CustomQuoteForm";
import FaqSection from "@/components/FaqSection";
import PageHero from "@/components/PageHero";
import ProductOverduePanel from "@/components/ProductOverduePanel";
import { getSiteUrl, useSeo } from "@/hooks/useSeo";
import { useHashScroll } from "@/hooks/useHashScroll";
import { takeQuoteHandoff } from "@/lib/quote-handoff";
import { BRAND_NAME } from "@/const";
import {
  CUSTOM_FAQS,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildSpeakableSchema,
  customAirFiltersSeo,
} from "@shared/seo";
import { LIFE } from "@/data/life-photos";

export default function CustomAirFiltersPage() {
  const siteUrl = getSiteUrl();
  const seo = customAirFiltersSeo(siteUrl);
  const [quoteCart, setQuoteCart] = useState("");
  const [quoteSize, setQuoteSize] = useState("");
  const search = useSearch();
  useHashScroll();

  useSeo({
    ...seo,
    jsonLd: [
      buildBreadcrumbSchema(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Custom air filters", path: "/custom-air-filters" },
      ]),
      buildFaqSchema(CUSTOM_FAQS),
      buildSpeakableSchema(siteUrl, [
        ".seo-answer",
        ".seo-speakable-q",
        ".seo-speakable-a",
      ]),
    ],
  });

  useEffect(() => {
    const handed = takeQuoteHandoff();
    if (handed.cart) setQuoteCart(handed.cart);
    if (handed.size) setQuoteSize(handed.size);
  }, []);

  useEffect(() => {
    const size = new URLSearchParams(search).get("size");
    if (size) setQuoteSize(size);
  }, [search]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PageHero
        label="Odd size"
        title="Custom Air Filters"
        photo={LIFE.installCeiling}
        crumbs={[{ href: "/", label: "Home" }]}
      >
        If your slot is not a standard catalog size, enter Width × Length ×
        Depth below. We cut custom HVAC filters to your measurements and send
        back a quote.
      </PageHero>
      <main className="sheet-section">
        <div className="container py-10 md:py-14">
        <div className="mb-10 max-w-xl">
          <ProductOverduePanel tone="sheet" />
        </div>
        <div
          id="custom-quote"
          className="max-w-xl mb-16 scroll-mt-28 overflow-hidden rounded-3xl border border-border bg-white p-4 sm:p-6 md:p-8 shadow-[0_24px_50px_rgba(20,30,48,0.08)]"
        >
          <h2 className="text-xl font-bold mb-1 tracking-tight">Request a custom quote</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Fill in your size. We’ll confirm fit, MERV options, and lead time.
          </p>
          <CustomQuoteForm cartSummary={quoteCart} defaultSize={quoteSize} />
        </div>
        <FaqSection
          faqs={CUSTOM_FAQS}
          title="Custom size questions"
          subtitle="How custom HVAC filter quotes work."
        />
        </div>
      </main>
      <footer className="site-footer pt-8 mt-12">
        <div className="container flex flex-col sm:flex-row justify-between gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} {BRAND_NAME}</p>
          <Link href="/" className="section-link !text-ice hover:!text-white">
            Home
          </Link>
        </div>
      </footer>
      <CartDrawer
        onRequestQuote={() => {
          const handed = takeQuoteHandoff();
          if (handed.cart) setQuoteCart(handed.cart);
          document.getElementById("custom-quote")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      />
    </div>
  );
}

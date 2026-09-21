import { useMemo } from "react";
import { Link } from "wouter";
import {
  getHvacBrand,
  HVAC_BRAND_LIST,
} from "@shared/hvac-brands";
import { shopOrQuotePath } from "@/lib/filter-size";
import BrandLogo from "@/components/BrandLogo";
import {
  allBrandsSeo,
  brandSeo,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildSpeakableSchema,
} from "@shared/seo";
import SiteHeader from "@/components/SiteHeader";
import BrandDirectory from "@/components/BrandDirectory";
import CartDrawer from "@/components/CartDrawer";
import FilterFinder from "@/components/FilterFinder";
import PageHero from "@/components/PageHero";
import ProductOverduePanel from "@/components/ProductOverduePanel";
import { getSiteUrl, useSeo } from "@/hooks/useSeo";
import { BRAND_NAME } from "@/const";
import { LIFE } from "@/data/life-photos";

function SiteFooter() {
  return (
    <footer className="site-footer pt-8 mt-12">
      <div className="container flex flex-col sm:flex-row justify-between gap-4 text-sm">
        <p>&copy; {new Date().getFullYear()} {BRAND_NAME}</p>
        <Link href="/" className="section-link !text-ice hover:!text-white">
          Home
        </Link>
      </div>
    </footer>
  );
}

export function AllBrandsPage() {
  const siteUrl = getSiteUrl();
  const seo = allBrandsSeo(siteUrl);
  const jsonLd = useMemo(
    () => [
      buildBreadcrumbSchema(siteUrl, [
        { name: "Home", path: "/" },
        { name: "Shop by brand", path: "/brands" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "HVAC filter brands",
        numberOfItems: HVAC_BRAND_LIST.length,
        itemListElement: HVAC_BRAND_LIST.slice(0, 50).map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          url: `${siteUrl}/brands/${b.slug}`,
        })),
      },
    ],
    [siteUrl],
  );
  useSeo({ ...seo, jsonLd });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PageHero
        label="System match"
        title="Shop by HVAC brand"
        photo={LIFE.familyKitchen}
      >
        {BRAND_NAME} sells exact-fit replacement filters for major HVAC brands.
        These are {BRAND_NAME} pleated filters (MERV 8, 11, and 13)
        made to the same Width × Length × Depth as the OEM media — not
        third-party boxed retail brands. Carbon and other sizes can be quoted.
      </PageHero>
      <main className="sheet-section">
        <div className="container py-10 md:py-14">
          <BrandDirectory compact />
        </div>
      </main>
      <SiteFooter />
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

export function BrandDetailPage({ slug }: { slug: string }) {
  const brand = getHvacBrand(slug);
  const siteUrl = getSiteUrl();
  const seo = brandSeo(siteUrl, brand?.name ?? slug, slug);
  const faqs = useMemo(
    () => [
      {
        question: `Do you sell genuine ${brand?.name ?? slug} filters?`,
        answer: `We sell ${BRAND_NAME} replacement filters sized for ${brand?.name ?? "this"} HVAC systems. They are built to the OEM slot dimensions so they drop in like the original media, in MERV 8, MERV 8 Carbon, 11, and 13. Other sizes can be quoted.`,
      },
      {
        question: `How do I find the right ${brand?.name ?? ""} filter?`,
        answer:
          "Match the size printed on your current filter, or look up your HVAC model number or OEM part number on this page. If you do not see your size, request a custom quote.",
      },
    ],
    [brand, slug],
  );
  const jsonLd = useMemo(
    () =>
      brand
        ? [
            buildBreadcrumbSchema(siteUrl, [
              { name: "Home", path: "/" },
              { name: "Shop by brand", path: "/brands" },
              { name: brand.name, path: `/brands/${brand.slug}` },
            ]),
            buildFaqSchema(faqs),
            buildSpeakableSchema(siteUrl, [".seo-answer"], {
              path: seo.path,
              name: seo.title,
            }),
          ]
        : [],
    [siteUrl, brand, faqs, seo.path, seo.title],
  );
  useSeo({
    ...seo,
    title: brand ? seo.title : `Brand not found | ${BRAND_NAME}`,
    noindex: !brand,
    jsonLd,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {!brand ? (
        <main className="sheet-section">
          <div className="container py-10 md:py-14">
            <h1 className="text-3xl font-bold mb-4">Brand not found</h1>
            <Link href="/brands" className="text-primary font-semibold">
              Browse all brands
            </Link>
          </div>
        </main>
      ) : (
        <>
          <PageHero
            label="System match"
            title={`${brand.name} air filters`}
            photo={LIFE.installCeilingMan}
            crumbs={[
              { href: "/", label: "Home" },
              { href: "/brands", label: "Shop by brand" },
            ]}
            mark={
              <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl bg-white px-3">
                <BrandLogo slug={brand.slug} name={brand.name} className="h-10 w-full" />
              </div>
            }
          >
            Shop {BRAND_NAME} replacement filters for {brand.name} systems.
            Same slot size as the OEM media. Choose MERV 8, 11, or 13
            on the size page when that rating is in stock.
          </PageHero>
          <main className="sheet-section">
            <div className="container py-10 md:py-14">
            <div className="mb-10">
              <ProductOverduePanel tone="sheet" />
            </div>
            {brand.sizes.length > 0 ? (
              <>
                <h2 className="text-xl font-bold mb-3 tracking-tight">Shop by size</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
                  {brand.sizes.map((s) => (
                      <Link
                        key={s}
                        href={shopOrQuotePath(s)}
                        className="size-chip !py-3"
                      >
                        {s}
                      </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Use the size finder or a model / OEM part number. If your{" "}
                {brand.name} slot is not listed, we can quote a custom filter.
              </p>
            )}

            {brand.models.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-3 tracking-tight">Shop by HVAC model number</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-10">
                  {brand.models.map((m) => (
                    <Link
                      key={m.code}
                      href={shopOrQuotePath(m.size)}
                        className="catalog-row"
                    >
                      <span className="font-semibold">{m.code}</span>
                      <span className="text-muted-foreground"> → {m.size}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {brand.oemParts.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-3 tracking-tight">Shop by OEM part number</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-10">
                  {brand.oemParts.map((p) => (
                    <Link
                      key={p.code}
                      href={shopOrQuotePath(p.size)}
                        className="catalog-row"
                    >
                      <span className="font-semibold">{p.code}</span>
                      <span className="text-muted-foreground"> → {p.size}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="mt-8">
              <FilterFinder showPopular compact />
            </div>
            </div>
          </main>
        </>
      )}
      <SiteFooter />
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

import { useMemo } from "react";
import { Link } from "wouter";
import { THICKNESSES, getSizesByThickness } from "@shared/products";
import {
  allSizesSeo,
  buildBreadcrumbSchema,
  buildItemListSchema,
  thicknessSeo,
} from "@shared/seo";
import SiteHeader from "@/components/SiteHeader";
import SizeDirectory from "@/components/SizeDirectory";
import CartDrawer from "@/components/CartDrawer";
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

export function AllSizesPage() {
  const siteUrl = getSiteUrl();
  const seo = allSizesSeo(siteUrl);
  const allSizes = useMemo(
    () => THICKNESSES.flatMap((d) => getSizesByThickness(d)),
    [],
  );
  const jsonLd = useMemo(
    () => [
      buildBreadcrumbSchema(siteUrl, [
        { name: "Home", path: "/" },
        { name: "All sizes", path: "/sizes" },
      ]),
      buildItemListSchema(siteUrl, "All HVAC air filter sizes", "/sizes", allSizes),
    ],
    [siteUrl, allSizes],
  );
  useSeo({ ...seo, jsonLd });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PageHero
        label="Size catalog"
        title="Every Filter Hero size"
        photo={LIFE.installWall}
      >
        Browse every HVAC size in the catalog. Pick a
        whole-inch width to narrow the list, or browse all sizes.{" "}
        {allSizes.length} sizes in the catalog. Odd sizes not listed can be quoted.
      </PageHero>
      <main className="sheet-section">
        <div className="container py-10 md:py-14 space-y-10">
          <ProductOverduePanel tone="sheet" />
          <SizeDirectory compact />
        </div>
      </main>
      <SiteFooter />
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

export function ThicknessHubPage({ depth }: { depth: number }) {
  const valid = (THICKNESSES as readonly number[]).includes(depth);
  const sizes = valid ? getSizesByThickness(depth) : [];
  const siteUrl = getSiteUrl();
  const seo = thicknessSeo(siteUrl, valid ? depth : 1);
  const jsonLd = useMemo(
    () =>
      valid
        ? [
            buildBreadcrumbSchema(siteUrl, [
              { name: "Home", path: "/" },
              { name: "All sizes", path: "/sizes" },
              { name: `${depth}" filters`, path: `/filters/${depth}-inch` },
            ]),
            buildItemListSchema(
              siteUrl,
              `${depth}" air filters`,
              `/filters/${depth}-inch`,
              sizes,
            ),
          ]
        : [],
    [siteUrl, depth, valid, sizes],
  );
  useSeo({
    ...seo,
    title: valid ? seo.title : `Thickness not found | ${BRAND_NAME}`,
    noindex: !valid,
    jsonLd,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {!valid ? (
        <main className="sheet-section">
          <div className="container py-10 md:py-14">
            <h1 className="text-3xl font-bold mb-4">Thickness not found</h1>
            <Link href="/sizes" className="text-primary font-semibold">
              Browse all sizes
            </Link>
          </div>
        </main>
      ) : (
        <>
          <PageHero
            label="Depth first"
            title={`${depth}" depth air filters`}
            photo={LIFE.filterSwap}
            crumbs={[
              { href: "/", label: "Home" },
              { href: "/sizes", label: "All sizes" },
            ]}
          >
            Shop {depth}-inch depth HVAC and furnace air filters. Pick a
            whole-inch width to narrow the list, or browse every length at this
            depth. MERV ratings vary by size — carbon and other sizes can be
            quoted.
          </PageHero>
          <main className="sheet-section">
            <div className="container py-10 md:py-14 space-y-10">
              <ProductOverduePanel tone="sheet" />
              <SizeDirectory
                depth={depth}
                heading={`${depth}" filters`}
                compact
              />
            </div>
          </main>
        </>
      )}
      <SiteFooter />
      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

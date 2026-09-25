import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Crosshair,
  Layers,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wind,
} from "lucide-react";
import {
  AUTO_DELIVERY_INTERVALS,
  MERV_TYPES,
  PACK_QTYS,
  PACK_TIERS,
  deliveryLabel,
  findProductVariant,
  getFilterSize,
  mervTypesForDisplay,
  mervTypesForSize,
  productGalleryFor,
  packShotSrc,
  sellableMervPhrase,
  shopperUnitPrice,
  unitPriceForQty,
  type DeliveryMode,
  type Product,
} from "@shared/products";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildProductSchema,
  buildSpeakableSchema,
  CHANGE_GUIDE_PATH,
  sizeSeo,
  type FaqItem,
} from "@shared/seo";
import CaptureDots from "@/components/CaptureDots";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import FilterFinder from "@/components/FilterFinder";
import HowToMeasureGuide from "@/components/HowToMeasureGuide";
import HowToReplaceGuide from "@/components/HowToReplaceGuide";
import FaqSection from "@/components/FaqSection";
import LifeImage from "@/components/LifeImage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStock } from "@/contexts/StockContext";
import BackInStockForm from "@/components/BackInStockForm";
import { useCart } from "@/contexts/CartContext";
import { getSiteUrl, useSeo } from "@/hooks/useSeo";
import { BRAND_NAME } from "@/const";
import { brandsForSize } from "@shared/hvac-brands";
import { MERV_CAPACITY_NOTE, MERV_CAPACITY_SHORT } from "@shared/merv-capacity";
import ProductOverduePanel from "@/components/ProductOverduePanel";
import BrandLogo from "@/components/BrandLogo";
import { LIFE } from "@/data/life-photos";
import { MERV_GUIDE } from "@/lib/merv-guide";
import { trackSelectedMerv, trackViewedProduct, trackViewedSize } from "@/lib/klaviyo";
import {
  getPreferredMerv,
  getPowerPackQty,
  isPreferredMerv,
  setPreferredMerv,
  type PreferredMerv,
} from "@/lib/merv-pref";

type SizeDetailPageProps = {
  sizeSlug: string;
};

export default function SizeDetailPage({ sizeSlug }: SizeDetailPageProps) {
  const decoded = decodeURIComponent(sizeSlug);
  const { count: stockCount } = useStock();
  const sizeMeta = getFilterSize(decoded);
  const { addItem } = useCart();
  const availableTypes = useMemo(
    () => (getFilterSize(decoded) ? mervTypesForDisplay() : mervTypesForSize(decoded)),
    [decoded, stockCount],
  );
  const mervOptions = sellableMervPhrase(decoded);

  const qtyMin = PACK_QTYS[0];
  const qtyMax = PACK_QTYS[PACK_QTYS.length - 1];
  const [mervKey, setMervKey] = useState<PreferredMerv>(
    () => (availableTypes[0]?.key as PreferredMerv) ?? "8",
  );
  const [hoverKey, setHoverKey] = useState<PreferredMerv | null>(null);
  const [qty, setQty] = useState(6);
  const [shot, setShot] = useState(0);
  const [delivery, setDelivery] = useState<DeliveryMode>("once");
  const pickQty = (n: number) => setQty(Math.min(qtyMax, Math.max(qtyMin, n)));

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("merv");
    const preferred = isPreferredMerv(fromUrl) ? fromUrl : getPreferredMerv();
    const keys = availableTypes.map((t) => t.key);
    const next =
      preferred && keys.includes(preferred)
        ? preferred
        : (availableTypes[0]?.key as PreferredMerv | undefined);
    if (next) setMervKey(next);
    const pack = getPowerPackQty();
    if (pack) setQty(Math.min(qtyMax, Math.max(qtyMin, pack)));
  }, [availableTypes]);

  const pickMerv = (key: PreferredMerv) => {
    setMervKey(key);
    setPreferredMerv(key);
    trackSelectedMerv(key);
  };

  const selectedType =
    availableTypes.find((t) => t.key === mervKey) ?? availableTypes[0] ?? MERV_TYPES[0];
  const previewType =
    availableTypes.find((t) => t.key === (hoverKey ?? mervKey)) ?? selectedType;
  const gallery = productGalleryFor(previewType.merv, previewType.isCarbon);
  const packShot = packShotSrc(selectedType.merv, selectedType.isCarbon);
  const previewGuide = MERV_GUIDE[previewType.key];
  const previewing = hoverKey != null && hoverKey !== mervKey;
  const displayShot = previewing ? 0 : Math.min(shot, Math.max(gallery.length - 1, 0));
  const frame = gallery[displayShot] ?? gallery[0];

  useEffect(() => {
    setShot(0);
  }, [selectedType.key]);
  const variant: Product | undefined = findProductVariant(
    decoded,
    selectedType.merv,
    selectedType.isCarbon,
  );
  useEffect(() => {
    trackViewedSize(decoded);
  }, [decoded]);

  useEffect(() => {
    if (variant) trackViewedProduct(variant);
  }, [variant]);

  const listUnit = variant ? unitPriceForQty(variant.price, qty, variant) : 0;
  const unitPrice = variant
    ? shopperUnitPrice(variant.price, qty, variant, delivery)
    : 0;
  const total = Math.round(unitPrice * qty * 100) / 100;
  const savePct =
    variant && variant.price > 0 ? Math.round((1 - listUnit / variant.price) * 100) : 0;
  const subscribeSave =
    delivery !== "once" && listUnit > 0
      ? Math.round((1 - unitPrice / listUnit) * 100)
      : 0;
  const packRung = PACK_TIERS.reduce(
    (current, next) => (qty >= next.minQty ? next.minQty : current),
    PACK_TIERS[0].minQty,
  );
  const saveVsSingle =
    variant && qty > 1
      ? Math.max(
          0,
          Math.round(
            (shopperUnitPrice(variant.price, 1, variant, delivery) * qty - total) * 100,
          ) / 100,
        )
      : 0;
  const bestValueQty = variant
    ? PACK_TIERS.reduce((best, tier) => {
        const price = unitPriceForQty(variant.price, tier.minQty, variant);
        const bestPrice = unitPriceForQty(variant.price, best, variant);
        if (price < bestPrice) return tier.minQty;
        if (price === bestPrice && tier.minQty > best) return tier.minQty;
        return best;
      }, PACK_TIERS[0].minQty)
    : PACK_TIERS[PACK_TIERS.length - 1].minQty;

  const handleAdd = () => {
    if (!variant || !variant.inStock) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    addItem(variant, qty, delivery);
    toast.success(
      delivery === "once"
        ? `Added ${qty}× ${variant.size} (${selectedType.name})`
        : `Added ${qty}× ${variant.size} · ${deliveryLabel(delivery)} (10% off)`,
    );
  };

  const inCatalog = Boolean(sizeMeta);
  const matchingBrands = inCatalog ? brandsForSize(decoded) : [];

  const related = useMemo(() => {
    if (!sizeMeta) return [];
    return [0.5, 1, 2, 4, 5]
      .filter((d) => d !== sizeMeta.depth)
      .map((d) => `${sizeMeta.width}x${sizeMeta.length}x${d}`)
      .filter((slug) => getFilterSize(slug))
      .slice(0, 4);
  }, [sizeMeta]);

  const siteUrl = getSiteUrl();
  const seo = sizeSeo(siteUrl, sizeMeta ?? decoded);
  const sizeFaqs: FaqItem[] = useMemo(
    () => [
      {
        question: `Will a ${decoded} filter fit my HVAC system?`,
        category: "Fit",
        answer: sizeMeta
          ? `A ${decoded} filter is the nominal size. The actual dimensions are ${sizeMeta.actualWidth}×${sizeMeta.actualLength}×${sizeMeta.actualDepth} inches so it slides into a standard ${decoded} slot. Match the label on your current filter or measure the slot.`
          : `If ${decoded} matches the label on your current filter, request a quote and we will confirm fit and lead time for that custom size.`,
        action: { href: "/#finder", label: "Measure and confirm size" },
      },
      {
        question: `How often should I replace a ${decoded} air filter?`,
        category: "Replacement",
        answer:
          "Replace every 30–90 days depending on pets, allergies, dust, and how often your system runs. Higher MERV filters may load faster in dusty homes.",
        action: { href: CHANGE_GUIDE_PATH, label: "Get a change date" },
      },
      {
        question: `What MERV options are available for ${decoded}?`,
        category: "MERV",
        answer: inCatalog
          ? `${decoded} is available in ${mervOptions}. Choose based on everyday dust, pets/allergies, or high filtration needs. Carbon and other ratings can be quoted if you need them.`
          : "Once we confirm your custom size, we can quote MERV 8, 11, 13, or carbon options when available.",
        action: { href: "/#merv", label: "Compare MERV ratings" },
      },
    ],
    [decoded, sizeMeta, inCatalog, mervOptions],
  );

  const jsonLd = useMemo(() => {
    const crumbs = [
      { name: "Home", path: "/" },
      { name: "Sizes", path: "/sizes" },
      ...(sizeMeta
        ? [
            {
              name: `${sizeMeta.depth}" filters`,
              path: `/filters/${sizeMeta.depth}-inch`,
            },
          ]
        : []),
      { name: decoded, path: `/sizes/${encodeURIComponent(decoded)}` },
    ];
    const schemas: unknown[] = [
      buildBreadcrumbSchema(siteUrl, crumbs),
      buildFaqSchema(sizeFaqs),
      buildSpeakableSchema(siteUrl, [
        ".seo-answer",
        ".seo-speakable-q",
        ".seo-speakable-a",
      ], { path: seo.path, name: seo.title }),
    ];
    if (sizeMeta && variant) {
      schemas.push(
        buildProductSchema(siteUrl, sizeMeta, {
          mervName: selectedType.name,
          price: unitPriceForQty(variant.price, 1, variant),
          description: `${decoded} ${selectedType.name} pleated HVAC air filter. ${selectedType.description}`,
          image: packShot,
        }),
      );
    }
    return schemas;
  }, [siteUrl, seo.path, seo.title, sizeMeta, decoded, sizeFaqs, variant, selectedType, packShot]);

  useSeo({
    ...seo,
    image: packShot,
    noindex: !inCatalog,
    jsonLd,
  });

  const specs = sizeMeta
    ? [
        {
          icon: Ruler,
          label: "Nominal size",
          value: `${sizeMeta.width} × ${sizeMeta.length} × ${sizeMeta.depth} in`,
        },
        {
          icon: Crosshair,
          label: "Actual size",
          value: `${sizeMeta.actualWidth} × ${sizeMeta.actualLength} × ${sizeMeta.actualDepth} in`,
        },
        { icon: ShieldCheck, label: "MERV", value: selectedType.name },
        { icon: Layers, label: "Filter type", value: "Pleated" },
        { icon: Wind, label: "Frame", value: "Rigid cardboard" },
        { icon: Truck, label: "Best for", value: "HVAC / furnace" },
      ]
    : [];

  return (
    <div className="product-page min-h-screen">
      <SiteHeader />

      <main>
        <div className="container py-8 md:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-white/80 mb-5 break-words">
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/sizes" className="hover:text-white">
              Sizes
            </Link>{" "}
            /{" "}
            {sizeMeta ? (
              <Link
                href={`/filters/${sizeMeta.depth}-inch`}
                className="hover:text-white"
              >
                {sizeMeta.depth}" filters
              </Link>
            ) : (
              "Custom"
            )}{" "}
            / <span className="text-white">{decoded}</span>
          </nav>

          {!inCatalog ? (
            <>
              <div className="product-deck product-deck-custom overflow-hidden">
                <LifeImage
                  photo={LIFE.installWall}
                  className="h-44 sm:h-56"
                  sizes="100vw"
                  priority
                />
                <div className="bg-white p-5 sm:p-8 text-foreground">
                  <span className="section-label !text-mesh">Odd size</span>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-3 break-words">
                    {decoded}
                  </h1>
                  <p className="text-muted-foreground mb-6 max-w-xl">
                    We don't list this exact size in the standard catalog yet.
                    Request a quote and we'll confirm pricing and lead time for
                    your dimensions.
                  </p>
                  <Button size="lg" className="hero-shop-btn w-full text-white sm:w-auto" asChild>
                    <Link href={`/custom-air-filters?size=${encodeURIComponent(decoded)}`}>
                      Request a quote for {decoded}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="mt-6 max-w-[42rem]">
                <ProductOverduePanel />
              </div>
              <div className="mt-10 rounded-3xl bg-white p-4 sm:p-6 text-foreground space-y-10">
                <HowToMeasureGuide />
                <HowToReplaceGuide />
                <FilterFinder showPopular compact />
              </div>
            </>
          ) : (
            <div
              className="product-deck"
              style={
                {
                  "--pdp-glow": previewType.badgeColor,
                  "--pdp-accent": previewGuide.accent,
                } as CSSProperties
              }
            >
              <div className="product-theater">
                <div className="product-theater-glow" aria-hidden />
                <div className="product-theater-mesh" aria-hidden />

                <div className="relative z-[1] flex flex-wrap items-center gap-2">
                  <span className="product-size-plaque">{decoded}</span>
                  <span
                    className="product-merv-chip"
                    style={{ backgroundColor: previewType.badgeColor }}
                  >
                    {previewType.name}
                  </span>
                </div>

                <div className="product-shot-wrap">
                  <img
                    src={frame.src}
                    alt={`${decoded} ${previewType.name} — ${frame.alt}`}
                    className="product-shot"
                  />
                </div>

                <div className="product-thumbs" role="list">
                  {gallery.map((item, i) => (
                    <button
                      key={item.src}
                      type="button"
                      role="listitem"
                      className={cn("product-thumb", i === displayShot && "product-thumb-active")}
                      aria-label={item.alt}
                      aria-pressed={i === displayShot}
                      onClick={() => setShot(i)}
                    >
                      <img src={item.src} alt="" />
                    </button>
                  ))}
                </div>

                <ul className="product-trust">
                  <li>
                    <Crosshair className="h-4 w-4" /> Guaranteed fit
                  </li>
                  <li>
                    <Truck className="h-4 w-4" /> 2–3 day delivery
                  </li>
                  <li>
                    <ShieldCheck className="h-4 w-4" /> Exact-fit catalog sizes
                  </li>
                </ul>

                <ProductOverduePanel unitPrice={unitPrice} />
              </div>

              <div className="product-buy">
                <h1 className="text-2xl sm:text-3xl md:text-[2.65rem] font-bold tracking-tight break-words text-deep">
                  {decoded} Air Filters
                </h1>
                <p className="seo-answer mt-3 mb-7 text-[0.95rem] leading-relaxed text-muted-foreground">
                  Buy {decoded} HVAC and furnace air filters from {BRAND_NAME}.
                  Choose {mervOptions} and replace every 30–90 days
                  depending on use.{" "}
                  <Link
                    href="/how-often-to-change-air-filter"
                    className="font-semibold text-navy underline decoration-ice underline-offset-4 hover:text-hero"
                  >
                    Get a change date for your home
                  </Link>
                  .
                </p>

                <div className="mb-7">
                  <h2 className="section-label !text-mesh">1 · Choose MERV</h2>
                  <div
                    className={cn("pdp-merv-pair", hoverKey && "is-hot")}
                    style={{ "--merv-wash": previewType.badgeColor } as CSSProperties}
                  >
                    <div className="pdp-merv-row">
                      {availableTypes.map((t) => {
                        const active = t.key === mervKey;
                        const g = MERV_GUIDE[t.key];
                        const typeVariant = findProductVariant(
                          decoded,
                          t.merv,
                          t.isCarbon,
                        );
                        const typeInStock = Boolean(typeVariant?.inStock);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => pickMerv(t.key)}
                            onMouseEnter={() => setHoverKey(t.key)}
                            onMouseLeave={() =>
                              setHoverKey((current) => (current === t.key ? null : current))
                            }
                            onFocus={() => setHoverKey(t.key)}
                            onBlur={() =>
                              setHoverKey((current) => (current === t.key ? null : current))
                            }
                            aria-pressed={active}
                            className={cn(
                              "pdp-merv",
                              active && "pdp-merv-active",
                              !typeInStock && "opacity-80",
                            )}
                            style={{ "--merv-wash": t.badgeColor } as CSSProperties}
                          >
                            <span
                              className="pdp-merv-badge"
                              style={{ backgroundColor: t.badgeColor }}
                            >
                              {t.key === "carbon" ? (
                                <span className="flex flex-col items-center leading-[1.05]">
                                  <span>MERV 8</span>
                                  <span>Carbon</span>
                                </span>
                              ) : (
                                t.name
                              )}
                            </span>
                            <span className="pdp-merv-name">{t.name}</span>
                            <span className="pdp-merv-for">
                              {typeInStock ? g.bestFor : "Notify me"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="pdp-merv-note">
                      <p className="pdp-merv-capture-label">Capture</p>
                      <CaptureDots merv={previewType.key} color={previewType.badgeColor} />
                      <p className="pdp-merv-efficiency">{previewGuide.efficiency}</p>
                      <p className="pdp-merv-copy">
                        <span>{previewGuide.bestFor}.</span> {previewGuide.note} Catches{" "}
                        {previewGuide.catches.join(", ").toLowerCase()}.
                      </p>
                      <p className="pdp-merv-copy">
                        <span>{MERV_CAPACITY_SHORT}</span> {MERV_CAPACITY_NOTE}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-7">
                  <h2 className="section-label !text-mesh">2 · Select quantity</h2>
                  <div className="pdp-qty-card">
                    <div className="pdp-stepper">
                      <div className="pdp-stepper-ctrl">
                        <button
                          type="button"
                          aria-label="Decrease pack quantity"
                          disabled={qty <= qtyMin}
                          onClick={() => pickQty(qty - 1)}
                        >
                          <Minus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        <span className="pdp-stepper-count" aria-live="polite">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase pack quantity"
                          disabled={qty >= qtyMax}
                          onClick={() => pickQty(qty + 1)}
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="pdp-stepper-price-block">
                        {savePct > 0 && <span className="pdp-save">−{savePct}%</span>}
                        <p className="pdp-stepper-price">${unitPrice.toFixed(2)}</p>
                        <p className="pdp-stepper-each">per filter</p>
                      </div>
                    </div>
                    <div className="pdp-qty-ladder">
                      <div className="pdp-qty-ladder-head" aria-hidden>
                        <span>Qty</span>
                        <span>Each</span>
                        <span>Savings</span>
                      </div>
                      {PACK_TIERS.map((tier) => {
                        if (!variant) return null;
                        const price = unitPriceForQty(variant.price, tier.minQty, variant);
                        const pct = Math.max(0, Math.round((1 - price / variant.price) * 100));
                        const active = packRung === tier.minQty;
                        const popular = tier.minQty === 6;
                        const best = tier.minQty === bestValueQty;
                        const label = `${tier.label} ${tier.minQty === 1 ? "filter" : "filters"}`;
                        return (
                          <button
                            key={tier.minQty}
                            type="button"
                            onClick={() => pickQty(tier.minQty)}
                            aria-label={label}
                            aria-pressed={active}
                            className={cn("pdp-qty-ladder-row", active && "pdp-qty-ladder-row-active")}
                          >
                            <span className="pdp-qty-ladder-qty">
                              {tier.label}
                              {popular && <span className="pdp-pack-tag">Most popular</span>}
                              {best && (
                                <span className="pdp-pack-tag pdp-pack-tag-hero">Best value</span>
                              )}
                            </span>
                            <span>${price.toFixed(2)}</span>
                            <span className={cn("pdp-qty-ladder-save", pct > 0 && "pdp-qty-ladder-save-on")}>
                              {pct}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pdp-checkout">
                  <div className="mb-4">
                    <h2 className="section-label !text-mesh">3 · Delivery</h2>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        type="button"
                        className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                          delivery === "once"
                            ? "border-navy bg-navy text-white"
                            : "border-border bg-white text-navy"
                        }`}
                        onClick={() => setDelivery("once")}
                      >
                        Buy once
                      </button>
                      {AUTO_DELIVERY_INTERVALS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                            delivery === days
                              ? "border-navy bg-navy text-white"
                              : "border-border bg-white text-navy"
                          }`}
                          onClick={() => setDelivery(days)}
                        >
                          Every {days}d
                          <span className="mt-0.5 block text-[0.65rem] font-bold opacity-80">
                            10% off
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                        Pack total
                      </p>
                      <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-deep">
                        ${total.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ${unitPrice.toFixed(2)} per filter
                        {subscribeSave > 0 ? ` · ${subscribeSave}% auto-delivery` : ""}
                        {saveVsSingle > 0 ? ` · save $${saveVsSingle.toFixed(2)} vs singles` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="hero-shop-btn hero-shop-btn-glow w-full text-white"
                    disabled={!variant?.inStock}
                    onClick={handleAdd}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {delivery === "once"
                      ? `Add ${qty} to cart`
                      : `Add ${qty} · auto every ${delivery} days`}
                  </Button>
                  {!variant?.inStock && (
                    <div className="mt-4">
                      <BackInStockForm
                        size={decoded}
                        merv={selectedType.merv}
                        isCarbon={selectedType.isCarbon}
                        label={selectedType.name}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {inCatalog && (
            <>
              <section className="mt-12 md:mt-16">
                <span className="section-label">The facts</span>
                <h2 className="mb-5 text-xl font-bold text-white md:text-2xl">
                  Specifications
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {specs.map((spec) => {
                    const Icon = spec.icon;
                    return (
                      <div key={spec.label} className="pdp-spec">
                        <Icon className="h-4 w-4 text-ice" />
                        <div>
                          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-white/80">
                            {spec.label}
                          </p>
                          <p className="mt-0.5 font-bold tracking-tight text-white">
                            {spec.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { photo: LIFE.installWall, caption: "Drops into the slot" },
                  { photo: LIFE.filterCleanDirty, caption: "New vs. overdue" },
                  { photo: LIFE.carpetClean, caption: "Air the house can feel" },
                ].map((tile) => (
                  <figure key={tile.caption} className="pdp-mosaic">
                    <LifeImage
                      photo={tile.photo}
                      className="h-40 sm:h-44"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                    <figcaption>{tile.caption}</figcaption>
                  </figure>
                ))}
              </div>

              {matchingBrands.length > 0 && (
                <div className="mt-10">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/85">
                    Fits these HVAC brands
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
                    {matchingBrands.map((b) => (
                      <Link
                        key={b.slug}
                        href={`/brands/${b.slug}`}
                        className="brand-chip"
                      >
                        <BrandLogo
                          slug={b.slug}
                          name={b.name}
                          className="h-5 w-full max-w-[4rem]"
                        />
                        <span>{b.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {related.length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/85">
                    Other thicknesses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {related.map((slug) => (
                      <Link
                        key={slug}
                        href={`/sizes/${encodeURIComponent(slug)}`}
                        className="size-chip !py-2 !px-3 !text-xs"
                      >
                        {slug}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 rounded-3xl bg-white p-4 sm:p-6 text-foreground space-y-10">
                <HowToMeasureGuide />
                <HowToReplaceGuide />
                <FilterFinder showPopular compact />
              </div>
            </>
          )}

          <FaqSection
            faqs={sizeFaqs}
            title={`${decoded} filter FAQ`}
            subtitle="Fit, replacement timing, and MERV choices for this size."
            tone="band"
          />
        </div>
      </main>

      {inCatalog && (
        <div className="pdp-sticky lg:hidden">
          <div>
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-white/85">
              {qty} × {selectedType.name}
              {delivery === "once" ? "" : ` · every ${delivery}d`}
            </p>
            <p className="text-lg font-extrabold text-white">${total.toFixed(2)}</p>
          </div>
          <Button
            className="hero-shop-btn text-white"
            disabled={!variant?.inStock}
            onClick={handleAdd}
          >
            {variant?.inStock ? "Add to cart" : "Unavailable"}
          </Button>
        </div>
      )}

      <footer className="site-footer pt-8">
        <div className="container text-sm">
          &copy; {new Date().getFullYear()} {BRAND_NAME}
        </div>
      </footer>

      <CartDrawer onRequestQuote={() => { window.location.href = "/#contact"; }} />
    </div>
  );
}

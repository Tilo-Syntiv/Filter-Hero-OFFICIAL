import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ChevronDown, Fan, Images, Mail, Menu, MessageSquare, Ruler, ShoppingCart, UserRound } from "lucide-react";
import { CHANGE_GUIDE_PATH } from "@shared/seo";
import BrandLockup from "@/components/BrandLockup";
import { useAccount } from "@/contexts/AccountContext";
import { useCart } from "@/contexts/CartContext";
import { BRAND_EMAIL } from "@/const";
import { jumpToHashTarget, scrollToHashTarget } from "@/hooks/useHashScroll";
import { allBrandFamilies } from "@shared/hvac-brands";
import { BrandFamilyGrid } from "@/components/BrandDirectory";
import {
  finderLengths,
  finderWidths,
  THICKNESSES,
} from "@shared/products";
import { featuredSizesFromConfig } from "@shared/site-config";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { customQuotePath, shopOrQuotePath } from "@/lib/filter-size";
import { getPreferredMerv } from "@/lib/merv-pref";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const WIDTHS = finderWidths().map(String);
const LENGTHS = finderLengths().map(String);

const DEPTHS = THICKNESSES.map(String);
const ALL_BRAND_FAMILIES = allBrandFamilies();

type DesktopMenu = "shop" | "howto" | "contact" | null;

function formatDepth(value: string | number) {
  const n = Number(value);
  return n === 0.5 ? '½"' : `${n}"`;
}

function HeaderSizeField({
  id,
  short,
  value,
  onChange,
  children,
}: {
  id: string;
  short: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="header-finder-field">
      <span className="header-finder-field-label">{short}</span>
      <select
        id={id}
        className="header-finder-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function HeaderFinder({ onFound }: { onFound?: () => void }) {
  const [, setLocation] = useLocation();
  const [width, setWidth] = useState("20");
  const [length, setLength] = useState("25");
  const [depth, setDepth] = useState("1");
  const formId = useId();

  const go = () => {
    const slug = `${width}x${length}x${depth}`;
    const merv = getPreferredMerv();
    const mervQuery = merv ? `?merv=${merv}` : "";
    onFound?.();
    const dest = shopOrQuotePath(slug);
    setLocation(dest.startsWith("/sizes/") ? `${dest}${mervQuery}` : dest);
  };

  return (
    <form
      className="header-finder"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <p className="header-finder-prompt">Enter Your Filter Size</p>
      <div className="header-finder-dims" role="group" aria-label="Filter size">
        <HeaderSizeField
          id={`${formId}-w`}
          short="Width"
          value={width}
          onChange={setWidth}
        >
          {WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}"
            </option>
          ))}
        </HeaderSizeField>
        <span className="header-finder-times" aria-hidden>
          ×
        </span>
        <HeaderSizeField
          id={`${formId}-l`}
          short="Length"
          value={length}
          onChange={setLength}
        >
          {LENGTHS.map((l) => (
            <option key={l} value={l}>
              {l}"
            </option>
          ))}
        </HeaderSizeField>
        <span className="header-finder-times" aria-hidden>
          ×
        </span>
        <HeaderSizeField
          id={`${formId}-d`}
          short="Depth"
          value={depth}
          onChange={setDepth}
        >
          {DEPTHS.map((d) => (
            <option key={d} value={d}>
              {formatDepth(d)}
            </option>
          ))}
        </HeaderSizeField>
      </div>
      <button type="submit" className="header-find-btn">
        Find
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

function ShopBrandsFold({
  open,
  onOpenChange,
  onBrandClick,
  panelId,
  mobile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrandClick: () => void;
  panelId: string;
  mobile?: boolean;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger type="button" className="header-brands-toggle">
        Brands
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent id={panelId}>
        <BrandFamilyGrid
          families={ALL_BRAND_FAMILIES}
          onBrandClick={onBrandClick}
          dense
        />
        <Link
          href="/brands"
          className={
            mobile
              ? "inline-flex min-h-11 items-center gap-1.5 mt-2 text-sm font-bold text-ice"
              : "inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-ice hover:text-white transition-colors"
          }
          onClick={onBrandClick}
        >
          Every brand
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const { session } = useAccount();
  const { featuredSizeSlugs } = useSiteConfig();
  const popular = featuredSizesFromConfig(featuredSizeSlugs, 8);
  const [location, setLocation] = useLocation();
  const [desktopMenu, setDesktopMenu] = useState<DesktopMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopBrandsOpen, setShopBrandsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const publishHeight = () => {
      document.documentElement.style.setProperty(
        "--site-header-h",
        `${header.offsetHeight}px`,
      );
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-h");
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (desktopMenu !== "shop") setShopBrandsOpen(false);
  }, [desktopMenu]);

  useEffect(() => {
    if (!mobileOpen) setShopBrandsOpen(false);
  }, [mobileOpen]);

  const clearCloseMenuTimer = () => {
    if (closeMenuTimer.current) {
      clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
  };

  const openDesktopMenu = (menu: DesktopMenu) => {
    clearCloseMenuTimer();
    setMobileOpen(false);
    setDesktopMenu(menu);
  };

  const scheduleCloseDesktopMenu = () => {
    clearCloseMenuTimer();
    closeMenuTimer.current = setTimeout(() => setDesktopMenu(null), 160);
  };

  const closeMenus = () => {
    clearCloseMenuTimer();
    setDesktopMenu(null);
    setMobileOpen(false);
  };

  const goHomeSection = (id: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const fromDrawer = mobileOpen;
    closeMenus();
    const go = () => {
      if (window.location.pathname === "/" || window.location.pathname === "") {
        jumpToHashTarget(id);
        return;
      }
      setLocation(`/#${id}`);
    };
    if (fromDrawer) {
      window.setTimeout(go, 80);
      return;
    }
    go();
  };

  const goCustomQuote = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const fromDrawer = mobileOpen;
    closeMenus();
    const href = event.currentTarget.getAttribute("href") || customQuotePath();
    const go = () => {
      if (window.location.pathname === "/custom-air-filters") {
        scrollToHashTarget("custom-quote");
        return;
      }
      setLocation(href);
    };
    if (fromDrawer) {
      window.setTimeout(go, 80);
      return;
    }
    go();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus();
    };
    const onPointer = (e: globalThis.MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        clearCloseMenuTimer();
        setDesktopMenu(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      clearCloseMenuTimer();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="site-header sticky top-0 z-50"
      onPointerEnter={clearCloseMenuTimer}
      onPointerLeave={scheduleCloseDesktopMenu}
    >
      <div className="site-header-bar">
      <div className="container flex flex-wrap items-center gap-x-2 gap-y-2 py-0.5 xl:flex-nowrap md:py-1">
        <button
          type="button"
          className="header-menu-btn lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => {
            setDesktopMenu(null);
            setMobileOpen(true);
          }}
        >
          <Menu className="h-5 w-5" />
        </button>

        <BrandLockup tone="header" className="shrink-0" onClick={closeMenus} />

        <nav
          className="hidden lg:flex items-center justify-start gap-x-0.5 gap-y-1 xl:ml-1"
          aria-label="Primary"
        >
          {([
            ["shop", "Shop"],
            ["howto", "How-to"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="header-nav-link"
              aria-expanded={desktopMenu === id}
              aria-controls={`${id}-mega`}
              onPointerEnter={() => openDesktopMenu(id)}
              onFocus={() => openDesktopMenu(id)}
              onClick={() => openDesktopMenu(id)}
            >
              {label}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${desktopMenu === id ? "rotate-180" : ""}`}
              />
            </button>
          ))}
          <Link
            href="/#clock"
            className="header-nav-link"
            onPointerEnter={() => {
              clearCloseMenuTimer();
              setDesktopMenu(null);
            }}
            onFocus={() => setDesktopMenu(null)}
            onClick={goHomeSection("clock")}
          >
            Filter Clock
          </Link>
          <button
            type="button"
            className="header-nav-link"
            aria-expanded={desktopMenu === "contact"}
            aria-controls="contact-mega"
            onPointerEnter={() => openDesktopMenu("contact")}
            onFocus={() => openDesktopMenu("contact")}
            onClick={() => openDesktopMenu("contact")}
          >
            Contact
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${desktopMenu === "contact" ? "rotate-180" : ""}`}
            />
          </button>
          <Link
            href="/#how-to-measure"
            className="header-measure-chip"
            aria-label="How to measure your filter"
            title="How to measure your filter"
            onPointerEnter={() => {
              clearCloseMenuTimer();
              setDesktopMenu(null);
            }}
            onFocus={() => setDesktopMenu(null)}
            onClick={goHomeSection("how-to-measure")}
          >
            <Ruler className="h-2.5 w-2.5" aria-hidden />
            Measure
          </Link>
        </nav>

        <div className="order-last w-full min-w-0 basis-full lg:order-none lg:flex-1 lg:basis-auto xl:max-w-3xl xl:mx-2">
          <HeaderFinder onFound={closeMenus} />
        </div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <Link
            href="/custom-air-filters#custom-quote"
            className="header-find-btn header-custom-btn hidden lg:inline-flex shrink-0"
            onClick={goCustomQuote}
          >
            <span className="2xl:hidden">Custom</span>
            <span className="hidden 2xl:inline">Need a custom size</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={session ? "/account" : "/login"}
            className="header-cart"
            aria-label={session ? "Open your account" : "Sign in"}
            onClick={closeMenus}
          >
            <UserRound className="h-4 w-4" />
            <span className="header-cart-tip" aria-hidden="true">
              {session ? "Account" : "Sign in"}
            </span>
          </Link>
          <button
            type="button"
            className="header-cart"
            onClick={openCart}
            aria-label={itemCount ? `Open cart, ${itemCount} items` : "Open cart"}
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="cart-badge-pop absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-hero text-[0.65rem] font-extrabold text-white flex items-center justify-center shadow-[0_0_0_2px_#23406a]">
                {itemCount}
              </span>
            )}
            <span className="header-cart-tip" aria-hidden="true">
              {itemCount ? `Cart · ${itemCount}` : "Cart"}
            </span>
          </button>
        </div>
      </div>
      </div>

      {desktopMenu && (
        <div
          id={`${desktopMenu}-mega`}
          className="header-mega hidden lg:block"
          onPointerEnter={() => openDesktopMenu(desktopMenu)}
          onPointerLeave={scheduleCloseDesktopMenu}
        >
          {desktopMenu === "shop" && (
            <div className="container grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 py-5 md:py-7">
              <div className="md:col-span-6">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-ice/80 mb-3">
                  Thickness
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {THICKNESSES.map((d) => (
                    <Link
                      key={d}
                      href={`/filters/${d}-inch`}
                      className="header-mega-tile"
                      onClick={closeMenus}
                    >
                      <span className="text-lg font-extrabold tracking-tight leading-none">
                        {formatDepth(d)}
                      </span>
                      <span className="text-xs text-ice/80 font-medium">Exact-fit filters</span>
                    </Link>
                  ))}
                  <Link
                    href="/custom-air-filters#custom-quote"
                    className="header-mega-tile"
                    onClick={goCustomQuote}
                  >
                    <span className="text-sm font-extrabold tracking-tight">Custom</span>
                    <span className="text-xs text-ice/80 font-medium">Odd size? We cut it.</span>
                  </Link>
                </div>
              </div>

              <div className="md:col-span-6">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-ice/80 mb-3">
                  Popular sizes
                </p>
                <div className="flex flex-wrap gap-2">
                  {popular.map((slug) => (
                    <Link
                      key={slug}
                      href={`/sizes/${slug}`}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white hover:border-ice/60 hover:bg-white/10 transition-colors"
                      onClick={closeMenus}
                    >
                      {slug.replaceAll("x", " × ")}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/sizes"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-ice hover:text-white transition-colors"
                  onClick={closeMenus}
                >
                  All sizes
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <ShopBrandsFold
                  open={shopBrandsOpen}
                  onOpenChange={setShopBrandsOpen}
                  onBrandClick={closeMenus}
                  panelId="shop-mega-brands"
                />
              </div>
            </div>
          )}

          {desktopMenu === "howto" && (
            <div className="container grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 py-5 md:py-7">
              <div className="md:col-span-12">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-ice/80 mb-3">
                  How-to
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Link
                    href="/#how-to-measure"
                    className="header-mega-tile"
                    onClick={goHomeSection("how-to-measure")}
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                      <Ruler className="h-4 w-4" />
                      How to measure
                    </span>
                    <span className="text-xs text-ice/80 font-medium">
                      Tape the frame. Width × Length × Depth.
                    </span>
                  </Link>
                  <Link
                    href={`${CHANGE_GUIDE_PATH}#how-to`}
                    className="header-mega-tile"
                    onClick={closeMenus}
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                      <Fan className="h-4 w-4" />
                      How to swap
                    </span>
                    <span className="text-xs text-ice/80 font-medium">
                      Five moves. Photos of the install.
                    </span>
                  </Link>
                  <Link
                    href={CHANGE_GUIDE_PATH}
                    className="header-mega-tile"
                    onClick={closeMenus}
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                      <Images className="h-4 w-4" />
                      Guides and photos
                    </span>
                    <span className="text-xs text-ice/80 font-medium">
                      Change cadence, light test, and the video home.
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {desktopMenu === "contact" && (
            <div className="container grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 py-5 md:py-7">
              <div className="md:col-span-4">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-ice/80 mb-3">
                  Reach us
                </p>
                <a href={`mailto:${BRAND_EMAIL}`} className="header-mega-tile" onClick={closeMenus}>
                  <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <span className="text-xs text-ice/80 font-medium">{BRAND_EMAIL}</span>
                </a>
              </div>
              <div className="md:col-span-8">
                <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-ice/80 mb-3">
                  Support
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    href="/#clock"
                    className="header-mega-tile"
                    onClick={goHomeSection("clock")}
                  >
                    <span className="text-sm font-extrabold tracking-tight">Filter Clock</span>
                    <span className="text-xs text-ice/80 font-medium">Tell us about the house. We'll give you the date.</span>
                  </Link>
                  <Link
                    href="/how-often-to-change-air-filter"
                    className="header-mega-tile"
                    onClick={closeMenus}
                  >
                    <span className="text-sm font-extrabold tracking-tight">When to change</span>
                    <span className="text-xs text-ice/80 font-medium">The full change guide</span>
                  </Link>
                  <Link
                    href="/#contact"
                    className="header-mega-tile"
                    onClick={goHomeSection("contact")}
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                      <MessageSquare className="h-4 w-4" />
                      Send a message
                    </span>
                    <span className="text-xs text-ice/80 font-medium">Size, MERV, or order help</span>
                  </Link>
                  <Link
                    href="/#faq"
                    className="header-mega-tile"
                    onClick={goHomeSection("faq")}
                  >
                    <span className="text-sm font-extrabold tracking-tight">FAQ</span>
                    <span className="text-xs text-ice/80 font-medium">Quick answers</span>
                  </Link>
                  <Link
                    href="/custom-air-filters#custom-quote"
                    className="header-mega-tile"
                    onClick={goCustomQuote}
                  >
                    <span className="text-sm font-extrabold tracking-tight">Custom quote</span>
                    <span className="text-xs text-ice/80 font-medium">Odd size? We cut it.</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          id="mobile-nav"
          side="left"
          className="header-mobile"
        >
          <SheetHeader className="px-5 pt-5 pb-3 pr-14">
            <SheetTitle className="text-left text-white font-extrabold tracking-tight">
              Menu
            </SheetTitle>
            <SheetDescription className="sr-only">
              Shop sizes and brands, how-to guides, Filter Clock, and contact Filter Hero.
            </SheetDescription>
          </SheetHeader>

          <div className="header-mobile-body">
            <section className="header-mobile-block">
              <p className="header-mobile-label">Shop</p>
              <div className="grid grid-cols-2 gap-2">
                {THICKNESSES.map((d) => (
                  <Link
                    key={d}
                    href={`/filters/${d}-inch`}
                    className="header-mega-tile"
                    onClick={closeMenus}
                  >
                    <span className="text-lg font-extrabold tracking-tight leading-none">
                      {formatDepth(d)}
                    </span>
                    <span className="text-xs text-ice/80 font-medium">Exact-fit filters</span>
                  </Link>
                ))}
                <Link
                  href="/custom-air-filters#custom-quote"
                  className="header-mega-tile"
                  onClick={goCustomQuote}
                >
                  <span className="text-sm font-extrabold tracking-tight">Custom</span>
                  <span className="text-xs text-ice/80 font-medium">Odd size? We cut it.</span>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {popular.map((slug) => (
                  <Link
                    key={slug}
                    href={`/sizes/${slug}`}
                    className="min-h-11 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white"
                    onClick={closeMenus}
                  >
                    {slug.replaceAll("x", " × ")}
                  </Link>
                ))}
              </div>
              <Link
                href="/sizes"
                className="inline-flex min-h-11 items-center gap-1.5 mt-2 text-sm font-bold text-ice"
                onClick={closeMenus}
              >
                All sizes
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <ShopBrandsFold
                open={shopBrandsOpen}
                onOpenChange={setShopBrandsOpen}
                onBrandClick={closeMenus}
                panelId="shop-drawer-brands"
                mobile
              />
            </section>

            <section className="header-mobile-block">
              <p className="header-mobile-label">How-to</p>
              <nav className="grid gap-2" aria-label="How-to">
                <Link
                  href="/#how-to-measure"
                  className="header-mega-tile"
                  onClick={goHomeSection("how-to-measure")}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                    <Ruler className="h-4 w-4" />
                    How to measure
                  </span>
                  <span className="text-xs text-ice/80 font-medium">
                    Tape the frame. Width × Length × Depth.
                  </span>
                </Link>
                <Link
                  href={`${CHANGE_GUIDE_PATH}#how-to`}
                  className="header-mega-tile"
                  onClick={closeMenus}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                    <Fan className="h-4 w-4" />
                    How to swap
                  </span>
                  <span className="text-xs text-ice/80 font-medium">
                    Five moves. Photos of the install.
                  </span>
                </Link>
                <Link
                  href={CHANGE_GUIDE_PATH}
                  className="header-mega-tile"
                  onClick={closeMenus}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                    <Images className="h-4 w-4" />
                    Guides and photos
                  </span>
                  <span className="text-xs text-ice/80 font-medium">
                    Change cadence, light test, and the video home.
                  </span>
                </Link>
              </nav>
            </section>

            <nav className="header-mobile-block grid gap-2" aria-label="More">
              <Link
                href="/#clock"
                className="header-mega-tile"
                onClick={goHomeSection("clock")}
              >
                <span className="text-sm font-extrabold tracking-tight">Filter Clock</span>
                <span className="text-xs text-ice/80 font-medium">When to change your filter</span>
              </Link>
              <Link
                href="/#how-to-measure"
                className="header-measure-chip header-mobile-measure"
                aria-label="How to measure your filter"
                onClick={goHomeSection("how-to-measure")}
              >
                <Ruler className="h-3.5 w-3.5" aria-hidden />
                Measure
              </Link>
              <Link
                href="/#contact"
                className="header-mega-tile"
                onClick={goHomeSection("contact")}
              >
                <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                  <MessageSquare className="h-4 w-4" />
                  Contact
                </span>
                <span className="text-xs text-ice/80 font-medium">Size, MERV, or order help</span>
              </Link>
              <a href={`mailto:${BRAND_EMAIL}`} className="header-mega-tile" onClick={closeMenus}>
                <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight">
                  <Mail className="h-4 w-4" />
                  Email
                </span>
                <span className="text-xs text-ice/80 font-medium">{BRAND_EMAIL}</span>
              </a>
              <Link
                href="/custom-air-filters#custom-quote"
                className="header-find-btn header-custom-btn header-mobile-custom"
                onClick={goCustomQuote}
              >
                Need a custom size
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

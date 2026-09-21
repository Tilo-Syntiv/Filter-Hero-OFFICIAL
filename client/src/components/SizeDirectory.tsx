import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  THICKNESSES,
  catalogWidthsForDepth,
  getSizesByThickness,
} from "@shared/products";

const PREVIEW_COUNT = 36;
const PAGE_SIZE = 100;

type SizeDirectoryProps = {
  depth?: number;
  heading?: string;
  compact?: boolean;
};

export default function SizeDirectory({
  depth,
  heading = "Filter Hero sizes",
  compact = false,
}: SizeDirectoryProps) {
  const activeDepth = depth ?? 1;
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const widths = useMemo(() => catalogWidthsForDepth(activeDepth), [activeDepth]);
  const widthOptions = useMemo(
    () => Array.from(new Set(widths.map((w) => Math.floor(w)))).sort((a, b) => a - b),
    [widths],
  );
  const allForDepth = useMemo(
    () => getSizesByThickness(activeDepth),
    [activeDepth],
  );
  const sizes = useMemo(() => {
    if (width != null) {
      return allForDepth.filter((s) => Math.floor(s.width) === width);
    }
    return allForDepth;
  }, [allForDepth, width]);
  const totalPages = Math.max(1, Math.ceil(sizes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageSizes = sizes.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const visible =
    expanded || safePage > 0 ? pageSizes : pageSizes.slice(0, PREVIEW_COUNT);
  const canToggle = safePage === 0 && pageSizes.length > PREVIEW_COUNT;

  useEffect(() => {
    setWidth(null);
    setPage(0);
    setExpanded(false);
  }, [activeDepth]);

  const goPage = (next: number) => {
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
    setExpanded(true);
  };

  const resetList = () => {
    setPage(0);
    setExpanded(false);
  };

  const pickAllWidths = () => {
    setWidth(null);
    resetList();
  };

  const pickWidth = (next: number) => {
    setWidth(next);
    resetList();
  };

  const formatInches = (value: number) => `${value}"`;

  const chipClass = (active: boolean) =>
    `inline-flex min-h-11 items-center px-3.5 py-2 rounded-xl text-sm font-semibold border shadow-sm transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-white border-border hover:border-primary/40 hover:-translate-y-0.5"
    }`;

  return (
    <section
      id="size-directory"
      className={compact ? "" : "py-16 md:py-20 scroll-mt-20"}
      aria-label={heading}
    >
      <div className={compact ? "" : "container"}>
        {!compact && (
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <span className="section-label">Size catalog</span>
              <h2
                id="size-directory-heading"
                className="text-2xl md:text-4xl font-bold tracking-tight"
              >
                {heading}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {allForDepth.length.toLocaleString()} sizes at {activeDepth}" thick.
                Pick a width to narrow it down.
              </p>
            </div>
            <Link href="/sizes" className="section-link">
              View all sizes
            </Link>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div>
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Depth
            </p>
            <nav className="flex flex-wrap gap-2" aria-label="Filter depth">
              {THICKNESSES.map((d) => {
                const active = activeDepth === d;
                return (
                  <Link
                    key={d}
                    href={`/filters/${d}-inch`}
                    className={`inline-flex min-h-11 items-center px-3.5 py-2 rounded-xl text-sm font-semibold border shadow-sm transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border hover:border-primary/40 hover:-translate-y-0.5"
                    }`}
                  >
                    {formatInches(d)} depth
                  </Link>
                );
              })}
              <Link
                href="/custom-air-filters"
                className="inline-flex min-h-11 items-center px-3.5 py-2 rounded-xl text-sm font-semibold border border-border bg-white shadow-sm hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                Custom Air Filters
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Width
            </p>
            <nav className="flex flex-wrap gap-2" aria-label="Filter width">
              <button
                type="button"
                onClick={pickAllWidths}
                className={chipClass(width == null)}
              >
                All widths
              </button>
              {widthOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => pickWidth(option)}
                  className={chipClass(width === option)}
                >
                  {formatInches(option)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          {width != null
            ? `${sizes.length} size${sizes.length === 1 ? "" : "s"} · ${formatInches(width)}-inch widths × ${formatInches(activeDepth)} depth`
            : `Page ${safePage + 1} of ${totalPages} · ${sizes.length} sizes at ${formatInches(activeDepth)} depth`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visible.map((s) => (
            <Link
              key={s.slug}
              href={`/sizes/${encodeURIComponent(s.slug)}`}
              className="size-chip !py-3"
            >
              {s.slug}
            </Link>
          ))}
        </div>

        {canToggle && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-6 mr-4 text-sm font-semibold text-primary hover:underline"
          >
            Show more sizes ({pageSizes.length - PREVIEW_COUNT} more on this page)
          </button>
        )}
        {expanded && safePage === 0 && pageSizes.length > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-6 text-sm font-semibold text-primary hover:underline"
          >
            Show less sizes
          </button>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="min-h-11 px-3 py-2 text-sm rounded-lg border border-border disabled:opacity-40"
              disabled={safePage === 0}
              onClick={() => goPage(safePage - 1)}
            >
              Previous page
            </button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 2)
              .map((i, idx, arr) => {
                const prev = arr[idx - 1];
                const gap = prev !== undefined && i - prev > 1;
                return (
                  <span key={i} className="contents">
                    {gap && <span className="px-1 text-muted-foreground">…</span>}
                    <button
                      type="button"
                      onClick={() => goPage(i)}
                      className={`min-h-11 min-w-11 px-3 py-2 text-sm rounded-lg border ${
                        i === safePage
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {i + 1}
                    </button>
                  </span>
                );
              })}
            <button
              type="button"
              className="min-h-11 px-3 py-2 text-sm rounded-lg border border-border disabled:opacity-40"
              disabled={safePage >= totalPages - 1}
              onClick={() => goPage(safePage + 1)}
            >
              Next page
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

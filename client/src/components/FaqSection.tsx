import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Droplets,
  HelpCircle,
  Home,
  MessageCircle,
  Package,
  Ruler,
  Search,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CHANGE_GUIDE_PATH, type FaqItem } from "@shared/seo";

type FaqSectionProps = {
  faqs: FaqItem[];
  title?: string;
  subtitle?: string;
  tone?: "sheet" | "band";
};

const CATEGORY_META: Record<string, { icon: LucideIcon; hint: string }> = {
  Sizing: { icon: Ruler, hint: "Fit and dimensions" },
  Fit: { icon: Ruler, hint: "Will it slide in" },
  Replacement: { icon: Clock, hint: "When to swap" },
  Timing: { icon: Clock, hint: "How often" },
  MERV: { icon: Wind, hint: "What it catches" },
  Ordering: { icon: Package, hint: "Brands and shipping" },
  "Your home": { icon: Home, hint: "Pets, allergies, fan" },
  "Warning signs": { icon: AlertTriangle, hint: "When it's overdue" },
  Care: { icon: Droplets, hint: "What not to do" },
  Quotes: { icon: MessageCircle, hint: "Custom sizes" },
};

function categoryMeta(name: string) {
  return CATEGORY_META[name] ?? { icon: HelpCircle, hint: "Common questions" };
}

function matchesQuery(faq: FaqItem, query: string) {
  if (!query) return true;
  const haystack = `${faq.question} ${faq.answer} ${faq.category ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

function FaqActionLink({
  href,
  label,
  onBand,
}: {
  href: string;
  label: string;
  onBand: boolean;
}) {
  const className = cn(
    "mt-4 inline-flex items-center gap-1.5 text-sm font-bold tracking-tight transition-colors",
    onBand
      ? "text-white underline decoration-white/55 underline-offset-4 hover:decoration-white"
      : "text-primary hover:text-hero",
  );
  const inner = (
    <>
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </>
  );
  if (href.startsWith("/") && !href.includes("#")) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}

function FaqCard({
  faq,
  onBand,
}: {
  faq: FaqItem;
  onBand: boolean;
}) {
  const category = faq.category;
  const Icon = category ? categoryMeta(category).icon : HelpCircle;

  return (
    <AccordionItem value={faq.question} className="faq-card border-0">
      <AccordionTrigger
        className={cn(
          "faq-card-trigger items-center px-4 py-4 text-left text-base font-semibold hover:no-underline md:px-5 md:text-lg",
          onBand && "text-white",
        )}
      >
        <span className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
          <span
            className={cn("faq-card-icon", onBand && "bg-white/10 text-ice")}
            aria-hidden
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="seo-speakable-q block leading-snug">{faq.question}</span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-5 md:px-5 md:pl-[4.25rem]">
        <p
          className={cn(
            "leading-relaxed seo-speakable-a",
            onBand ? "font-medium text-white" : "text-muted-foreground",
          )}
        >
          {faq.answer}
        </p>
        {faq.action && (
          <FaqActionLink
            href={faq.action.href}
            label={faq.action.label}
            onBand={onBand}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Visible FAQ block — pairs with FAQPage JSON-LD for AEO / VEO / AIO.
 */
export default function FaqSection({
  faqs,
  title = "Filter questions, answered",
  subtitle = "Straight answers about filter size, MERV, and replacement timing.",
  tone = "sheet",
}: FaqSectionProps) {
  const onBand = tone === "band";
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");

  const normalizedQuery = query.trim().toLowerCase();

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const faq of faqs) {
      if (faq.category && !seen.includes(faq.category)) seen.push(faq.category);
    }
    return seen;
  }, [faqs]);

  const showTopics = categories.length >= 2 && faqs.length >= 5;
  const showSearch = faqs.length >= 5;

  const visible = useMemo(() => {
    return faqs.filter((faq) => {
      if (topic !== "all" && faq.category !== topic) return false;
      return matchesQuery(faq, normalizedQuery);
    });
  }, [faqs, topic, normalizedQuery]);

  const groups = useMemo(() => {
    const grouped = showTopics && topic === "all" && !normalizedQuery;
    if (!grouped) {
      return [{ name: topic === "all" ? "" : topic, items: visible }];
    }
    return categories
      .map((name) => ({
        name,
        items: visible.filter((faq) => faq.category === name),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, visible, showTopics, topic, normalizedQuery]);

  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const faq of faqs) {
      if (!faq.category || !matchesQuery(faq, normalizedQuery)) continue;
      counts.set(faq.category, (counts.get(faq.category) ?? 0) + 1);
    }
    return counts;
  }, [faqs, normalizedQuery]);

  return (
    <section
      id="faq"
      className="py-16 md:py-24 scroll-mt-20"
      aria-labelledby="faq-heading"
    >
      <div className="container max-w-4xl">
        <div className="mb-10">
          <span className="section-label">Answers</span>
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl font-bold mb-3 tracking-tight"
          >
            {title}
          </h2>
          <p
            className={cn(
              "max-w-2xl leading-relaxed",
              onBand ? "text-white/90" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        </div>

        {showSearch && (
          <label className="faq-search mb-5 flex items-center gap-3">
            <Search
              className={cn("h-4 w-4 shrink-0", onBand ? "text-ice" : "text-mesh")}
              strokeWidth={1.75}
            />
            <span className="sr-only">Search questions</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search size, MERV, shipping…"
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:text-base",
                onBand && "text-white placeholder:text-white/55",
              )}
            />
          </label>
        )}

        {showTopics && (
          <div
            className={cn(
              "mb-8 grid grid-cols-2 gap-2.5",
              categories.length === 3 && "sm:grid-cols-3",
              categories.length >= 4 && "sm:grid-cols-4",
            )}
            role="group"
            aria-label="Filter questions by topic"
          >
            {categories.map((name) => {
              const meta = categoryMeta(name);
              const Icon = meta.icon;
              const count = topicCounts.get(name) ?? 0;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={topic === name}
                  disabled={count === 0}
                  className={cn("faq-topic", topic === name && "faq-topic-active")}
                  onClick={() => setTopic((current) => (current === name ? "all" : name))}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  <span className="faq-topic-name">{name}</span>
                  <span className="faq-topic-hint">{meta.hint}</span>
                  <span className="faq-topic-count">
                    {count} {count === 1 ? "question" : "questions"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="faq-empty">
            <p className="font-bold tracking-tight">No matching questions</p>
            <p className={onBand ? "text-white/90" : "text-muted-foreground"}>
              Try a different search, or jump to the size finder.
            </p>
            <a href="/#finder" className="section-link mt-3">
              Find your size
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <Accordion
            key={`${topic}-${normalizedQuery}`}
            type="single"
            collapsible
            defaultValue={visible[0]?.question}
            className="space-y-6"
          >
            {groups.map((group) => (
              <div key={group.name || "all"} className="space-y-3">
                {group.name && groups.length > 1 && (
                  <p
                    className={cn(
                      "px-1 text-[0.72rem] font-extrabold uppercase tracking-[0.14em]",
                      onBand ? "text-white" : "text-mesh",
                    )}
                  >
                    {group.name}
                    <span className="ml-2 font-semibold tracking-normal opacity-70">
                      {group.items.length}
                    </span>
                  </p>
                )}
                <div className="space-y-3">
                  {group.items.map((faq) => (
                    <FaqCard key={faq.question} faq={faq} onBand={onBand} />
                  ))}
                </div>
              </div>
            ))}
          </Accordion>
        )}

        <div className={cn("faq-help mt-10", onBand && "faq-help-band")}>
          <div>
            <p className="font-bold tracking-tight">Still looking?</p>
            <p
              className={cn(
                "mt-1 text-sm leading-relaxed",
                onBand ? "text-white/90" : "text-muted-foreground",
              )}
            >
              Find the exact size, get a replacement date, or talk to a person
              who knows filters.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/#finder" className="faq-help-link">
              Find your size
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <Link href={CHANGE_GUIDE_PATH} className="faq-help-link">
              When to change
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a href="/#contact" className="faq-help-link">
              Ask a person
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { CHANGE_GUIDE_PATH } from "@shared/seo";
import { liveListPrice } from "@shared/products";
import {
  HVAC_DIRTY_FILTER_ENERGY,
  HVAC_OVERDUE_HEADLINE,
  HVAC_OVERDUE_KICKER,
  HVAC_OVERDUE_SUB,
  HVAC_REAL_REPAIRS,
} from "@shared/hvac-overdue-costs";
import { cn } from "@/lib/utils";

const FLAGSHIP_FILTER_PRICE = liveListPrice("20x25x1", 8) ?? 9.99;

/**
 * Navy skip-a-change repair list. Same copy on size PDPs, thickness hubs,
 * brand shop pages, and custom quote — keep Filter Hero figures in one place.
 */
export default function ProductOverduePanel({
  unitPrice,
  tone = "theater",
}: {
  unitPrice?: number;
  tone?: "theater" | "sheet";
}) {
  const price = unitPrice && unitPrice > 0 ? unitPrice : FLAGSHIP_FILTER_PRICE;
  return (
    <aside
      className={cn("product-overdue", tone === "sheet" && "product-overdue-sheet")}
      aria-label="Cost of skipping a filter change"
    >
      <p className="product-overdue-kicker">{HVAC_OVERDUE_KICKER}</p>
      <p className="product-overdue-title">{HVAC_OVERDUE_HEADLINE}</p>
      <p className="product-overdue-sub">{HVAC_OVERDUE_SUB}</p>
      <ul className="product-overdue-list">
        {HVAC_REAL_REPAIRS.map((row) => (
          <li key={row.name}>
            <span className="product-overdue-repair">{row.name}</span>
            <span className="product-overdue-dollar">{row.price}</span>
          </li>
        ))}
      </ul>
      <p className="product-overdue-energy">
        Dirty filter → cooling costs up {HVAC_DIRTY_FILTER_ENERGY} (U.S. DOE)
      </p>
      <p className="product-overdue-vs">
        A ${price.toFixed(2)} filter is cheaper than any line above.
      </p>
      <Link href={CHANGE_GUIDE_PATH} className="product-overdue-link">
        See the overdue curve
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </aside>
  );
}

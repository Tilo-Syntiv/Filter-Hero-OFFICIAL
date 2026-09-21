/**
 * Typical U.S. residential repair ballparks when a clogged filter starves airflow.
 * Ranges reflect common 2024–2025 contractor / consumer cost guides — not quotes.
 * Used on size PDPs, the homepage overdue band, and the change guide —
 * keep these figures in one place.
 */

/** Named repairs shoppers actually get billed for. */
export const HVAC_REAL_REPAIRS = [
  {
    name: "Service call / iced-coil thaw",
    price: "$150–$450",
    note: "Tech visit after the indoor coil freezes from blocked airflow.",
  },
  {
    name: "Blower motor replacement",
    price: "$350–$900",
    note: "The fan that moves house air — overtime under a clogged filter.",
  },
  {
    name: "Evaporator coil replacement",
    price: "$600–$2,500",
    note: "Frozen / corroded indoor coil. Labor-heavy; often needs refrigerant work.",
  },
  {
    name: "AC compressor replacement",
    price: "$1,200–$3,000",
    note: "Outdoor unit heart. On older systems, techs often quote a full replacement.",
  },
  {
    name: "Furnace heat exchanger",
    price: "$1,000–$3,000",
    note: "Overheat stress from starved return air. Safety issue — not a DIY patch.",
  },
] as const;

/** Timeline cards on the change-guide “overdue curve.” */
export const HVAC_WAIT_STAGES = [
  {
    when: "1–2 months late",
    cost: "Quiet money leak",
    what: "Dust wins. Energy creeps 5–15%. You probably haven’t noticed yet — that’s the trap.",
  },
  {
    when: "3–6 months late",
    cost: "Blower overtime",
    what: "Weak airflow, uneven rooms, a film on the TV. If the motor quits: $350–$900 to replace.",
  },
  {
    when: "6–12 months late",
    cost: "$600–$2,500",
    what: "Iced evaporator coil in summer. Thaw service is $150–$450; a full coil swap runs $600–$2,500.",
  },
  {
    when: "A year or more",
    cost: "$1,200–$3,000+",
    what: "Compressor ($1,200–$3,000) or furnace heat exchanger ($1,000–$3,000). That’s a replacement quote, not a filter.",
  },
] as const;

/**
 * Compact pair for the size-page navy panel — biggest sticker shocks.
 * Prefer HVAC_REAL_REPAIRS for the full menu.
 */
export const HVAC_OVERDUE_REPAIRS = [
  {
    when: "6–12 months late",
    range: "$600–$2,500",
    label: "Evaporator coil replacement",
    detail:
      "Iced indoor coil from blocked airflow. Service thaw $150–$450; full coil $600–$2,500.",
  },
  {
    when: "A year or more",
    range: "$1,200–$3,000+",
    label: "Compressor or heat exchanger",
    detail:
      "Compressor $1,200–$3,000. Furnace heat exchanger $1,000–$3,000. Either dwarfs a year of filters.",
  },
] as const;

/** U.S. Department of Energy: dirty filter can lift cooling costs. */
export const HVAC_DIRTY_FILTER_ENERGY = "5–15%";

export const HVAC_OVERDUE_HEADLINE =
  "A dirty filter costs more than the filter.";

export const HVAC_OVERDUE_KICKER = "Skip a change?";

export const HVAC_OVERDUE_SUB =
  "Real repair ballparks homeowners pay when airflow stays blocked — not scare fiction.";

/** Change-guide / FAQ answer for “what if I don’t change it.” */
export const HVAC_CLOGGED_FILTER_FAQ = `Indoor air quality drops, the blower works harder, and energy use can rise ${HVAC_DIRTY_FILTER_ENERGY} according to the U.S. Department of Energy. Leave it long enough and you risk real repair invoices: service / iced-coil thaw ${HVAC_REAL_REPAIRS[0].price}, blower motor ${HVAC_REAL_REPAIRS[1].price}, evaporator coil ${HVAC_REAL_REPAIRS[2].price}, compressor ${HVAC_REAL_REPAIRS[3].price}, or furnace heat exchanger ${HVAC_REAL_REPAIRS[4].price}. Any of those dwarfs a pack of filters.`;

/** Alias used by this checkout's SEO module. */
export const HVAC_CLOGGED_FILTER_FAQ_ANSWER = HVAC_CLOGGED_FILTER_FAQ;

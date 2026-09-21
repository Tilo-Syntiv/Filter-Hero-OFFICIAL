import { useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CADENCE,
  computeCadence,
  formatDepth,
  upcomingSwapDates,
  type CadenceInput,
  type MervKey,
  type Occupants,
  type Pets,
  type Thickness,
} from "@/lib/filter-cadence";
import { CHANGE_GUIDE_PATH } from "@shared/seo";
import { THICKNESSES, mervTypesForDisplay } from "@shared/products";
import { setPowerPackQty, setPreferredMerv } from "@/lib/merv-pref";
import { scrollToHashTarget } from "@/hooks/useHashScroll";
import { Input } from "@/components/ui/input";
import ClockDeck from "@/components/ClockDeck";
import { identifyShopper } from "@/lib/klaviyo";

function Chip({
  selected,
  onClick,
  children,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all",
        selected
          ? "text-white shadow-sm"
          : "border-border bg-white text-foreground hover:border-ice",
        selected && !color && "border-navy bg-navy",
      )}
      style={
        color
          ? selected
            ? { backgroundColor: color, borderColor: color }
            : { borderColor: color }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function ToggleChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-all",
        selected
          ? "border-hero/40 bg-hero text-white shadow-sm"
          : "border-border bg-white text-foreground hover:border-ice",
      )}
    >
      {children}
    </button>
  );
}

export default function FilterPower() {
  const [input, setInput] = useState<CadenceInput>(DEFAULT_CADENCE);
  const [location] = useLocation();
  const result = useMemo(() => computeCadence(input), [input]);
  const swapDates = useMemo(
    () => upcomingSwapDates(result, Math.max(4, result.yearCount + 1)),
    [result],
  );
  const set = <K extends keyof CadenceInput>(key: K, value: CadenceInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const lockShop = () => {
    setPreferredMerv(input.merv);
    setPowerPackQty(result.packQty);
  };

  const goFinder = (event: MouseEvent<HTMLAnchorElement>) => {
    lockShop();
    if (location === "/") {
      event.preventDefault();
      scrollToHashTarget("finder");
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.85rem] border border-ice/30 bg-[#1e3a66] shadow-[0_24px_60px_rgba(16,32,56,0.32)]">
      <div className="grid lg:grid-cols-12 lg:items-stretch">
        <div className="h-full lg:col-span-5">
          <ClockDeck result={result} input={input} dates={swapDates} />
        </div>

        <div className="space-y-5 bg-[linear-gradient(180deg,#fafbfc_0%,#eef1f6_100%)] px-4 py-6 sm:px-6 sm:py-7 lg:col-span-7">
          <fieldset>
            <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Thickness
            </legend>
            <div className="flex flex-wrap gap-2">
              {THICKNESSES.map((d) => (
                <Chip
                  key={d}
                  selected={input.depth === d}
                  onClick={() => set("depth", d as Thickness)}
                >
                  {formatDepth(d)}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              MERV
            </legend>
            <div className="flex flex-wrap gap-2">
              {mervTypesForDisplay().map((m) => (
                <Chip
                  key={m.key}
                  selected={input.merv === m.key}
                  onClick={() => set("merv", m.key as MervKey)}
                  color={m.badgeColor}
                >
                  {m.name}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Pets
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["none", "No pets"],
                  ["one", "One pet"],
                  ["pack", "A pack"],
                ] as [Pets, string][]
              ).map(([id, label]) => (
                <Chip key={id} selected={input.pets === id} onClick={() => set("pets", id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Who lives here
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["quiet", "1–2 people"],
                  ["family", "3–4 people"],
                  ["full", "5+ people"],
                ] as [Occupants, string][]
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  selected={input.occupants === id}
                  onClick={() => set("occupants", id)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Extra load
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ToggleChip
                selected={input.allergies}
                onClick={() => set("allergies", !input.allergies)}
              >
                Allergies / asthma
              </ToggleChip>
              <ToggleChip
                selected={input.smoking}
                onClick={() => set("smoking", !input.smoking)}
              >
                Indoor smoke
              </ToggleChip>
              <ToggleChip selected={input.fanOn} onClick={() => set("fanOn", !input.fanOn)}>
                Fan always on
              </ToggleChip>
              <ToggleChip selected={input.dusty} onClick={() => set("dusty", !input.dusty)}>
                Dusty / dry air
              </ToggleChip>
              <ToggleChip
                selected={input.smokeSeason}
                onClick={() => set("smokeSeason", !input.smokeSeason)}
              >
                Wildfire smoke
              </ToggleChip>
              <ToggleChip
                selected={input.renovation}
                onClick={() => set("renovation", !input.renovation)}
              >
                Renovation dust
              </ToggleChip>
            </div>
          </fieldset>

          <div className="rounded-2xl border border-ice/40 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              A year of air
            </p>
            <p className="mt-1 text-xl font-extrabold tracking-tight">{result.packHeadline}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.packDetail} Suggested MERV: {result.recommendedMervName}.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/#finder"
                onClick={goFinder}
                className="hero-shop-btn inline-flex h-12 items-center justify-center px-6 text-white"
              >
                Shop a {result.packQty}-pack
                <ArrowRight className="h-4 w-4" />
              </Link>
              {location !== CHANGE_GUIDE_PATH && (
                <Link
                  href={`${CHANGE_GUIDE_PATH}#cadence`}
                  className="inline-flex h-12 items-center justify-center px-4 text-sm font-bold text-navy hover:underline"
                >
                  How the clock works
                </Link>
              )}
            </div>
          </div>

          <ReminderCapture result={result} input={input} />
        </div>
      </div>
    </div>
  );
}

function ReminderCapture({
  result,
  input,
}: {
  result: ReturnType<typeof computeCadence>;
  input: CadenceInput;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    setStatus("sending");
    try {
      identifyShopper({
        email,
        properties: {
          house_type: result.house.id,
          change_interval_days: result.days,
          preferred_merv: input.merv,
        },
      });
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Filter Clock reminder",
          email,
          message: [
            `Clock cadence saved (no email until purchase). Next swap ${result.nextDate}.`,
            `Profile: ${result.house.name} (${result.label}).`,
            `Filter: ${formatDepth(input.depth)} ${result.recommendedMervName}.`,
            `Suggested pack: ${result.packQty}.`,
          ].join(" "),
          intent: "reminder",
          marketingConsent: false,
          cadence: {
            next_change_date: result.nextIso,
            change_interval_days: result.days,
            house_type: result.house.id,
            recommended_merv: result.recommendedMerv,
            selected_merv: input.merv,
            depth: input.depth,
            pack_qty: result.packQty,
            pets: input.pets,
            occupants: input.occupants,
            allergies: input.allergies,
            smoking: input.smoking,
            kids: input.kids,
            sqft: input.sqft,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Couldn't save that — the reminder service is offline");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      toast.error(err instanceof Error ? err.message : "Couldn't save that — try again");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-hero/30 bg-hero/5 p-4">
        <Check className="h-5 w-5 shrink-0 text-hero" />
        <p className="text-sm font-semibold text-navy">
          Saved. Replacement emails start after you buy — next swap around{" "}
          {result.nextDate}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-white p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
        <Mail className="h-3 w-3" />
        Save this cadence
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Checking the clock does not start emails. After you buy, we&apos;ll remind you
        before the next swap ({result.nextDate}).
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 flex-1"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="hero-shop-btn inline-flex h-11 items-center justify-center gap-1.5 px-5 text-sm text-white disabled:opacity-70"
        >
          {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {status === "sending" ? "Saving…" : "Save cadence"}
        </button>
      </div>
    </form>
  );
}

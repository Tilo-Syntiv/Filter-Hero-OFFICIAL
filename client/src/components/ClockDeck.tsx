import { useEffect, useState, type CSSProperties } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  calendarDestinations,
  calendarEventFromResult,
  eventIcs,
  formatDepth,
  swapWaitDays,
  type CadenceInput,
  type CadenceResult,
} from "@/lib/filter-cadence";
import { MERV_TYPES } from "@shared/products";
import { getSiteUrl } from "@/hooks/useSeo";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

function yearValues(dates: Date[]) {
  const years = dates.map((d) => d.getFullYear());
  const min = Math.min(...years, new Date().getFullYear());
  const max = Math.max(...years, min + 2);
  const list: string[] = [];
  for (let y = min; y <= max; y++) list.push(String(y));
  return list;
}

function Drum({
  values,
  index,
  delay = 0,
  size = "month",
}: {
  values: string[];
  index: number;
  delay?: number;
  size?: "month" | "day" | "year";
}) {
  const reduce = useReducedMotion();
  const n = Math.max(values.length, 1);
  const angle = 360 / n;
  const safe = ((index % n) + n) % n;
  const radius = n < 2 ? 3.05 : 3.05 / Math.tan(Math.PI / n);

  return (
    <div
      className={cn("cal-drum", `is-${size}`)}
      style={{ "--cal-radius": `${radius}rem` } as CSSProperties}
    >
      <div
        className="cal-drum-wheel"
        style={{
          transform: `rotateX(${-safe * angle}deg)`,
          transitionDuration: reduce ? "0ms" : "720ms",
          transitionDelay: reduce ? "0ms" : `${delay}ms`,
        }}
      >
        {values.map((value, i) => (
          <div
            key={`${value}-${i}`}
            className="cal-drum-face"
            style={{ transform: `rotateX(${i * angle}deg) translateZ(var(--cal-radius))` }}
          >
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadIcs(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClockDeck({
  result,
  input,
  dates,
}: {
  result: CadenceResult;
  input: CadenceInput;
  dates: Date[];
}) {
  const [focus, setFocus] = useState(0);
  useEffect(() => {
    setFocus(0);
  }, [result.days, result.nextIso]);

  const list = dates.slice(0, 8);
  const safeFocus = Math.min(focus, Math.max(0, list.length - 1));
  const date = list[safeFocus] ?? new Date();
  const remain = swapWaitDays(result.days, safeFocus);
  const years = yearValues(list.length ? list : [date]);
  const mervName = MERV_TYPES.find((m) => m.key === input.merv)?.name ?? "MERV 8";
  const event = calendarEventFromResult(result, date, getSiteUrl());
  const dest = calendarDestinations(event);

  const saveIcs = () => downloadIcs(eventIcs(event), "filter-hero-change.ics");

  const turn = (dir: -1 | 1) => {
    setFocus((n) => Math.min(list.length - 1, Math.max(0, n + dir)));
  };

  return (
    <div className="cal-chassis">
      <header className="cal-top">
        <p className="cal-kicker">Filter Clock</p>
        <p className="cal-house">{result.house.name}</p>
      </header>

      <div className="cal-stage">
        <button
          type="button"
          className="cal-knob"
          aria-label="Previous change date"
          disabled={safeFocus === 0}
          onClick={() => turn(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="cal-windows">
          <div className="cal-col">
            <Drum values={MONTHS} index={date.getMonth()} delay={0} size="month" />
            <span className="cal-col-label">Month</span>
          </div>
          <div className="cal-col">
            <Drum values={DAYS} index={date.getDate() - 1} delay={90} size="day" />
            <span className="cal-col-label">Day</span>
          </div>
          <div className="cal-col">
            <Drum
              values={years}
              index={Math.max(0, years.indexOf(String(date.getFullYear())))}
              delay={180}
              size="year"
            />
            <span className="cal-col-label">Year</span>
          </div>
        </div>

        <button
          type="button"
          className="cal-knob"
          aria-label="Next change date"
          disabled={safeFocus >= list.length - 1}
          onClick={() => turn(1)}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <p className="cal-hero" aria-live="polite">
        <span className="cal-hero-days">{remain}</span>
        <span className="cal-hero-unit">days</span>
        <span className="cal-readout">
          {safeFocus === 0 ? "until your next change" : "until this change"}
        </span>
      </p>
      <p className="cal-sub">
        {mervName} · {formatDepth(input.depth)} · {result.label}
      </p>

      <div className="cal-year">
        <p className="cal-year-label">Upcoming changes · every {result.days} days</p>
        <div className="cal-year-list" role="listbox" aria-label="Upcoming change dates">
          {list.map((d, i) => {
            const wait = swapWaitDays(result.days, i);
            return (
              <button
                key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                type="button"
                role="option"
                aria-selected={i === safeFocus}
                className={cn("cal-slot", i === safeFocus && "is-active")}
                onClick={() => setFocus(i)}
              >
                <span className="cal-slot-mark" />
                <span className="cal-slot-date">
                  {d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="cal-slot-meta">{wait} days</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="cal-actions">
        <p className="cal-actions-label">
          <CalendarPlus className="h-3.5 w-3.5" />
          Add this date to
        </p>
        <div className="cal-cal-list">
          <button type="button" className="cal-btn" onClick={saveIcs}>
            Apple Calendar
          </button>
          <a href={dest.google} target="_blank" rel="noopener noreferrer" className="cal-btn is-ghost">
            Google
          </a>
          <a href={dest.outlook} target="_blank" rel="noopener noreferrer" className="cal-btn is-ghost">
            Outlook
          </a>
          <a href={dest.office} target="_blank" rel="noopener noreferrer" className="cal-btn is-ghost">
            Microsoft 365
          </a>
          <a href={dest.yahoo} target="_blank" rel="noopener noreferrer" className="cal-btn is-ghost">
            Yahoo
          </a>
          <button type="button" className="cal-btn is-ghost" onClick={saveIcs}>
            Other (.ics)
          </button>
        </div>
      </div>
    </div>
  );
}

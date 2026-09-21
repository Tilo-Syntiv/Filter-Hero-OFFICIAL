import {
  BASE_DAYS,
  DEFAULT_CADENCE,
  addLocalDays,
  cadenceLabel,
  calendarDaysUntil,
  calendarDestinations,
  calendarEventFromResult,
  computeCadence,
  eventIcs,
  suggestedPackQty,
  swapWaitDays,
  upcomingSwapDates,
  yearFilterCount,
  type CadenceInput,
  type MervKey,
  type Thickness,
} from "../client/src/lib/filter-cadence.ts";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const from = new Date(2026, 7, 20, 23, 45, 0); // Aug 20, 2026 11:45pm — late hour + DST-sensitive
const quiet = computeCadence(DEFAULT_CADENCE, from);
assert(quiet.days === 90, `default 1" MERV 8 should be 90 days, got ${quiet.days}`);
assert(quiet.label === "Every 90 days", `label must match days, got ${quiet.label}`);
assert(quiet.packHeadline === "Every 90 days.", `headline must match days, got ${quiet.packHeadline}`);
assert(quiet.nextIso === "20261118", `next iso should be 20261118, got ${quiet.nextIso}`);
assert(quiet.packQty === 4, `90-day house should suggest a 4-pack, got ${quiet.packQty}`);
assert(yearFilterCount(90) === 4, "365/90 rounds to 4");
assert(suggestedPackQty(90) === 4, "pack ladder should pick 4");
assert(cadenceLabel(75) === "Every 75 days", "75 days must not say 3 months");
assert(cadenceLabel(28) === "Every 28 days", "28 days must not say 30 days");

const half = computeCadence({ ...DEFAULT_CADENCE, depth: 0.5 }, from);
assert(half.days === 30, `undrained ½" MERV 8 should keep the 30-day baseline, got ${half.days}`);
assert(half.label === "Every 30 days", `½" label must match 30 days, got ${half.label}`);

const dates = upcomingSwapDates(quiet, 5, from);
assert(dates.length === 5, "should return requested count");
assert(calendarDaysUntil(dates[0], from) === 90, "first drum date must match cadence days");
assert(
  dates[0].getFullYear() === 2026 && dates[0].getMonth() === 10 && dates[0].getDate() === 18,
  `first date should be Nov 18 2026, got ${dates[0].toString()}`,
);
assert(calendarDaysUntil(dates[1], from) === 180, "second date should be 2× cadence");
assert(calendarDaysUntil(dates[0], from) === quiet.days, "hero number must match engine");
assert(swapWaitDays(quiet.days, 0) === 90, "first slot wait is the cadence");
assert(swapWaitDays(quiet.days, 1) === 180, "second slot wait is 2× cadence");

const depths: Thickness[] = [0.5, 1, 2, 4, 5];
const mervs: MervKey[] = ["8", "carbon", "11", "13"];
for (const depth of depths) {
  for (const merv of mervs) {
    const row = computeCadence({ ...DEFAULT_CADENCE, depth, merv }, from);
    assert(
      row.label === `Every ${row.days} days`,
      `${merv} ${depth}" label ${row.label} must equal Every ${row.days} days`,
    );
    const rowDates = upcomingSwapDates(row, 5, from);
    rowDates.forEach((date, i) => {
      const wait = calendarDaysUntil(date, from);
      const expected = swapWaitDays(row.days, i);
      assert(
        wait === expected,
        `${merv} ${depth}" slot ${i} is ${wait} days, expected ${expected}`,
      );
    });
  }
}

assert(BASE_DAYS[4] === 270, '4" baseline is 270 days, not 240');

const pack: CadenceInput = { ...DEFAULT_CADENCE, pets: "pack" };
const packResult = computeCadence(pack, from);
assert(packResult.days < 90, `pack house should shorten life, got ${packResult.days}`);
assert(packResult.house.id === "pack", `house should be pack, got ${packResult.house.id}`);
assert(packResult.recommendedMerv === "11", `pack should recommend MERV 11, got ${packResult.recommendedMerv}`);
assert(
  packResult.label === `Every ${packResult.days} days`,
  `pack label must match days, got ${packResult.label}`,
);

const thick = computeCadence({ ...DEFAULT_CADENCE, depth: 5 }, from);
assert(thick.days > 90, `5" should last longer than 90, got ${thick.days}`);
assert(thick.packQty === 1 || thick.packQty === 2, `thick media pack should be 1 or 2, got ${thick.packQty}`);
assert(thick.label === `Every ${thick.days} days`, `5" label must match days, got ${thick.label}`);

const dstFrom = new Date(2026, 2, 1, 22, 0, 0); // Mar 1, across US spring-forward
const dst = computeCadence(DEFAULT_CADENCE, dstFrom);
const dstDates = upcomingSwapDates(dst, 1, dstFrom);
assert(
  calendarDaysUntil(dstDates[0], dstFrom) === dst.days,
  `DST should not shift cadence days (${dst.days} vs ${calendarDaysUntil(dstDates[0], dstFrom)})`,
);

const later = addLocalDays(from, 180);
const event = calendarEventFromResult(quiet, later, "https://filterhero.net");
assert(event.details.includes("February"), `event details should name the focused date, got ${event.details}`);
assert(event.details.includes("90-day cadence"), `event must name the cadence days, got ${event.details}`);
const dest = calendarDestinations(event);
const google = decodeURIComponent(dest.google);
const yahoo = decodeURIComponent(dest.yahoo);
assert(google.includes("dates=20270216/20270217"), `google all-day range, got ${google}`);
assert(yahoo.includes("st=20270216T000000"), `yahoo start should be timed, got ${yahoo}`);
assert(dest.outlook.includes("allday=true"), "outlook should be all-day");
assert(dest.office.includes("outlook.office.com"), "microsoft 365 link");

const ics = eventIcs(event);
assert(ics.includes("BEGIN:VCALENDAR"), "ics calendar wrapper");
assert(ics.includes("METHOD:PUBLISH"), "ics should publish");
assert(ics.includes("DTSTART;VALUE=DATE:20270216"), `ics start, got ${ics}`);
assert(ics.includes("DTEND;VALUE=DATE:20270217"), "ics exclusive end");
assert(ics.includes("\r\n"), "ics must use CRLF");

const allergies = computeCadence({ ...DEFAULT_CADENCE, allergies: true }, from);
assert(allergies.recommendedMerv === "13", "allergies recommend MERV 13");
assert(allergies.days < 90, `allergies should shorten, got ${allergies.days}`);
assert(
  allergies.label === `Every ${allergies.days} days`,
  `allergy label must match days, got ${allergies.label}`,
);

console.log("Filter Clock cadence checks passed.");
console.log(
  JSON.stringify(
    {
      quietDays: quiet.days,
      quietLabel: quiet.label,
      next: quiet.nextDate,
      halfDays: half.days,
      packDays: packResult.days,
      thickDays: thick.days,
      allergyDays: allergies.days,
    },
    null,
    2,
  ),
);

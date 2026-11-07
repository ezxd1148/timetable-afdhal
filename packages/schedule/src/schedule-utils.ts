/**
 * Timezone-safe date/time helpers for the weekly timetable.
 *
 * The timetable is defined in wall-clock time for Asia/Kuala_Lumpur (UTC+8).
 * To keep class times stable regardless of the user's browser timezone, dates
 * are represented as plain ISO calendar dates ("YYYY-MM-DD") that already
 * denote the correct day in Malaysia Time. Time-of-day values are parsed from
 * "HH:mm" strings directly and never go through `Date` parsing, which avoids
 * ambiguous date-string parsing and off-by-one shifts around midnight.
 */

export const TIME_ZONE = "Asia/Kuala_Lumpur";

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type DateParts = {
  year: number;
  month: number;
  day: number;
  iso: string;
};

export type TimeParts = {
  hours: number;
  minutes: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Parse a "YYYY-MM-DD" string into its numeric parts. */
export function parseISODate(iso: string): DateParts {
  const [year = NaN, month = NaN, day = NaN] = iso.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return { year, month, day, iso };
}

/**
 * Return the calendar date of `date` in the given timezone as an ISO string
 * ("YYYY-MM-DD"). Uses the Intl API so the result is correct even when the
 * browser or server runs in a different timezone.
 */
export function getDatePartsInZone(date: Date, timeZone: string = TIME_ZONE): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);

  return { year, month, day, iso: `${year}-${pad(month)}-${pad(day)}` };
}

/** ISO weekday of an ISO calendar date: 1 = Monday ... 7 = Sunday. */
export function getWeekdayFromISO(iso: string): number {
  const utcDay = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return utcDay === 0 ? 7 : utcDay;
}

/** True for a "YYYY-MM-DD" string naming a date that exists, so not "2026-11-31". */
export function isRealISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}

/** Add whole days to an ISO calendar date without any timezone surprises. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday (ISO date) of the week that contains `anchor`, in the given zone. */
export function getWeekMondayISO(anchor: Date, timeZone: string = TIME_ZONE): string {
  const { iso } = getDatePartsInZone(anchor, timeZone);
  return addDays(iso, 1 - getWeekdayFromISO(iso));
}

/** Minutes since midnight of `date` on the wall clock of the given zone. */
export function getMinutesInZone(date: Date, timeZone: string = TIME_ZONE): number {
  const [hours = 0, minutes = 0] = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

/** Parse a "HH:mm" string into numeric parts. */
export function parseTime(time: string): TimeParts {
  const [hours = NaN, minutes = NaN] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Invalid time value: ${time}`);
  }
  return { hours, minutes };
}

/** Convert a "HH:mm" string to minutes since midnight. */
export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

/** Format a "HH:mm" value as a 12-hour label, e.g. "08:00" -> "8:00 AM". */
export function formatTime(time: string): string {
  const { hours, minutes } = parseTime(time);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(minutes)} ${period}`;
}

/** Format a start/end pair as a human-readable range. */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/** Format a whole hour as a 24-hour gutter label, e.g. 8 -> "08:00". */
export function formatHourLabel(hour: number): string {
  return `${pad(hour)}:00`;
}

/** Short weekday and date, e.g. "Sat, 8 Nov". */
export function formatDayLabel(iso: string): string {
  const { month, day } = parseISODate(iso);
  return `${DAY_LABELS[getWeekdayFromISO(iso) - 1]}, ${day} ${MONTH_LABELS[month - 1]}`;
}

/** Human-readable Monday–Sunday range, e.g. "2 – 8 Nov 2026". */
export function formatWeekRange(mondayISO: string): string {
  const monday = parseISODate(mondayISO);
  const sunday = parseISODate(addDays(mondayISO, 6));

  if (monday.month === sunday.month) {
    return `${monday.day} – ${sunday.day} ${MONTH_LABELS[sunday.month - 1]} ${sunday.year}`;
  }

  return (
    `${monday.day} ${MONTH_LABELS[monday.month - 1]}` +
    ` – ${sunday.day} ${MONTH_LABELS[sunday.month - 1]} ${sunday.year}`
  );
}

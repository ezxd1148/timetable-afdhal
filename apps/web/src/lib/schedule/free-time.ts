import type { PublicPersonalEvent } from "@/components/schedule/personal-event";

import type { ClassOccurrence } from "./generate-occurrences";
import { formatTimeRange, timeToMinutes } from "./schedule-utils";

/** Window in which free time is reported, matching the calendar grid. */
export const FREE_TIME_START = "08:00";
export const FREE_TIME_END = "19:00";

export type FreeSlot = {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

type Interval = { start: number; end: number }; // Minutes since midnight.

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * Return the free gaps on `dateISO` inside FREE_TIME_START – FREE_TIME_END.
 *
 * Class occurrences and personal events are busy intervals; they are clipped
 * to the window, sorted, and merged when they overlap, then the gaps between
 * them are returned in chronological order. Time values are handled as
 * minutes since midnight, so no `Date` parsing is involved.
 */
export function getFreeSlots(
  dateISO: string,
  classOccurrences: readonly ClassOccurrence[],
  personalEvents: readonly PublicPersonalEvent[],
): FreeSlot[] {
  const windowStart = timeToMinutes(FREE_TIME_START);
  const windowEnd = timeToMinutes(FREE_TIME_END);

  const busy = [
    ...classOccurrences
      .filter((occurrence) => occurrence.dateISO === dateISO)
      .map(({ startTime, endTime }) => ({
        start: timeToMinutes(startTime),
        end: timeToMinutes(endTime),
      })),
    ...personalEvents
      .filter((event) => event.dateISO === dateISO)
      .map(({ startTime, endTime }) => ({
        start: timeToMinutes(startTime),
        end: timeToMinutes(endTime),
      })),
  ]
    .map(({ start, end }): Interval => ({
      start: Math.max(start, windowStart),
      end: Math.min(end, windowEnd),
    }))
    .filter(({ start, end }) => start < end)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Interval[] = [];
  for (const interval of busy) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push(interval);
    }
  }

  const slots: FreeSlot[] = [];
  let cursor = windowStart;
  for (const { start, end } of merged) {
    if (start > cursor) {
      slots.push({ startTime: minutesToTime(cursor), endTime: minutesToTime(start) });
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < windowEnd) {
    slots.push({ startTime: minutesToTime(cursor), endTime: minutesToTime(windowEnd) });
  }

  return slots;
}

/** Format a free slot as a time range, e.g. "10:00 AM – 12:30 PM". */
export function formatFreeSlot({ startTime, endTime }: FreeSlot): string {
  return formatTimeRange(startTime, endTime);
}

/** Format a free slot's length, e.g. "1h 30m", "45 min", "2h". */
export function formatFreeDuration({ startTime, endTime }: FreeSlot): string {
  const total = timeToMinutes(endTime) - timeToMinutes(startTime);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

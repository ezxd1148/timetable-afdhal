import { type BusyBlock, type FreeSlot, getFreeSlots, minutesToTime } from "./free-time";
import { generateOccurrencesForWeek } from "./generate-occurrences";
import { addDays, getWeekdayFromISO, timeToMinutes } from "./schedule-utils";

export const MEETING_DURATIONS = [30, 60, 90, 120] as const;
export type MeetingDuration = (typeof MEETING_DURATIONS)[number];

/** Start times are offered on this grid. */
export const MEETING_STEP_MINUTES = 30;
/** How far ahead a meeting can be requested. */
export const MEETING_MAX_DAYS_AHEAD = 60;
/** Minimum notice, so nobody requests a meeting that starts in five minutes. */
export const MEETING_MIN_NOTICE_MINUTES = 60;

/** Accepted format for a WhatsApp number. */
export const PHONE_PATTERN = /^\+?[\d\s()-]{8,20}$/;

/** The current moment on the Malaysia wall clock. */
export type ZonedNow = {
  iso: string;
  minutes: number;
};

export function getClassesOnDate(dateISO: string) {
  const mondayISO = addDays(dateISO, 1 - getWeekdayFromISO(dateISO));
  return generateOccurrencesForWeek(mondayISO).filter(
    (occurrence) => occurrence.dateISO === dateISO,
  );
}

/** Free slots on `dateISO`, ignoring whether they are still far enough in the future. */
export function getFreeSlotsOnDate(dateISO: string, events: readonly BusyBlock[]): FreeSlot[] {
  return getFreeSlots(dateISO, getClassesOnDate(dateISO), events);
}

/** Free slots a visitor can still request, on the start-time grid and with enough notice. */
export function getBookableSlots(
  dateISO: string,
  events: readonly BusyBlock[],
  now: ZonedNow,
): FreeSlot[] {
  if (dateISO < now.iso || dateISO > addDays(now.iso, MEETING_MAX_DAYS_AHEAD)) return [];

  const earliest = dateISO === now.iso ? now.minutes + MEETING_MIN_NOTICE_MINUTES : 0;

  return getFreeSlotsOnDate(dateISO, events).flatMap(({ startTime, endTime }) => {
    const notBefore = Math.max(timeToMinutes(startTime), earliest);
    const start = Math.ceil(notBefore / MEETING_STEP_MINUTES) * MEETING_STEP_MINUTES;
    const end = timeToMinutes(endTime);
    return end - start >= MEETING_DURATIONS[0]
      ? [{ startTime: minutesToTime(start), endTime }]
      : [];
  });
}

/** Every start time in `slots` that leaves room for a meeting of `durationMinutes`. */
export function getStartOptions(slots: readonly FreeSlot[], durationMinutes: number): string[] {
  return slots.flatMap(({ startTime, endTime }) => {
    const options: string[] = [];
    const lastStart = timeToMinutes(endTime) - durationMinutes;
    for (let start = timeToMinutes(startTime); start <= lastStart; start += MEETING_STEP_MINUTES) {
      options.push(minutesToTime(start));
    }
    return options;
  });
}

/** True when the whole of `startTime`–`endTime` sits inside one of `slots`. */
export function fitsInSlots(
  slots: readonly FreeSlot[],
  startTime: string,
  endTime: string,
): boolean {
  return slots.some((slot) => slot.startTime <= startTime && endTime <= slot.endTime);
}

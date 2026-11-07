"use client";

import type { CSSProperties, MouseEvent } from "react";

import { MEETING_DURATIONS, MEETING_STEP_MINUTES } from "@timetable-afdhal/schedule/availability";
import {
  FREE_TIME_END,
  FREE_TIME_START,
  type FreeSlot,
  formatFreeSlot,
  minutesToTime,
} from "@timetable-afdhal/schedule/free-time";
import {
  DAY_LABELS,
  formatDayLabel,
  formatHourLabel,
  parseISODate,
  timeToMinutes,
} from "@timetable-afdhal/schedule/schedule-utils";
import { cn } from "@timetable-afdhal/ui/lib/utils";

import type { CalendarDay } from "./class-calendar";
import { ClassEvent } from "./class-event";
import { PersonalEvent } from "./personal-event";

const START_MINUTES = timeToMinutes(FREE_TIME_START);
const END_MINUTES = timeToMinutes(FREE_TIME_END);
const HOUR_HEIGHT = 76;
const GRID_HEIGHT = ((END_MINUTES - START_MINUTES) / 60) * HOUR_HEIGHT;
const MIN_BLOCK_HEIGHT = 34;
const HOURS = Array.from(
  { length: (END_MINUTES - START_MINUTES) / 60 },
  (_, i) => START_MINUTES / 60 + i,
);

function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, START_MINUTES), END_MINUTES);
}

function minutePosition(minutes: number): number {
  return ((minutes - START_MINUTES) / (END_MINUTES - START_MINUTES)) * 100;
}

function blockPosition(startTime: string, endTime: string): CSSProperties {
  const start = clampMinutes(timeToMinutes(startTime));
  const end = clampMinutes(timeToMinutes(endTime));
  return {
    top: `calc(${minutePosition(start)}% + 1px)`,
    height: `max(${MIN_BLOCK_HEIGHT}px, calc(${minutePosition(end) - minutePosition(start)}% - 2px))`,
  };
}

function FreeGap({
  dateISO,
  slot,
  onRequest,
}: {
  dateISO: string;
  slot: FreeSlot;
  onRequest: (dateISO: string, startTime: string) => void;
}) {
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);

  // A pointer click starts the request where it landed; the keyboard starts at the top of the gap.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const ratio = event.detail === 0 ? 0 : (event.clientY - top) / height;
    const steps = Math.floor((ratio * (end - start)) / MEETING_STEP_MINUTES);
    const picked = start + steps * MEETING_STEP_MINUTES;
    onRequest(dateISO, minutesToTime(Math.min(picked, end - MEETING_DURATIONS[0])));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Request a meeting on ${formatDayLabel(dateISO)}, free ${formatFreeSlot(slot)}`}
      className="group absolute inset-x-0.5 flex cursor-pointer items-start rounded-md bg-primary/5 px-2 py-1.5 text-left transition-colors hover:bg-primary/15 focus-visible:bg-primary/15 focus-visible:outline-2 focus-visible:outline-ring"
      style={blockPosition(slot.startTime, slot.endTime)}
    >
      <span className="text-xs text-primary group-hover:hidden group-focus-visible:hidden">
        Free
      </span>
      <span className="hidden text-xs font-semibold text-primary group-hover:inline group-focus-visible:inline">
        Request
      </span>
    </button>
  );
}

export function WeekGrid({
  days,
  nowMinutes,
  onRequest,
}: {
  days: CalendarDay[];
  nowMinutes: number;
  onRequest: (dateISO: string, startTime: string) => void;
}) {
  const showNowLine = nowMinutes >= START_MINUTES && nowMinutes <= END_MINUTES;

  return (
    <div className="hidden overflow-x-auto rounded-lg border bg-card md:block lg:overflow-visible">
      <div className="grid min-w-[720px] grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
        <div className="sticky top-0 left-0 z-30 border-b bg-card" />
        {days.map(({ dateISO, weekday, isToday, isPast }) => (
          <div
            key={dateISO}
            className={cn(
              "sticky top-0 z-20 flex items-baseline gap-1.5 border-b border-l bg-card px-3 py-3",
              isPast && "text-muted-foreground",
            )}
          >
            <span className={cn("text-base", isToday && "font-semibold text-primary")}>
              {DAY_LABELS[weekday - 1]}
            </span>
            <span
              className={cn(
                "font-display text-3xl leading-none font-bold tabular-nums",
                isToday && "text-primary",
              )}
            >
              {parseISODate(dateISO).day}
            </span>
          </div>
        ))}

        <div
          className="sticky left-0 z-10 bg-card"
          style={{ height: GRID_HEIGHT }}
          aria-hidden="true"
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 text-xs text-muted-foreground tabular-nums"
              style={{ top: `calc(${minutePosition(hour * 60)}% + 2px)` }}
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day.dateISO}
            className={cn("relative border-l", day.weekday > 5 && "bg-muted/40")}
            style={{ height: GRID_HEIGHT }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-border/60"
                style={{ top: `${minutePosition(hour * 60)}%` }}
              />
            ))}
            {day.slots.map((slot) => (
              <FreeGap
                key={slot.startTime}
                dateISO={day.dateISO}
                slot={slot}
                onRequest={onRequest}
              />
            ))}
            {day.occurrences.map((occurrence) => (
              <ClassEvent
                key={occurrence.id}
                occurrence={occurrence}
                isPast={day.isPast}
                className="absolute inset-x-0.5"
                style={blockPosition(occurrence.startTime, occurrence.endTime)}
              />
            ))}
            {day.personalEvents.map((event) => (
              <PersonalEvent
                key={event.id}
                event={event}
                className="absolute inset-x-0.5"
                style={blockPosition(event.startTime, event.endTime)}
              />
            ))}
            {day.isToday && showNowLine && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary"
                style={{ top: `${minutePosition(nowMinutes)}%` }}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { cn } from "@timetable-afdhal/ui/lib/utils";

import { generateOccurrencesForWeek } from "@/lib/schedule/generate-occurrences";
import {
  addDays,
  formatHourLabel,
  getDatePartsInZone,
  getWeekMondayISO,
  parseISODate,
  timeToMinutes,
} from "@/lib/schedule/schedule-utils";

import { CalendarHeader } from "./calendar-header";
import { ClassEvent, SESSION_STYLES, SESSION_TYPES } from "./class-event";

const START_HOUR = 8;
const END_HOUR = 19;
const MIN_DAY_HEIGHT = (END_HOUR - START_HOUR) * 64; // Keep time slots readable on short screens.
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const MIN_EVENT_HEIGHT = 36;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const WEEKDAYS = [1, 2, 3, 4, 5] as const; // Monday to Friday

const GRID_HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const LABEL_HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, START_MINUTES), END_MINUTES);
}

function minutePosition(minutes: number): number {
  return ((minutes - START_MINUTES) / (END_MINUTES - START_MINUTES)) * 100;
}

function eventPosition(startTime: string, endTime: string): CSSProperties {
  const start = clampMinutes(timeToMinutes(startTime));
  const end = clampMinutes(timeToMinutes(endTime));
  return {
    top: `calc(${minutePosition(start)}% + 2px)`,
    height: `max(${MIN_EVENT_HEIGHT - 4}px, calc(${minutePosition(end) - minutePosition(start)}% - 4px))`,
  };
}

export function ClassCalendar() {
  const [mounted, setMounted] = useState(false);
  const [weekMondayISO, setWeekMondayISO] = useState<string>(() => getWeekMondayISO(new Date()));

  useEffect(() => setMounted(true), []);

  const today = useMemo(() => {
    if (!mounted) return null;
    const now = new Date();
    return {
      todayISO: getDatePartsInZone(now).iso,
      currentMondayISO: getWeekMondayISO(now),
    };
  }, [mounted]);

  const occurrences = useMemo(() => generateOccurrencesForWeek(weekMondayISO), [weekMondayISO]);

  const days = WEEKDAYS.map((weekday) => {
    const dateISO = addDays(weekMondayISO, weekday - 1);
    return {
      weekday,
      dateISO,
      isToday: dateISO === today?.todayISO,
      occurrences: occurrences.filter((occurrence) => occurrence.weekday === weekday),
    };
  });

  const goToPreviousWeek = () => setWeekMondayISO((iso) => addDays(iso, -7));
  const goToNextWeek = () => setWeekMondayISO((iso) => addDays(iso, 7));
  const goToToday = () => setWeekMondayISO(getWeekMondayISO(new Date()));

  if (!mounted) {
    return (
      <div
        className="flex-1 animate-pulse rounded-lg border bg-muted/40"
        style={{ minHeight: MIN_DAY_HEIGHT + 56 }}
        aria-hidden="true"
      />
    );
  }

  const isCurrentWeek = weekMondayISO === today?.currentMondayISO;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <CalendarHeader
        weekMondayISO={weekMondayISO}
        isCurrentWeek={isCurrentWeek}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
      />

      <div className="flex flex-1 flex-col overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-[720px] flex-1 grid-cols-[3.5rem_repeat(5,minmax(0,1fr))]"
          style={{ gridTemplateRows: `auto minmax(${MIN_DAY_HEIGHT}px, 1fr)` }}
        >
          {/* Corner spacer for the time gutter column. */}
          <div className="sticky left-0 z-20 border-b bg-background" />

          {/* Day headers. */}
          {days.map(({ weekday, dateISO, isToday }) => (
            <div
              key={dateISO}
              className={cn(
                "flex flex-col items-center gap-0.5 border-b border-l py-2",
                isToday && "bg-primary/5",
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {DAY_NAMES[weekday - 1]}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {parseISODate(dateISO).day}
              </span>
            </div>
          ))}

          {/* Time gutter. */}
          <div className="sticky left-0 z-10 bg-background" aria-hidden="true">
            {LABEL_HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                style={{ top: `${minutePosition(hour * 60)}%` }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Day columns. */}
          {days.map(({ dateISO, occurrences: dayOccurrences, isToday }) => (
            <div key={dateISO} className={cn("relative border-l", isToday && "bg-primary/[0.03]")}>
              {GRID_HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: `${minutePosition(hour * 60)}%` }}
                />
              ))}
              {dayOccurrences.map((occurrence) => (
                <ClassEvent
                  key={occurrence.id}
                  occurrence={occurrence}
                  style={eventPosition(occurrence.startTime, occurrence.endTime)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1">
        {SESSION_TYPES.map((session) => (
          <div key={session} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", SESSION_STYLES[session].dot)} />
            {session}
          </div>
        ))}
      </div>
    </div>
  );
}

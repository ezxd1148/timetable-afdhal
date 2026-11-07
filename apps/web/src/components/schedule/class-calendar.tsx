"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@timetable-afdhal/ui/components/button";
import { cn } from "@timetable-afdhal/ui/lib/utils";

import {
  type ClassOccurrence,
  generateOccurrencesForWeek,
} from "@/lib/schedule/generate-occurrences";
import { getFreeSlots } from "@/lib/schedule/free-time";
import {
  addDays,
  formatHourLabel,
  getDatePartsInZone,
  getWeekdayFromISO,
  getWeekMondayISO,
  parseISODate,
  TIME_ZONE,
  timeToMinutes,
} from "@/lib/schedule/schedule-utils";
import { useTRPC } from "@/utils/trpc";

import { CalendarHeader } from "./calendar-header";
import { ClassEvent, SESSION_STYLES, SESSION_TYPES } from "./class-event";
import { FreeTimePanel } from "./free-time-panel";
import { PERSONAL_EVENT_PATTERN, PersonalEvent, type PublicPersonalEvent } from "./personal-event";

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

function overlapsGrid({ startTime, endTime }: PublicPersonalEvent): boolean {
  return timeToMinutes(startTime) < END_MINUTES && timeToMinutes(endTime) > START_MINUTES;
}

/** Monday (ISO date) of the week that contains the ISO calendar date `iso`. */
function getWeekMondayFromISO(iso: string): string {
  return addDays(iso, 1 - getWeekdayFromISO(iso));
}

/** Saturday and Sunday have no classes; only Monday–Friday are drawn. */
function isWeekendISO(iso: string): boolean {
  return getWeekdayFromISO(iso) > 5;
}

/** Clock time in Malaysia Time, e.g. "14:05". */
function formatClockInZone(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

/** Grid lines, classes and personal events for one day; positioned against the nearest sized parent. */
function DayTimeline({
  occurrences,
  personalEvents,
}: {
  occurrences: ClassOccurrence[];
  personalEvents: PublicPersonalEvent[];
}) {
  return (
    <>
      {GRID_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/60"
          style={{ top: `${minutePosition(hour * 60)}%` }}
        />
      ))}
      {occurrences.map((occurrence) => (
        <ClassEvent
          key={occurrence.id}
          occurrence={occurrence}
          style={eventPosition(occurrence.startTime, occurrence.endTime)}
        />
      ))}
      {/* After classes so DOM order stacks these on top; a z-index would cover the sticky gutter. */}
      {personalEvents.map((event) => (
        <PersonalEvent
          key={event.id}
          event={event}
          style={eventPosition(event.startTime, event.endTime)}
        />
      ))}
    </>
  );
}

export function ClassCalendar() {
  const trpc = useTRPC();
  const [mounted, setMounted] = useState(false);
  const [weekMondayISO, setWeekMondayISO] = useState<string>(() => getWeekMondayISO(new Date()));
  // null means "today", resolved once mounted so SSR and the client agree.
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [showFreeTime, setShowFreeTime] = useState(false);

  useEffect(() => setMounted(true), []);

  const today = useMemo(() => {
    if (!mounted) return null;
    const now = new Date();
    return {
      todayISO: getDatePartsInZone(now).iso,
      currentMondayISO: getWeekMondayISO(now),
    };
  }, [mounted]);

  const focusedDateISO = selectedDateISO ?? today?.todayISO ?? null;

  const occurrences = useMemo(() => generateOccurrencesForWeek(weekMondayISO), [weekMondayISO]);

  const personalEventsQuery = useQuery(
    trpc.personalEvents.listPublic.queryOptions({
      startISO: weekMondayISO,
      endISO: addDays(weekMondayISO, 6),
    }),
  );
  const personalEvents = personalEventsQuery.data ?? [];

  // Free time is computed for the single focused day, independent of the visible week.
  const focusedDayOccurrences = useMemo(
    () =>
      focusedDateISO === null
        ? []
        : generateOccurrencesForWeek(getWeekMondayFromISO(focusedDateISO)).filter(
            (occurrence) => occurrence.dateISO === focusedDateISO,
          ),
    [focusedDateISO],
  );

  const focusedDayEventsQuery = useQuery({
    ...trpc.personalEvents.listPublic.queryOptions({
      startISO: focusedDateISO ?? "",
      endISO: focusedDateISO ?? "",
    }),
    enabled: showFreeTime && focusedDateISO !== null,
  });
  const focusedDayEventsData = focusedDayEventsQuery.data;

  const freeSlots = useMemo(
    () => getFreeSlots(focusedDateISO ?? "", focusedDayOccurrences, focusedDayEventsData ?? []),
    [focusedDateISO, focusedDayOccurrences, focusedDayEventsData],
  );

  const days = WEEKDAYS.map((weekday) => {
    const dateISO = addDays(weekMondayISO, weekday - 1);
    return {
      weekday,
      dateISO,
      isToday: dateISO === today?.todayISO,
      isSelected: dateISO === focusedDateISO,
      occurrences: occurrences.filter((occurrence) => occurrence.weekday === weekday),
      personalEvents: personalEvents.filter(
        (event) => event.dateISO === dateISO && overlapsGrid(event),
      ),
    };
  });

  const drawnPersonalEventsCount = days.reduce((sum, day) => sum + day.personalEvents.length, 0);

  const shiftWeek = (deltaDays: number) => {
    // Keep the selected day inside the visible week; null means "today".
    if (focusedDateISO !== null) {
      setSelectedDateISO(addDays(focusedDateISO, deltaDays));
    }
    setWeekMondayISO((iso) => addDays(iso, deltaDays));
  };
  const goToPreviousWeek = () => shiftWeek(-7);
  const goToNextWeek = () => shiftWeek(7);
  const jumpToDate = (dateISO: string) => {
    setSelectedDateISO(dateISO);
    setWeekMondayISO(getWeekMondayFromISO(dateISO));
  };
  const goToToday = () => jumpToDate(getDatePartsInZone(new Date()).iso);

  if (!mounted) {
    return (
      <div
        className="flex-1 animate-pulse rounded-lg border bg-muted/40"
        style={{ minHeight: MIN_DAY_HEIGHT + 56 }}
        aria-hidden="true"
      />
    );
  }

  const isTodayShown =
    weekMondayISO === today?.currentMondayISO && focusedDateISO === today?.todayISO;
  const isWeekendFocused = focusedDateISO !== null && isWeekendISO(focusedDateISO);
  // Mobile shows one day at a time: the selected weekday if it is in the visible week.
  const mobileDay = days.find((day) => day.isSelected);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <CalendarHeader
        weekMondayISO={weekMondayISO}
        isTodayShown={isTodayShown}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        selectedDateISO={focusedDateISO ?? undefined}
        onJumpToDate={jumpToDate}
      />

      {isWeekendFocused && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
          No classes on weekends — pick a weekday to see its schedule.
        </p>
      )}

      {personalEventsQuery.isPending && (
        <p
          aria-live="polite"
          className="rounded-lg border px-4 py-3 text-center text-sm text-muted-foreground"
        >
          Loading events for this week…
        </p>
      )}

      {personalEventsQuery.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-center text-sm"
        >
          <span className="text-destructive">Busy times unavailable.</span>
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => personalEventsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Mobile: stacked day tabs and a single-day timeline. */}
      <div role="group" aria-label="Choose a day" className="grid grid-cols-5 gap-1 sm:hidden">
        {days.map(({ weekday, dateISO, isToday, isSelected }) => (
          <button
            key={dateISO}
            type="button"
            aria-pressed={isSelected}
            onClick={() => setSelectedDateISO(dateISO)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-colors",
              isSelected ? "border-primary bg-primary/10" : "hover:bg-muted/50",
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
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col sm:hidden">
        {mobileDay ? (
          <div className="flex overflow-hidden rounded-lg border">
            <div
              className="relative w-14 shrink-0"
              style={{ height: MIN_DAY_HEIGHT }}
              aria-hidden="true"
            >
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
            <div
              className="relative flex-1 overflow-hidden border-l"
              style={{ height: MIN_DAY_HEIGHT }}
            >
              <DayTimeline
                occurrences={mobileDay.occurrences}
                personalEvents={mobileDay.personalEvents}
              />
            </div>
          </div>
        ) : (
          !isWeekendFocused && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Pick a day above to see its classes.
            </p>
          )
        )}
      </div>

      {/* Desktop: full Monday–Friday week grid. */}
      <div className="hidden flex-1 flex-col overflow-x-auto rounded-lg border sm:flex">
        <div
          className="grid min-w-[720px] flex-1 grid-cols-[3.5rem_repeat(5,minmax(0,1fr))]"
          style={{ gridTemplateRows: `auto minmax(${MIN_DAY_HEIGHT}px, 1fr)` }}
        >
          {/* Corner spacer for the time gutter column. */}
          <div className="sticky left-0 z-20 border-b bg-background" />

          {/* Day headers. Clicking one selects that day for the free-time panel. */}
          {days.map(({ weekday, dateISO, isToday, isSelected }) => (
            <button
              key={dateISO}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedDateISO(dateISO)}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center gap-0.5 border-b border-l py-2 transition-colors hover:bg-muted/50",
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
                  isSelected && !isToday && "ring-1 ring-primary",
                )}
              >
                {parseISODate(dateISO).day}
              </span>
            </button>
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
          {days.map(
            ({ dateISO, occurrences: dayOccurrences, personalEvents: dayEvents, isToday }) => (
              <div
                key={dateISO}
                className={cn("relative overflow-hidden border-l", isToday && "bg-primary/[0.03]")}
              >
                <DayTimeline occurrences={dayOccurrences} personalEvents={dayEvents} />
              </div>
            ),
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1">
        {SESSION_TYPES.map((session) => (
          <div key={session} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", SESSION_STYLES[session].dot)} />
            {session}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="h-3 w-4 rounded-sm border border-dashed border-muted-foreground/50"
            style={{ backgroundImage: PERSONAL_EVENT_PATTERN }}
          />
          Personal / Busy
        </div>

        <div
          className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {personalEventsQuery.isSuccess && (
            <>
              <span>
                {drawnPersonalEventsCount === 0
                  ? "No personal events shown this week"
                  : `${drawnPersonalEventsCount} personal ${drawnPersonalEventsCount === 1 ? "event" : "events"} shown this week`}
              </span>
              <span className="tabular-nums">
                Updated {formatClockInZone(personalEventsQuery.dataUpdatedAt)}
              </span>
            </>
          )}
        </div>

        <Button
          variant={showFreeTime ? "secondary" : "outline"}
          size="sm"
          aria-pressed={showFreeTime}
          onClick={() => setShowFreeTime((on) => !on)}
        >
          Show free time
        </Button>
      </div>

      {showFreeTime && focusedDateISO !== null && (
        <FreeTimePanel
          dateISO={focusedDateISO}
          slots={freeSlots}
          isLoading={focusedDayEventsQuery.isPending}
          isError={focusedDayEventsQuery.isError}
          onRetry={() => focusedDayEventsQuery.refetch()}
        />
      )}
    </div>
  );
}

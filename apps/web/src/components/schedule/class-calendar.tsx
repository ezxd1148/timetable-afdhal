"use client";

import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  getBookableSlots,
  getClassesOnDate,
  MEETING_MAX_DAYS_AHEAD,
  type ZonedNow,
} from "@timetable-afdhal/schedule/availability";
import type { FreeSlot } from "@timetable-afdhal/schedule/free-time";
import type { ClassOccurrence } from "@timetable-afdhal/schedule/generate-occurrences";
import {
  addDays,
  formatDayLabel,
  formatTime,
  getDatePartsInZone,
  getMinutesInZone,
  getWeekdayFromISO,
  getWeekMondayISO,
} from "@timetable-afdhal/schedule/schedule-utils";
import { Button } from "@timetable-afdhal/ui/components/button";
import { cn } from "@timetable-afdhal/ui/lib/utils";

import { useTRPC } from "@/utils/trpc";

import { CalendarHeader } from "./calendar-header";
import { SESSION_COLORS, SESSION_TYPES } from "./class-event";
import { DayAgenda } from "./day-agenda";
import { MeetingRequestDialog, type MeetingDraft } from "./meeting-request-dialog";
import type { PublicPersonalEvent } from "./personal-event";
import { WeekGrid } from "./week-grid";

export type CalendarDay = {
  dateISO: string;
  weekday: number; // 1 = Monday ... 7 = Sunday
  isToday: boolean;
  isPast: boolean;
  occurrences: ClassOccurrence[];
  personalEvents: PublicPersonalEvent[];
  slots: FreeSlot[];
};

function useZonedNow(): ZonedNow | null {
  const [now, setNow] = useState<ZonedNow | null>(null);

  useEffect(() => {
    const tick = () => {
      const date = new Date();
      setNow({ iso: getDatePartsInZone(date).iso, minutes: getMinutesInZone(date) });
    };
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

function describeDay(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return "today";
  if (dateISO === addDays(todayISO, 1)) return "tomorrow";
  return `on ${formatDayLabel(dateISO)}`;
}

/** First date with a requestable slot, looking as far ahead as a request can go. */
function findNextFree(events: readonly PublicPersonalEvent[], now: ZonedNow) {
  for (let offset = 0; offset <= MEETING_MAX_DAYS_AHEAD; offset += 1) {
    const dateISO = addDays(now.iso, offset);
    const [slot] = getBookableSlots(dateISO, events, now);
    if (slot) return { dateISO, slot };
  }
  return null;
}

export function ClassCalendar() {
  const trpc = useTRPC();
  const now = useZonedNow();
  const [weekMondayISO, setWeekMondayISO] = useState(() => getWeekMondayISO(new Date()));
  // null means "today" on phones, where one day shows at a time.
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [draft, setDraft] = useState<MeetingDraft | null>(null);

  const weekQuery = useQuery(
    trpc.personalEvents.listPublic.queryOptions({
      startISO: weekMondayISO,
      endISO: addDays(weekMondayISO, 6),
    }),
  );

  const upcomingQuery = useQuery({
    ...trpc.personalEvents.listPublic.queryOptions({
      startISO: now?.iso ?? "",
      endISO: now ? addDays(now.iso, MEETING_MAX_DAYS_AHEAD) : "",
    }),
    enabled: now !== null,
  });
  const upcomingEvents = useMemo(() => upcomingQuery.data ?? [], [upcomingQuery.data]);

  const nextFree = useMemo(
    () => (now && upcomingQuery.isSuccess ? findNextFree(upcomingEvents, now) : null),
    [now, upcomingQuery.isSuccess, upcomingEvents],
  );

  if (now === null) {
    return (
      <div
        className="h-[42rem] animate-pulse rounded-lg bg-muted/60 motion-reduce:animate-none"
        aria-hidden="true"
      />
    );
  }

  const weekEvents = weekQuery.data ?? [];
  const days: CalendarDay[] = Array.from({ length: 7 }, (_, index) => {
    const dateISO = addDays(weekMondayISO, index);
    return {
      dateISO,
      weekday: getWeekdayFromISO(dateISO),
      isToday: dateISO === now.iso,
      isPast: dateISO < now.iso,
      occurrences: getClassesOnDate(dateISO),
      personalEvents: weekEvents.filter((event) => event.dateISO === dateISO),
      // Until busy times load, an empty gap could be wrong, so offer nothing yet.
      slots: weekQuery.isSuccess ? getBookableSlots(dateISO, weekEvents, now) : [],
    };
  });

  const currentMondayISO = addDays(now.iso, 1 - getWeekdayFromISO(now.iso));
  const selectedDay =
    days.find((day) => day.dateISO === selectedDateISO) ??
    days.find((day) => day.isToday) ??
    days[0]!;

  const shiftWeek = (deltaDays: number) => {
    setWeekMondayISO((iso) => addDays(iso, deltaDays));
    setSelectedDateISO(addDays(selectedDay.dateISO, deltaDays));
  };
  const goToThisWeek = () => {
    setWeekMondayISO(currentMondayISO);
    setSelectedDateISO(null);
  };
  const requestMeeting = (dateISO: string, startTime: string) => setDraft({ dateISO, startTime });

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-2 pb-2">
        <div className="min-w-0">
          <h1 className="max-w-3xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            {nextFree
              ? `Free ${describeDay(nextFree.dateISO, now.iso)} from ${formatTime(nextFree.slot.startTime)} to ${formatTime(nextFree.slot.endTime)}`
              : upcomingQuery.isError
                ? "Availability didn't load"
                : upcomingQuery.isPending
                  ? "Checking availability"
                  : "No free time in the next 60 days"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            All times are Malaysia Time. Classes repeat every week.
          </p>
        </div>
        {upcomingQuery.isError ? (
          <Button size="lg" variant="outline" onClick={() => upcomingQuery.refetch()}>
            Try again
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={!nextFree}
            onClick={() => nextFree && requestMeeting(nextFree.dateISO, nextFree.slot.startTime)}
          >
            Request a meeting
          </Button>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-3">
        <CalendarHeader
          weekMondayISO={weekMondayISO}
          isCurrentWeek={weekMondayISO === currentMondayISO}
          onPreviousWeek={() => shiftWeek(-7)}
          onNextWeek={() => shiftWeek(7)}
          onToday={goToThisWeek}
        />

        {weekQuery.isError && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-destructive/10 px-4 py-3 text-sm"
          >
            <span>Busy times didn&apos;t load, so free time is hidden.</span>
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => weekQuery.refetch()}
            >
              Try again
            </button>
          </div>
        )}

        <DayAgenda
          days={days}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDateISO}
          onRequest={requestMeeting}
        />
        <WeekGrid days={days} nowMinutes={now.minutes} onRequest={requestMeeting} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SESSION_TYPES.map((session) => (
            <span key={session} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-sm", SESSION_COLORS[session])} />
              {session}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-muted ring-1 ring-border" />
            Busy
          </span>
          <span className="hidden md:inline">Select any free time to request a meeting.</span>
        </div>
      </div>

      {draft && (
        <MeetingRequestDialog
          key={`${draft.dateISO}-${draft.startTime}`}
          draft={draft}
          now={now}
          events={upcomingEvents}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
}

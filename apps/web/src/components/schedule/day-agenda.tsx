"use client";

import { formatFreeDuration, formatFreeSlot } from "@timetable-afdhal/schedule/free-time";
import { DAY_LABELS, formatTime, parseISODate } from "@timetable-afdhal/schedule/schedule-utils";
import { Button } from "@timetable-afdhal/ui/components/button";
import { cn } from "@timetable-afdhal/ui/lib/utils";

import type { CalendarDay } from "./class-calendar";
import { ClassEvent } from "./class-event";
import { PersonalEvent } from "./personal-event";

/** Seven-day picker plus one day as a time-ordered list, for phones. */
export function DayAgenda({
  days,
  selectedDay,
  onSelectDay,
  onRequest,
}: {
  days: CalendarDay[];
  selectedDay: CalendarDay;
  onSelectDay: (dateISO: string) => void;
  onRequest: (dateISO: string, startTime: string) => void;
}) {
  const { dateISO, isToday, isPast, occurrences, personalEvents, slots } = selectedDay;

  const items = [
    ...occurrences.map((occurrence) => ({
      key: occurrence.id,
      startTime: occurrence.startTime,
      node: <ClassEvent occurrence={occurrence} isPast={isPast} className="flex-1" />,
    })),
    ...personalEvents.map((event) => ({
      key: event.id,
      startTime: event.startTime,
      node: <PersonalEvent event={event} className="flex-1" />,
    })),
    ...slots.map((slot) => ({
      key: `free-${slot.startTime}`,
      startTime: slot.startTime,
      node: (
        <div className="flex flex-1 items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Free for {formatFreeDuration(slot)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatFreeSlot(slot)}</p>
          </div>
          <Button size="sm" onClick={() => onRequest(dateISO, slot.startTime)}>
            Request
          </Button>
        </div>
      ),
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex flex-col gap-3 md:hidden">
      <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.dateISO === dateISO;
          return (
            <button
              key={day.dateISO}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectDay(day.dateISO)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md py-2 transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                !isSelected && day.isToday && "text-primary",
                !isSelected && day.isPast && "text-muted-foreground",
              )}
            >
              <span className="text-xs">{DAY_LABELS[day.weekday - 1]}</span>
              <span className="font-display text-lg leading-none font-bold tabular-nums">
                {parseISODate(day.dateISO).day}
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {isToday
            ? "No classes today, and it's too late to request a meeting."
            : isPast
              ? "No classes this day."
              : "Nothing to show for this day."}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map(({ key, startTime, node }) => (
            <li key={key} className="flex items-stretch gap-3">
              <span className="w-16 shrink-0 pt-2 text-right text-xs text-muted-foreground tabular-nums">
                {formatTime(startTime)}
              </span>
              {node}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

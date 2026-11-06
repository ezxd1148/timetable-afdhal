"use client";

import { Button } from "@timetable-afdhal/ui/components/button";
import { Input } from "@timetable-afdhal/ui/components/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatWeekRange } from "@/lib/schedule/schedule-utils";

type CalendarHeaderProps = {
  weekMondayISO: string;
  isTodayShown: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  selectedDateISO?: string;
  onJumpToDate?: (dateISO: string) => void;
};

export function CalendarHeader({
  weekMondayISO,
  isTodayShown,
  onPreviousWeek,
  onNextWeek,
  onToday,
  selectedDateISO,
  onJumpToDate,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous week" onClick={onPreviousWeek}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next week" onClick={onNextWeek}>
          <ChevronRight />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} disabled={isTodayShown}>
          Today
        </Button>
        {onJumpToDate && (
          <Input
            type="date"
            aria-label="Jump to date"
            className="w-auto"
            value={selectedDateISO ?? weekMondayISO}
            onChange={(event) => {
              if (event.target.value) onJumpToDate(event.target.value);
            }}
          />
        )}
      </div>

      <p className="text-sm font-semibold tabular-nums">{formatWeekRange(weekMondayISO)}</p>
    </div>
  );
}

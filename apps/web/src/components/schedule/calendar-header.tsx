"use client";

import { Button } from "@timetable-afdhal/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatWeekRange } from "@/lib/schedule/schedule-utils";

type CalendarHeaderProps = {
  weekMondayISO: string;
  isCurrentWeek: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

export function CalendarHeader({
  weekMondayISO,
  isCurrentWeek,
  onPreviousWeek,
  onNextWeek,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous week" onClick={onPreviousWeek}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next week" onClick={onNextWeek}>
          <ChevronRight />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} disabled={isCurrentWeek}>
          Today
        </Button>
      </div>

      <p className="text-sm font-semibold tabular-nums">{formatWeekRange(weekMondayISO)}</p>
    </div>
  );
}

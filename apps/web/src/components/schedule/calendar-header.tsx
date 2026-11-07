"use client";

import { formatWeekRange } from "@timetable-afdhal/schedule/schedule-utils";
import { Button } from "@timetable-afdhal/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      <h2 className="font-display text-xl font-bold tracking-tight tabular-nums">
        {formatWeekRange(weekMondayISO)}
      </h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday} disabled={isCurrentWeek}>
          This week
        </Button>
        <Button variant="outline" size="icon" aria-label="Previous week" onClick={onPreviousWeek}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next week" onClick={onNextWeek}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";

import { formatTimeRange } from "@timetable-afdhal/schedule/schedule-utils";
import { cn } from "@timetable-afdhal/ui/lib/utils";

export type PublicPersonalEvent = {
  id: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  title: string | null; // null = hidden from non-owners, shown as "Busy".
};

type PersonalEventProps = {
  event: PublicPersonalEvent;
  style?: CSSProperties;
  className?: string;
};

export function PersonalEvent({ event, style, className }: PersonalEventProps) {
  const { title, startTime, endTime } = event;
  const label = title ?? "Busy";
  const timeRange = formatTimeRange(startTime, endTime);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md bg-muted px-2 py-1 text-muted-foreground",
        className,
      )}
      style={style}
      title={`${label}, ${timeRange}`}
    >
      <p className="truncate text-xs leading-tight font-semibold">{label}</p>
      <p className="truncate text-xs leading-tight tabular-nums">{timeRange}</p>
    </div>
  );
}

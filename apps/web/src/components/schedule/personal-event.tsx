import type { CSSProperties } from "react";

import { cn } from "@timetable-afdhal/ui/lib/utils";

import { formatTimeRange } from "@/lib/schedule/schedule-utils";

export type PublicPersonalEvent = {
  id: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  title: string | null; // null = hidden from non-owners, shown as "Busy".
};

// Diagonal hatching, theme-neutral, so personal/busy blocks never read as course cards.
export const PERSONAL_EVENT_PATTERN =
  "repeating-linear-gradient(135deg, rgb(127 127 127 / 0.16) 0 6px, transparent 6px 12px)";

type PersonalEventProps = {
  event: PublicPersonalEvent;
  style?: CSSProperties;
};

export function PersonalEvent({ event, style }: PersonalEventProps) {
  const { title, startTime, endTime } = event;
  const isBusy = title === null;
  const label = title ?? "Busy";
  const timeRange = formatTimeRange(startTime, endTime);

  return (
    <div
      className="absolute inset-x-1 overflow-hidden rounded-md border border-dashed border-muted-foreground/50 bg-background/80 px-2 py-1 text-left text-muted-foreground"
      style={{ ...style, backgroundImage: PERSONAL_EVENT_PATTERN }}
      title={`${label} · ${timeRange}`}
    >
      <p
        className={cn(
          "truncate text-xs font-semibold leading-tight",
          isBusy && "uppercase tracking-wide",
        )}
      >
        {label}
      </p>
      <p className="truncate text-[11px] leading-tight tabular-nums">{timeRange}</p>
    </div>
  );
}

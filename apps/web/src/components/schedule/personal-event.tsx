import type { CSSProperties } from "react";

import { formatTimeRange } from "@/lib/schedule/schedule-utils";

export type PublicPersonalEvent = {
  id: string;
  dateISO: string;
  startTime: string;
  endTime: string;
  title: string | null; // null = hidden from non-owners, shown as "Busy".
};

export const PERSONAL_EVENT_DOT = "bg-muted-foreground/60";

type PersonalEventProps = {
  event: PublicPersonalEvent;
  style?: CSSProperties;
};

export function PersonalEvent({ event, style }: PersonalEventProps) {
  const { title, startTime, endTime } = event;
  const label = title ?? "Busy";
  const timeRange = formatTimeRange(startTime, endTime);

  return (
    <div
      className="absolute inset-x-1 overflow-hidden rounded-lg border border-dashed border-foreground/25 bg-muted/70 px-2 py-0.5 text-left backdrop-blur-sm transition-colors hover:bg-muted/85"
      style={style}
      title={`${label} · ${timeRange}`}
    >
      <p className="truncate text-xs font-semibold leading-tight">{label}</p>
      <p className="truncate text-[11px] leading-tight tabular-nums text-muted-foreground">
        {timeRange}
      </p>
    </div>
  );
}

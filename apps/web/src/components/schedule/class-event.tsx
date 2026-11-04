import type { CSSProperties } from "react";

import { cn } from "@timetable-afdhal/ui/lib/utils";

import type { Session } from "@/data/class-schedule";
import type { ClassOccurrence } from "@/lib/schedule/generate-occurrences";
import { formatTimeRange } from "@/lib/schedule/schedule-utils";

export type SessionStyle = {
  dot: string;
  card: string;
  text: string;
};

export const SESSION_TYPES: readonly Session[] = ["Lecture", "Tutorial", "Tutorial/Lab"];

export const SESSION_STYLES: Record<Session, SessionStyle> = {
  Lecture: {
    dot: "bg-blue-500",
    card: "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 dark:border-blue-400/30 dark:bg-blue-400/10",
    text: "text-blue-700 dark:text-blue-300",
  },
  Tutorial: {
    dot: "bg-violet-500",
    card: "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 dark:border-violet-400/30 dark:bg-violet-400/10",
    text: "text-violet-700 dark:text-violet-300",
  },
  "Tutorial/Lab": {
    dot: "bg-teal-500",
    card: "border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/15 dark:border-teal-400/30 dark:bg-teal-400/10",
    text: "text-teal-700 dark:text-teal-300",
  },
};

type ClassEventProps = {
  occurrence: ClassOccurrence;
  style?: CSSProperties;
};

export function ClassEvent({ occurrence, style }: ClassEventProps) {
  const { courseCode, session, lecturer, location, startTime, endTime } = occurrence;
  const theme = SESSION_STYLES[session];
  const details = `${courseCode} · ${session} · ${lecturer} · ${location} · ${formatTimeRange(startTime, endTime)}`;

  return (
    <div
      className={cn(
        "absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-colors",
        theme.card,
      )}
      style={style}
      title={details}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", theme.dot)} />
        <span className="truncate text-xs font-semibold leading-tight">{courseCode}</span>
      </div>
      <p className={cn("mt-0.5 truncate text-[11px] font-medium leading-tight", theme.text)}>
        {session}
      </p>
      <p className="truncate text-[11px] leading-tight text-muted-foreground">
        {lecturer} · {location}
      </p>
      <p className="mt-0.5 truncate text-[11px] leading-tight tabular-nums text-muted-foreground">
        {formatTimeRange(startTime, endTime)}
      </p>
    </div>
  );
}

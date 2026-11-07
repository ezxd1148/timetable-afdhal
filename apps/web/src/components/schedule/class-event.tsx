import type { CSSProperties } from "react";

import type { Session } from "@timetable-afdhal/schedule/class-schedule";
import type { ClassOccurrence } from "@timetable-afdhal/schedule/generate-occurrences";
import { formatTimeRange } from "@timetable-afdhal/schedule/schedule-utils";
import { cn } from "@timetable-afdhal/ui/lib/utils";

export const SESSION_TYPES: readonly Session[] = ["Lecture", "Tutorial", "Tutorial/Lab"];

export const SESSION_COLORS: Record<Session, string> = {
  Lecture: "bg-lecture",
  Tutorial: "bg-tutorial",
  "Tutorial/Lab": "bg-lab",
};

// Past classes fade only their fill, so the white text keeps its contrast.
const PAST_SESSION_COLORS: Record<Session, string> = {
  Lecture: "bg-lecture/80",
  Tutorial: "bg-tutorial/80",
  "Tutorial/Lab": "bg-lab/80",
};

type ClassEventProps = {
  occurrence: ClassOccurrence;
  isPast?: boolean;
  style?: CSSProperties;
  className?: string;
};

export function ClassEvent({ occurrence, isPast = false, style, className }: ClassEventProps) {
  const { courseCode, session, lecturer, location, startTime, endTime } = occurrence;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md px-2.5 py-2 text-white",
        (isPast ? PAST_SESSION_COLORS : SESSION_COLORS)[session],
        className,
      )}
      style={style}
      title={`${courseCode}, ${session} with ${lecturer} in ${location}, ${formatTimeRange(startTime, endTime)}`}
    >
      <p className="truncate font-display text-base leading-tight font-bold">{courseCode}</p>
      <p className="truncate text-sm leading-snug">{session}</p>
      <p className="truncate text-sm leading-snug opacity-90">{location}</p>
    </div>
  );
}

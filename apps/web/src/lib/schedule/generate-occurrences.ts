import { classSchedule, type Session, type Weekday } from "@/data/class-schedule";

import { addDays } from "./schedule-utils";

export type ClassOccurrence = {
  id: string;
  dateISO: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  courseCode: string;
  session: Session;
  lecturer: string;
  location: string;
};

/**
 * Generate the occurrences for a single week, anchored on its Monday.
 *
 * The timetable repeats weekly, so each rule in `classSchedule` produces
 * exactly one occurrence per week. Occurrence ids embed the class id and the
 * ISO date of the class day, which keeps them stable and unique across weeks.
 */
export function generateOccurrencesForWeek(mondayISO: string): ClassOccurrence[] {
  return classSchedule.map((rule) => {
    const dateISO = addDays(mondayISO, rule.weekday - 1);

    return {
      id: `${rule.id}-${dateISO}`,
      dateISO,
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
      courseCode: rule.courseCode,
      session: rule.session,
      lecturer: rule.lecturer,
      location: rule.location,
    };
  });
}

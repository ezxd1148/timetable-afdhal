import type { Session } from "@timetable-afdhal/auth";
import type { Database } from "@timetable-afdhal/db";

export type Context = {
  session: Session | null;
  db: Database;
};

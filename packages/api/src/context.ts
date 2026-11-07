import type { Session } from "@timetable-afdhal/auth";
import type { Database } from "@timetable-afdhal/db";

export type Context = {
  session: Session | null;
  db: Database;
  /** Lowercased email of the only account allowed to manage the calendar; empty fails closed. */
  ownerEmail: string;
  /** Platform-reported visitor IP, used only for rate limiting. */
  clientIp: string | null;
  /** Key for hashing `clientIp` so raw addresses are never stored. */
  ipHashSecret: string;
};

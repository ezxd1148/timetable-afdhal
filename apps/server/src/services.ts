import { createAuth as createConfiguredAuth } from "@timetable-afdhal/auth";
import { type Database, createPrismaClient } from "@timetable-afdhal/db";

import { ENV } from "./env.server";

export function getDb(): Database {
  return createPrismaClient(ENV);
}
export async function createAuth(database?: Database) {
  return createConfiguredAuth(ENV, database ?? (await getDb()));
}

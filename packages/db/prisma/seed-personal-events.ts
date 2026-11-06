// Seed dev owner + 2 sample personal events in the current week.
// Run from packages/db: pnpm seed:personal-events
// Uses @libsql/client directly against the same local dev.db that
// prisma.config.ts points at (file:./dev.db), because the generated
// Prisma client requires a WASM query compiler that is not available
// in this local sqlite setup. Tables/columns match the Prisma schema
// (personal_event, user) exactly.
import { randomUUID } from "node:crypto";

import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  return date;
}

async function main() {
  const email = "dev@example.com";
  const now = new Date();
  const monday = mondayOfWeek(now);
  const wed = new Date(monday);
  wed.setDate(wed.getDate() + 2);
  const fri = new Date(monday);
  fri.setDate(fri.getDate() + 4);

  const existing = await client.execute({
    sql: "SELECT id FROM user WHERE email = ?",
    args: [email],
  });

  let userId: string;
  if (existing.rows.length > 0) {
    userId = existing.rows[0]?.id as string;
  } else {
    userId = randomUUID();
    await client.execute({
      sql: "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [userId, "Dev Owner", email],
    });
  }

  // Idempotent: remove previous samples for this user before re-inserting.
  await client.execute({
    sql: "DELETE FROM personal_event WHERE userId = ? AND title IN (?, ?)",
    args: [userId, "Personal: Doctor appointment", "Personal: Gym"],
  });

  await client.execute({
    sql: "INSERT INTO personal_event (id, userId, title, dateISO, startTime, endTime, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    args: [randomUUID(), userId, "Personal: Doctor appointment", isoDate(wed), "09:00", "10:00"],
  });
  await client.execute({
    sql: "INSERT INTO personal_event (id, userId, title, dateISO, startTime, endTime, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    args: [randomUUID(), userId, "Personal: Gym", isoDate(fri), "18:00", "19:00"],
  });

  console.log(`Seeded dev user ${userId} with 2 personal events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    client.close();
  });

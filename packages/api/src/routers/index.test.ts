// @ts-expect-error - bun:test types are provided by the Bun runtime, not tsc
import { describe, expect, test } from "bun:test";
import type { Session } from "@timetable-afdhal/auth";
import type { Database } from "@timetable-afdhal/db";

import { appRouter } from "./index";

type Row = {
  id: string;
  userId: string;
  title: string;
  dateISO: string;
  startTime: string;
  endTime: string;
};

const OWNER = "user-owner";
const OTHER = "user-other";

const rows: Row[] = [
  {
    id: "evt-own",
    userId: OWNER,
    title: "Owner secret title",
    dateISO: "2026-02-10",
    startTime: "09:00",
    endTime: "10:00",
  },
  {
    id: "evt-other",
    userId: OTHER,
    title: "Other secret title",
    dateISO: "2026-02-11",
    startTime: "11:00",
    endTime: "12:00",
  },
];

function sessionFor(userId: string): Session {
  return {
    user: {
      id: userId,
      name: "Test User",
      email: `${userId}@example.com`,
      emailVerified: false,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    session: {
      id: "session-1",
      token: "token-1",
      userId,
      expiresAt: new Date("2026-12-31"),
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      ipAddress: null,
      userAgent: null,
    },
  } as unknown as Session;
}

type DbCalls = {
  create: unknown[];
  update: unknown[];
  delete: unknown[];
};

function makeDb(
  overrides: {
    findManyRows?: Row[];
    findUniqueRow?: Row | null;
  } = {},
) {
  const calls: DbCalls = { create: [], update: [], delete: [] };
  const db = {
    personalEvent: {
      findMany: async () => overrides.findManyRows ?? rows,
      findUnique: async () => overrides.findUniqueRow ?? null,
      create: async (args: { data: Record<string, unknown> }) => {
        calls.create.push(args);
        return { id: "evt-new", ...args.data };
      },
      update: async (args: unknown) => {
        calls.update.push(args);
        return { id: "evt-own", ...(args as { data: object }).data };
      },
      delete: async (args: unknown) => {
        calls.delete.push(args);
        return { id: "evt-own" };
      },
    },
  };
  return { db: db as unknown as Database, calls };
}

function callerFor(session: Session | null, db: Database) {
  return appRouter.createCaller({ session, db });
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`Expected rejection with code ${code}, but it resolved`);
}

const validInput = {
  title: "New event",
  dateISO: "2026-02-12",
  startTime: "13:00",
  endTime: "14:00",
};

describe("personalEvents.listPublic privacy (MVP-4)", () => {
  test("null session: title is null for all rows and userId is never exposed", async () => {
    const { db } = makeDb();
    const caller = callerFor(null, db);

    const result = await caller.personalEvents.listPublic({
      startISO: "2026-02-01",
      endISO: "2026-02-28",
    });

    expect(result).toHaveLength(2);
    for (const row of result) {
      expect(row.title).toBeNull();
      expect(row).not.toHaveProperty("userId");
      expect(Object.keys(row)).not.toContain("userId");
    }
  });

  test("owner session: full title for own rows only, null for other users' rows", async () => {
    const { db } = makeDb();
    const caller = callerFor(sessionFor(OWNER), db);

    const result = await caller.personalEvents.listPublic({
      startISO: "2026-02-01",
      endISO: "2026-02-28",
    });

    expect(result).toHaveLength(2);
    const own = result.find((r) => r.id === "evt-own");
    const other = result.find((r) => r.id === "evt-other");
    expect(own?.title).toBe("Owner secret title");
    expect(other?.title).toBeNull();
    for (const row of result) {
      expect(row).not.toHaveProperty("userId");
    }
  });

  test("range over 62 days is rejected by zod", async () => {
    const { db } = makeDb();
    const caller = callerFor(null, db);

    // 2026-01-01 -> 2026-03-10 is 68 days.
    await expectCode(
      caller.personalEvents.listPublic({
        startISO: "2026-01-01",
        endISO: "2026-03-10",
      }),
      "BAD_REQUEST",
    );

    // Exactly 62 days (2026-01-01 -> 2026-03-04) is still allowed.
    const ok = await caller.personalEvents.listPublic({
      startISO: "2026-01-01",
      endISO: "2026-03-04",
    });
    expect(ok).toHaveLength(2);
  });
});

describe("personalEvents mutation ownership (MVP-4)", () => {
  test("create ignores client userId and stamps session userId", async () => {
    const { db, calls } = makeDb();
    const caller = callerFor(sessionFor(OWNER), db);

    const created = await caller.personalEvents.create({
      ...validInput,
      // A malicious client tries to plant the event on someone else.
      userId: OTHER,
    } as any);

    expect(created.userId).toBe(OWNER);
    expect(calls.create).toHaveLength(1);
    const data = (calls.create[0] as { data: Record<string, unknown> }).data;
    expect(data.userId).toBe(OWNER);
    expect(data.userId).not.toBe(OTHER);
  });

  test("update on a foreign row throws NOT_FOUND and never calls db update", async () => {
    const foreign = rows.find((r) => r.id === "evt-other")!;
    const { db, calls } = makeDb({ findUniqueRow: foreign });
    const caller = callerFor(sessionFor(OWNER), db);

    await expectCode(caller.personalEvents.update({ ...validInput, id: "evt-other" }), "NOT_FOUND");
    expect(calls.update).toHaveLength(0);
  });

  test("update on a missing row throws NOT_FOUND", async () => {
    const { db, calls } = makeDb({ findUniqueRow: null });
    const caller = callerFor(sessionFor(OWNER), db);

    await expectCode(
      caller.personalEvents.update({ ...validInput, id: "does-not-exist" }),
      "NOT_FOUND",
    );
    expect(calls.update).toHaveLength(0);
  });

  test("remove on a foreign row throws NOT_FOUND and never calls db delete", async () => {
    const foreign = rows.find((r) => r.id === "evt-other")!;
    const { db, calls } = makeDb({ findUniqueRow: foreign });
    const caller = callerFor(sessionFor(OWNER), db);

    await expectCode(caller.personalEvents.remove({ id: "evt-other" }), "NOT_FOUND");
    expect(calls.delete).toHaveLength(0);
  });

  test("remove on a missing row throws NOT_FOUND", async () => {
    const { db, calls } = makeDb({ findUniqueRow: null });
    const caller = callerFor(sessionFor(OWNER), db);

    await expectCode(caller.personalEvents.remove({ id: "does-not-exist" }), "NOT_FOUND");
    expect(calls.delete).toHaveLength(0);
  });

  test("update/remove on own row succeed (positive control)", async () => {
    const own = rows.find((r) => r.id === "evt-own")!;
    const { db, calls } = makeDb({ findUniqueRow: own });
    const caller = callerFor(sessionFor(OWNER), db);

    const updated = await caller.personalEvents.update({
      ...validInput,
      id: "evt-own",
    });
    expect(updated).toBeDefined();
    expect(calls.update).toHaveLength(1);

    const removed = await caller.personalEvents.remove({ id: "evt-own" });
    expect(removed).toEqual({ id: "evt-own" });
    expect(calls.delete).toHaveLength(1);
  });
});

// @ts-expect-error - bun:test types are provided by the Bun runtime, not tsc
import { describe, expect, test } from "bun:test";
import type { Session } from "@timetable-afdhal/auth";
import type { Database } from "@timetable-afdhal/db";
import {
  addDays,
  getDatePartsInZone,
  getWeekdayFromISO,
} from "@timetable-afdhal/schedule/schedule-utils";

import { appRouter } from "./index";

const OWNER_EMAIL = "owner@example.com";

function sessionFor(email: string): Session {
  return { user: { id: `id-${email}`, email }, session: {} } as unknown as Session;
}

type Request = Record<string, unknown> & { id: string; status: string };

function makeDb(options: { requests?: Request[]; recentCount?: number; openCount?: number } = {}) {
  const requests = options.requests ?? [];
  const events: Record<string, unknown>[] = [];
  const db = {
    personalEvent: {
      findMany: async () => events,
      create: async (args: { data: Record<string, unknown> }) => {
        if (events.some((event) => event.id === args.data.id)) {
          throw new Error("Unique constraint failed");
        }
        events.push(args.data);
        return args.data;
      },
      delete: async (args: { where: { id: string } }) => {
        events.splice(
          events.findIndex((event) => event.id === args.where.id),
          1,
        );
      },
    },
    meetingRequest: {
      count: async (args: { where: { ipHash?: string } }) =>
        args.where.ipHash ? (options.recentCount ?? 0) : (options.openCount ?? 0),
      findFirst: async () => null,
      findMany: async () => requests,
      findUnique: async (args: { where: { id: string } }) =>
        requests.find((request) => request.id === args.where.id) ?? null,
      deleteMany: async () => ({ count: 0 }),
      create: async (args: { data: Record<string, unknown> }) => {
        const created = { id: "new", status: "pending", ...args.data };
        requests.push(created);
        return created;
      },
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const request = requests.find((row) => row.id === args.where.id)!;
        return Object.assign(request, args.data);
      },
      updateMany: async (args: {
        where: { id: string; status: string };
        data: Record<string, unknown>;
      }) => {
        const matches = requests.filter(
          (row) => row.id === args.where.id && row.status === args.where.status,
        );
        for (const row of matches) Object.assign(row, args.data);
        return { count: matches.length };
      },
    },
  };
  return { db: db as unknown as Database, requests, events };
}

function callerFor(db: Database, session: Session | null = null, clientIp: string | null = null) {
  return appRouter.createCaller({
    session,
    db,
    ownerEmail: OWNER_EMAIL,
    clientIp,
    ipHashSecret: "test-secret",
  });
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

/** The Sunday at least two days out: no classes, and clear of the notice period. */
function nextSundayISO(): string {
  let iso = addDays(getDatePartsInZone(new Date()).iso, 2);
  while (getWeekdayFromISO(iso) !== 7) iso = addDays(iso, 1);
  return iso;
}

/** The Monday at least two days out, which has a class at 08:00. */
function nextMondayISO(): string {
  return addDays(nextSundayISO(), 1);
}

const validInput = () => ({
  name: "Visitor",
  contactType: "email" as const,
  contactValue: "visitor@example.com",
  message: "Project help",
  dateISO: nextSundayISO(),
  startTime: "10:00",
  durationMinutes: 60,
});

describe("meetingRequests.create", () => {
  test("a visitor can request a free weekend slot without signing in", async () => {
    const { db, requests } = makeDb();
    expect(await callerFor(db).meetingRequests.create(validInput())).toEqual({ sent: true });
    expect(requests[0]).toMatchObject({ startTime: "10:00", endTime: "11:00", status: "pending" });
  });

  test("the response never carries the stored request", async () => {
    const { db } = makeDb();
    const result = await callerFor(db).meetingRequests.create(validInput());
    expect(Object.keys(result)).toEqual(["sent"]);
  });

  test("a slot that overlaps a class is rejected", async () => {
    const { db, requests } = makeDb();
    await expectCode(
      callerFor(db).meetingRequests.create({
        ...validInput(),
        dateISO: nextMondayISO(),
        startTime: "08:30",
      }),
      "CONFLICT",
    );
    expect(requests).toHaveLength(0);
  });

  test("a date in the past or beyond the booking window is rejected", async () => {
    const today = getDatePartsInZone(new Date()).iso;
    const { db } = makeDb();
    const caller = callerFor(db).meetingRequests;
    await expectCode(caller.create({ ...validInput(), dateISO: addDays(today, -7) }), "CONFLICT");
    await expectCode(caller.create({ ...validInput(), dateISO: addDays(today, 61) }), "CONFLICT");
  });

  test("a date that doesn't exist is rejected", async () => {
    const { db, requests } = makeDb();
    await expectCode(
      callerFor(db).meetingRequests.create({ ...validInput(), dateISO: "2026-11-31" }),
      "BAD_REQUEST",
    );
    expect(requests).toHaveLength(0);
  });

  test("the honeypot reports success but stores nothing", async () => {
    const { db, requests } = makeDb();
    const result = await callerFor(db).meetingRequests.create({
      ...validInput(),
      website: "https://spam.example",
    });
    expect(result).toEqual({ sent: true });
    expect(requests).toHaveLength(0);
  });

  test("an unsupported length is rejected", async () => {
    const { db } = makeDb();
    await expectCode(
      callerFor(db).meetingRequests.create({ ...validInput(), durationMinutes: 45 }),
      "BAD_REQUEST",
    );
  });

  test("a malformed contact is rejected", async () => {
    const { db } = makeDb();
    await expectCode(
      callerFor(db).meetingRequests.create({
        ...validInput(),
        contactValue: "javascript:alert(1)",
      }),
      "BAD_REQUEST",
    );
  });

  test("the sixth request from one connection in an hour is refused", async () => {
    const { db } = makeDb({ recentCount: 5 });
    await expectCode(
      callerFor(db, null, "203.0.113.9").meetingRequests.create(validInput()),
      "TOO_MANY_REQUESTS",
    );
  });

  test("a full inbox refuses new requests", async () => {
    const { db } = makeDb({ openCount: 50 });
    await expectCode(callerFor(db).meetingRequests.create(validInput()), "TOO_MANY_REQUESTS");
  });

  test("the raw IP is never stored", async () => {
    const { db, requests } = makeDb();
    await callerFor(db, null, "203.0.113.9").meetingRequests.create(validInput());
    expect(JSON.stringify(requests)).not.toContain("203.0.113.9");
    expect(requests[0]?.ipHash).toHaveLength(64);
  });
});

describe("meetingRequests owner access", () => {
  const pendingRequest = (): Request => ({
    id: "req-1",
    status: "pending",
    name: "Visitor",
    dateISO: nextSundayISO(),
    startTime: "10:00",
    endTime: "11:00",
  });

  test("visitors and other accounts can't read or act on requests", async () => {
    const { db } = makeDb({ requests: [pendingRequest()] });
    await expectCode(callerFor(db).meetingRequests.list(), "UNAUTHORIZED");
    const stranger = callerFor(db, sessionFor("stranger@example.com")).meetingRequests;
    await expectCode(stranger.list(), "FORBIDDEN");
    await expectCode(stranger.accept({ id: "req-1" }), "FORBIDDEN");
    await expectCode(stranger.decline({ id: "req-1" }), "FORBIDDEN");
  });

  test("a blank owner email locks everyone out", async () => {
    const { db } = makeDb();
    const caller = appRouter.createCaller({
      session: sessionFor(""),
      db,
      ownerEmail: "",
      clientIp: null,
      ipHashSecret: "test-secret",
    });
    await expectCode(caller.meetingRequests.list(), "FORBIDDEN");
  });

  test("accepting creates one busy event, and repeating it creates no more", async () => {
    const { db, requests, events } = makeDb({ requests: [pendingRequest()] });
    const owner = callerFor(db, sessionFor(OWNER_EMAIL)).meetingRequests;
    await owner.accept({ id: "req-1" });
    await owner.accept({ id: "req-1" });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ title: "Meeting: Visitor", startTime: "10:00" });
    expect(requests[0]).toMatchObject({ status: "accepted", personalEventId: "meeting-req-1" });
  });

  test("a request can't be accepted once a class blocks the slot", async () => {
    const { db, events } = makeDb({
      requests: [{ ...pendingRequest(), dateISO: nextMondayISO(), startTime: "08:30" }],
    });
    await expectCode(
      callerFor(db, sessionFor(OWNER_EMAIL)).meetingRequests.accept({ id: "req-1" }),
      "CONFLICT",
    );
    expect(events).toHaveLength(0);
  });

  test("accepting again finishes the job after the status write failed", async () => {
    const { db, requests, events } = makeDb({ requests: [pendingRequest()] });
    const table = db.meetingRequest as unknown as { updateMany: (args: unknown) => unknown };
    const realUpdateMany = table.updateMany;
    table.updateMany = async () => {
      throw new Error("D1 unavailable");
    };
    const owner = callerFor(db, sessionFor(OWNER_EMAIL)).meetingRequests;
    await owner.accept({ id: "req-1" }).catch(() => {});
    expect(requests[0]?.status).toBe("pending");

    table.updateMany = realUpdateMany;
    await owner.accept({ id: "req-1" });
    expect(events).toHaveLength(1);
    expect(requests[0]).toMatchObject({ status: "accepted", personalEventId: "meeting-req-1" });
  });

  test("losing a race to decline removes the event and reports a conflict", async () => {
    const { db, requests, events } = makeDb({ requests: [pendingRequest()] });
    const table = db.personalEvent as unknown as {
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    };
    const realCreate = table.create;
    table.create = async (args) => {
      Object.assign(requests[0]!, { status: "declined" });
      return realCreate(args);
    };
    await expectCode(
      callerFor(db, sessionFor(OWNER_EMAIL)).meetingRequests.accept({ id: "req-1" }),
      "CONFLICT",
    );
    expect(events).toHaveLength(0);
  });

  test("declining a handled request reports a conflict", async () => {
    const { db } = makeDb({ requests: [{ ...pendingRequest(), status: "accepted" }] });
    await expectCode(
      callerFor(db, sessionFor(OWNER_EMAIL)).meetingRequests.decline({ id: "req-1" }),
      "CONFLICT",
    );
  });

  test("a declined request can't then be accepted", async () => {
    const { db, events } = makeDb({ requests: [pendingRequest()] });
    const owner = callerFor(db, sessionFor(OWNER_EMAIL)).meetingRequests;
    await owner.decline({ id: "req-1" });
    await expectCode(owner.accept({ id: "req-1" }), "CONFLICT");
    expect(events).toHaveLength(0);
  });
});

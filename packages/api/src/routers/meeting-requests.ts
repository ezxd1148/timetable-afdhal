import {
  fitsInSlots,
  getBookableSlots,
  getFreeSlotsOnDate,
  MEETING_DURATIONS,
  PHONE_PATTERN,
  type ZonedNow,
} from "@timetable-afdhal/schedule/availability";
import { minutesToTime } from "@timetable-afdhal/schedule/free-time";
import {
  addDays,
  getDatePartsInZone,
  getMinutesInZone,
  isRealISODate,
  timeToMinutes,
} from "@timetable-afdhal/schedule/schedule-utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure, publicProcedure, router } from "../index";
import type { Context } from "../context";

const MAX_REQUESTS_PER_IP_PER_HOUR = 5;
const MAX_OPEN_REQUESTS = 50;
const RETENTION_DAYS = 30;

const isoDate = z.string().refine(isRealISODate, "Expected a real date as YYYY-MM-DD");
const timeHHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

const contact = z.discriminatedUnion("contactType", [
  z.object({
    contactType: z.literal("email"),
    contactValue: z.email("Enter a valid email address").max(200),
  }),
  z.object({
    contactType: z.literal("whatsapp"),
    contactValue: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  }),
]);

const createInput = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(80),
    message: z.string().trim().min(1, "Say what the meeting is about").max(500),
    dateISO: isoDate,
    startTime: timeHHmm,
    durationMinutes: z.number().refine((value) => MEETING_DURATIONS.some((d) => d === value)),
    // Honeypot: hidden from people, so anything in it came from a bot.
    website: z.string().max(200).optional(),
  })
  .and(contact);

function zonedNow(): ZonedNow {
  const now = new Date();
  return { iso: getDatePartsInZone(now).iso, minutes: getMinutesInZone(now) };
}

async function hashIp(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function ownerEventsOn(ctx: Context, dateISO: string) {
  return ctx.db.personalEvent.findMany({
    where: { dateISO, user: { email: ctx.ownerEmail } },
    select: { id: true, dateISO: true, startTime: true, endTime: true },
  });
}

export const meetingRequestsRouter = router({
  create: publicProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    if (input.website) return { sent: true };

    const now = zonedNow();
    const endTime = minutesToTime(timeToMinutes(input.startTime) + input.durationMinutes);
    const slots = getBookableSlots(input.dateISO, await ownerEventsOn(ctx, input.dateISO), now);
    if (!fitsInSlots(slots, input.startTime, endTime)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "That time is no longer free. Pick another time.",
      });
    }

    const ipHash = ctx.clientIp ? await hashIp(ctx.clientIp, ctx.ipHashSecret) : null;
    if (ipHash) {
      const recent = await ctx.db.meetingRequest.count({
        where: { ipHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      });
      if (recent >= MAX_REQUESTS_PER_IP_PER_HOUR) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests from this connection. Try again in an hour.",
        });
      }
    }

    // Past pending requests no longer count, so a flood can't block the inbox for good.
    const open = await ctx.db.meetingRequest.count({
      where: { status: "pending", dateISO: { gte: now.iso } },
    });
    if (open >= MAX_OPEN_REQUESTS) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "The request inbox is full. Try again in a few days.",
      });
    }

    const duplicate = await ctx.db.meetingRequest.findFirst({
      where: {
        status: "pending",
        contactValue: input.contactValue,
        dateISO: input.dateISO,
        startTime: input.startTime,
      },
      select: { id: true },
    });
    if (duplicate) return { sent: true };

    await ctx.db.meetingRequest.deleteMany({
      where: { dateISO: { lt: addDays(now.iso, -RETENTION_DAYS) } },
    });
    await ctx.db.meetingRequest.create({
      data: {
        name: input.name,
        contactType: input.contactType,
        contactValue: input.contactValue,
        message: input.message,
        dateISO: input.dateISO,
        startTime: input.startTime,
        endTime,
        ipHash,
      },
    });
    return { sent: true };
  }),

  list: ownerProcedure.query(({ ctx }) =>
    ctx.db.meetingRequest.findMany({
      orderBy: [{ dateISO: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        name: true,
        contactType: true,
        contactValue: true,
        message: true,
        dateISO: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    }),
  ),

  accept: ownerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.meetingRequest.findUnique({ where: { id: input.id } });
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting request not found" });
      }
      if (request.status === "accepted") return { id: request.id };
      if (request.status !== "pending") {
        throw new TRPCError({ code: "CONFLICT", message: "This request was already declined" });
      }

      // The event id comes from the request, so its primary key stops a second event being
      // created. D1 has no interactive transactions; a retry after any failure just carries on.
      const eventId = `meeting-${request.id}`;
      const events = await ownerEventsOn(ctx, request.dateISO);
      const others = events.filter((event) => event.id !== eventId);
      const free = getFreeSlotsOnDate(request.dateISO, others);
      if (!fitsInSlots(free, request.startTime, request.endTime)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You're no longer free at that time. Decline it or free the slot first.",
        });
      }

      if (others.length === events.length) {
        await ctx.db.personalEvent.create({
          data: {
            id: eventId,
            title: `Meeting: ${request.name}`,
            dateISO: request.dateISO,
            startTime: request.startTime,
            endTime: request.endTime,
            userId: ctx.session.user.id,
          },
        });
      }

      const accepted = await ctx.db.meetingRequest.updateMany({
        where: { id: request.id, status: "pending" },
        data: { status: "accepted", personalEventId: eventId },
      });
      if (accepted.count === 0) {
        await ctx.db.personalEvent.delete({ where: { id: eventId } });
        throw new TRPCError({ code: "CONFLICT", message: "This request was already handled" });
      }
      return { id: request.id };
    }),

  decline: ownerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const declined = await ctx.db.meetingRequest.updateMany({
        where: { id: input.id, status: "pending" },
        data: { status: "declined" },
      });
      if (declined.count === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "This request was already handled" });
      }
      return { id: input.id };
    }),
});

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const timeHHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

const title = z
  .string()
  .trim()
  .min(1, "Title must not be empty")
  .max(200, "Title must be <= 200 characters");

const eventFields = z
  .object({
    title,
    dateISO: isoDate,
    startTime: timeHHmm,
    endTime: timeHHmm,
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "endTime must be after startTime",
  });

function assertOwned(existing: { userId: string } | null, userId: string) {
  if (!existing || existing.userId !== userId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Personal event not found",
    });
  }
}

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  personalEvents: router({
    listPublic: publicProcedure
      .input(
        z
          .object({
            startISO: isoDate,
            endISO: isoDate,
          })
          .refine((d) => d.startISO <= d.endISO, {
            message: "startISO must be <= endISO",
          })
          .refine(
            (d) => (Date.parse(d.endISO) - Date.parse(d.startISO)) / (1000 * 60 * 60 * 24) <= 62,
            { message: "Range must be at most 62 days" },
          ),
      )
      .query(async ({ ctx, input }) => {
        const rows = await ctx.db.personalEvent.findMany({
          where: {
            dateISO: { gte: input.startISO, lte: input.endISO },
          },
          orderBy: [{ dateISO: "asc" }, { startTime: "asc" }],
        });
        const currentUserId = ctx.session?.user.id;
        return rows.map((row) => ({
          id: row.id,
          dateISO: row.dateISO,
          startTime: row.startTime,
          endTime: row.endTime,
          title: currentUserId && row.userId === currentUserId ? row.title : null,
        }));
      }),
    listMine: protectedProcedure
      .input(
        z
          .object({
            startISO: isoDate.optional(),
            endISO: isoDate.optional(),
          })
          .refine((d) => !d.startISO || !d.endISO || d.startISO <= d.endISO, {
            message: "startISO must be <= endISO",
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        return ctx.db.personalEvent.findMany({
          where: {
            userId,
            ...(input?.startISO || input?.endISO
              ? {
                  dateISO: {
                    ...(input.startISO ? { gte: input.startISO } : {}),
                    ...(input.endISO ? { lte: input.endISO } : {}),
                  },
                }
              : {}),
          },
          orderBy: [{ dateISO: "asc" }, { startTime: "asc" }],
        });
      }),
    create: protectedProcedure.input(eventFields).mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.personalEvent.create({
        data: {
          title: input.title,
          dateISO: input.dateISO,
          startTime: input.startTime,
          endTime: input.endTime,
          userId,
        },
      });
    }),
    update: protectedProcedure
      .input(eventFields.extend({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const existing = await ctx.db.personalEvent.findUnique({
          where: { id: input.id },
        });
        assertOwned(existing, userId);
        return ctx.db.personalEvent.update({
          where: { id: input.id },
          data: {
            title: input.title,
            dateISO: input.dateISO,
            startTime: input.startTime,
            endTime: input.endTime,
            userId,
          },
        });
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const existing = await ctx.db.personalEvent.findUnique({
          where: { id: input.id },
        });
        assertOwned(existing, userId);
        await ctx.db.personalEvent.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const existing = await ctx.db.personalEvent.findUnique({
          where: { id: input.id },
        });
        assertOwned(existing, userId);
        await ctx.db.personalEvent.delete({ where: { id: input.id } });
        return { id: input.id };
      }),
  }),
});
export type AppRouter = typeof appRouter;

import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

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
          }),
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
  }),
});
export type AppRouter = typeof appRouter;

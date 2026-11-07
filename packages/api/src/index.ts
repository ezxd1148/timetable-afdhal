import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create({ isDev: false });

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.ownerEmail || ctx.session.user.email.toLowerCase() !== ctx.ownerEmail) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the calendar owner can do this" });
  }
  return next();
});

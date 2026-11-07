import type { Context as ApiContext } from "@timetable-afdhal/api/context";
import type { Context as HonoContext } from "hono";

import { ENV } from "./env.server";
import { getDb } from "./services";
import { createAuth } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const db = await getDb();
  const session = await (
    await createAuth(db)
  ).api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    db,
    session,
    ownerEmail: ENV.OWNER_EMAIL.trim().toLowerCase(),
    clientIp: context.req.header("CF-Connecting-IP") ?? null,
    ipHashSecret: ENV.BETTER_AUTH_SECRET,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

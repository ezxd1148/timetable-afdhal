import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@timetable-afdhal/api/routers/index";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { createAuth } from "./services";

const app = new Hono();

app.use(logger());
function allowedOrigins(): string[] {
  return ENV.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

app.use(
  "/*",
  cors({
    origin: allowedOrigins(),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => (await createAuth()).handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

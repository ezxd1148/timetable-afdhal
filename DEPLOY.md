# Deploy — MVP-5 Cloudflare readiness

Verified against `packages/infra/alchemy.run.ts`, `apps/web/wrangler.jsonc`,
`apps/web/open-next.config.ts`, `apps/server/src/env.ts`, `apps/web/src/env.ts`.

## Migration verified — `20261106171832_add_personal_event`

`packages/db/prisma/migrations/20261106171832_add_personal_event/migration.sql` is the
initial migration: it applies cleanly to an empty D1/SQLite database.

- Verified with `prisma migrate diff --from-empty --to-schema prisma/schema --script`
  (from `packages/db`): output matches the migration SQL except for `-- CreateTable` /
  `-- CreateIndex` comments. `migration_lock.toml` provider is `sqlite`.
- Verified with an in-memory SQLite dry-run: creates `user`, `session`, `account`,
  `verification`, `personal_event` tables, FKs and indexes; inserting a `user` and a
  `personal_event` succeeds. No auth-table conflicts — `user`/`session`/`account`/
  `verification` are created fresh by this migration (Better-Auth schema), and
  `personal_event` references `user` with `ON DELETE CASCADE`.
- Alchemy `packages/infra/alchemy.run.ts` points the D1 database
  `migrations: "../../packages/db/prisma/migrations"`, so `alchemy deploy` provisions
  the D1 database and applies this migration on first deploy.

## Deploy config — reviewed, no blocking gaps found

| Area                  | Status                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bindings              | server worker: `DB` (D1); web worker: `IMAGES`, assets via `wrangler.jsonc` (`ASSETS`) + OpenNext output. All present.                                                                       |
| `nodejs_compat`       | Set on both workers (`server` in `alchemy.run.ts`; `compatibility_flags` in `wrangler.jsonc`) plus `global_fetch_strictly_public` on web.                                                    |
| `build:cloudflare`    | `apps/web/package.json` has `"build:cloudflare": "opennextjs-cloudflare build"`, and `alchemy.run.ts` invokes it with `NEXT_PUBLIC_SERVER_URL` injected from the deployed server worker URL. |
| `open-next.config.ts` | Default `defineCloudflareConfig({})` — correct for this app.                                                                                                                                 |
| `BETTER_AUTH_URL`     | Auto-resolved to the server worker's primary URL (`Cloudflare.Worker.URL`, the `domain` set in `alchemy.run.ts`) — do not set manually.                                                      |
| API custom domain     | `time-api.fdhlsfi.site` must stay same-site with the web origin, or the session cookie becomes third-party and browsers can drop it.                                                         |

### Env vars (exact)

Server worker (deployment process, e.g. `apps/server/.env` — loaded by Alchemy via
`varlock/auto-load`):

| Var                  | Required | Notes                                                                                                                     |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | yes      | `minLength=32` per `apps/server/.env.schema`. Generate with `openssl rand -base64 32`.                                    |
| `CORS_ORIGIN`        | yes      | Must be the exact deployed web origin (e.g. `https://app.example.com`). Set after first deploy, then redeploy the server. |

Web worker:

| Var                      | Required | Notes                                                                                                        |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SERVER_URL` | yes      | Injected automatically by Alchemy from the server worker URL; present in `apps/web/.env` for local dev only. |

Worker code reads native bindings; the varlock-generated `src/env.ts` files are for the
Node/Bun deployment process only.

## Deploy commands

```bash
# from packages/infra — dev stage (default)
cd packages/infra && pnpm exec alchemy deploy

# production stage
cd packages/infra && pnpm exec alchemy deploy --stage production

# dev loop / teardown
cd packages/infra && pnpm exec alchemy dev
cd packages/infra && pnpm exec alchemy destroy
```

First-time setup: `cd packages/infra && pnpm exec alchemy profile edit` to configure the
Cloudflare provider account. After the first deploy, set `CORS_ORIGIN` to the deployed
web origin and deploy again.

## Verification (MVP-5)

- `pnpm nx run-many -t check-types --exclude server` — infra, db, api, auth, ui pass;
  `web` fails on a pre-existing error in `apps/web/src/components/schedule/class-calendar.tsx`
  (`PERSONAL_EVENT_DOT` not defined) — an app-source issue, not an infra gap.
- `pnpm --filter web run build:cloudflare` — passes (OpenNext build complete,
  worker written to `apps/web/.open-next/worker.js`). Non-blocking warning only:
  `workerd compatibility_date: 2025-05-05` — consider updating `apps/web/wrangler.jsonc`
  to a newer date.

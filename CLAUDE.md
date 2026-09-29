# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A realtime social platform ("flookaa") built as a polyglot monorepo: several Go services in one `go.work` workspace, a Rust WebSocket proxy, a React/Vite frontend, and Ansible playbooks that provision everything into LXD containers. `README.md` at the root has the intended architecture overview; `notes.md` holds the running TODO list.

There are no tests anywhere in the repo (no `*_test.go`, no frontend test runner). Don't claim test coverage or invent test commands.

## Layout

| Path | Module / language | Role |
|---|---|---|
| `backend/` | Go, module `app` | Main HTTP service: REST (`/api/v1`), GraphQL (`/query`), and `/control` |
| `shared/` | Go, module `shared` | Shared library: DB connections, SQL migrations/queries, generated sqlc + gqlgen code, subject helpers. Imported by every Go service except `whatsapp` |
| `redis/` | Go, module `redis_worker` | NATS consumer that maintains Redis counter caches |
| `notifier/` | Go, module `notifier` | NATS consumer that turns content/channel events into per-persona notifications in Postgres and pushes their ids over `STREAM_USER_EVENTS`. See "Notifications" below |
| `s3/` | Go, module `s3` | Separate upload service (images, audio) backed by S3 |
| `whatsapp/` | Go, module `whatsapp` | Send-only WhatsApp REST service (whatsmeow, unofficial linked-device client). Standalone; see `whatsapp/README.md` |
| `gRCP/server`, `gRCP/client` | Go | gRPC deploy agent: watches a directory, publishes binaries to `/opt/<svc>/<version>`, flips a `current` symlink, restarts systemd |
| `nats/` | Rust, crate `ws_proxy` | Axum WebSocket proxy that bridges browsers ↔ NATS JetStream |
| `front-end/` | React 19 + Vite + TS | SPA |
| `ansible/` | Ansible | LXD host + per-service container provisioning |

`go.work` uses `backend`, `gRCP/client`, `gRCP/server`, `notifier`, `redis`, `s3`, `shared`, `whatsapp`. Note `gRCP` is spelled that way on disk (not `gRPC`).

## Commands

### Code generation (run from `shared/`)

Postgres models and GraphQL server code are **generated** — never hand-edit `shared/pkg/db/` or `shared/pkg/graph/*.generated.go`:

```bash
cd shared
make generate-models        # rm -rf pkg/db && sqlc generate && gqlgen generate
```

The workflow is: edit `external/db/postgres/schemas/*.sql` + `external/db/postgres/queries/*.sql` (for sqlc) or `external/graph/*.graphqls` (for gqlgen), then regenerate. `sqlc.yaml` uses database-backed analysis via `$DATABASE_DSN`, so it must point at a Postgres **with all migrations applied**. Don't strip the `database:` block to generate offline: the inferred types differ (e.g. `LIMIT` becomes `int32`, arrays and JSON become `interface{}`) and existing callers break. A throwaway local cluster works: `initdb`, start on a spare port, `make migrate-up`, then `sqlc generate`. Resolver bodies live in `shared/pkg/graph/resolvers/schema.resolvers.go` and are preserved across `gqlgen generate`.

### Migrations (run from `shared/`)

```bash
make migrate-up             # golang-migrate against $DATABASE_DSN
make migrate-down           # one step down
make migrate-force          # force version 1 after a dirty failure
./seed-countries.sh         # psql-load the geo seed dumps (host/user hardcoded in the script)
```

Migrations are numbered pairs in `shared/external/db/postgres/migrations/` (`NNN_name.up.sql` / `.down.sql`). Add new ones with the next number and always write the down file.

Tooling assumed on PATH (see `backend/README.md`):
```bash
go install -tags "postgres" github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/99designs/gqlgen@latest
export PATH=$PATH:$(go env GOPATH)/bin
```

### Frontend (run from `front-end/`)

```bash
pnpm dev                    # vite dev server on :5173 with proxies (see below)
pnpm build                  # tsc-check then vite build
pnpm lint                   # eslint .
pnpm codegen                # graphql-codegen -> src/generated/graphql.ts
```

`pnpm codegen` introspects the **live** schema at `https://api.flookaa.com/query` (see `codegen.yml`), not a local file — it needs network access and the deployed schema to be current. `src/generated/graphql.ts` is generated; don't edit it.

`tsc-check` is `! npx tsc -b | grep '.tsx'` — it only fails the build on errors in `.tsx` files. Type errors in `.ts` files pass. Keep that in mind when "the build is green".

### Build & deploy

Each Go service has its own `deploy.bash` / `deploy.sh` that cross-compiles for `linux/amd64` and `scp`s the binary into the target container's gRPC watch directory (`/home/gRPC/watched`), where the gRPC agent picks it up:

```bash
cd backend && ./deploy.bash     # -> gRPC@backend
cd s3      && ./deploy.bash     # -> gRPC@s3
cd redis   && ./deploy.bash     # -> gRPC@redis
cd notifier && ./deploy.bash    # -> gRPC@notifier (needs migration 012 applied, or it refuses to start)
cd whatsapp && ./deploy.bash    # -> gRPC@whatsapp (CGO_ENABLED=0)
cd front-end && ./deploy.sh     # pnpm build + scp dist/* to the nginx host
cd nats    && ./deploy.sh       # Rust cross-build
./rsync.sh                      # sync git-tracked files to the internal build host
cd gRCP && ./build-gRCP.sh      # protoc regen + deploy both server and client
```

The gRPC protobuf output is generated into `gRCP/app_service` and copied into both `server/` and `client/`; regenerate via `build-gRCP.sh`, not by hand.

### Infrastructure (run from `ansible/`)

```bash
./pick-and-play.bash        # interactive menu of every playbook with its correct inventory + vault args
```

Always prefer `pick-and-play.bash` over composing `ansible-playbook` invocations — it encodes which `-e @vars/*_vault.yml` and vault-password file each playbook needs, and optionally appends an ndjson run log to `runs/logs/`. `ansible.cfg` sets `stdout_callback = json` and `gathering = explicit`, and uses a custom `lxc_ssh` connection plugin from `plugins/connection/` to reach containers through the LXD host.

## Architecture notes

### Request paths into the backend

`backend/cmd/server/root.go` builds one Gin engine with three groups, all behind a single CORS config and `auth.Middleware` (tiers below):

- `api.AddApiGroup` → `/api/v1/*` REST: auth, users, personas, channels, notifications, geo, health. Postgres-backed via sqlc handlers in `backend/internal/db/postgres/handlers/`.
- `graphql.AddGraphQLGroup` → `POST /query` and `GET /playground`. Posts/comments/replies live in MongoDB (`app.objects` collection); the resolver struct carries `*db.Queries`, the `app.objects` collection, NATS, and the Redis content/persona stores.
- `control.AddControlGroup` → `POST /control`, called by the Rust proxy, not by browsers.

`main.go` dispatches on `os.Args[1]`: no args starts the server, `seed` runs `cmd/seeder`.

### Auth is cookie-JWT and fails closed per route group

`backend/internal/auth` has three pieces:

- `auth.Middleware(signer)` (global) only **parses** the `jwt` cookie and sets `user_id`, `persona_id`, `email_address` in the Gin context. It never rejects.
- `auth.RequireUser()` → 401 `{"error":"unauthenticated"}`; `auth.RequirePersona()` → 401, or 403 `{"error":"persona_required"}` when no persona is chosen (`persona_id` is 0 after login until `set-current-persona` reissues the JWT).
- Handlers read identity with `auth.UserID(c)` / `auth.PersonaID(c)` / `auth.Email(c)`, never `c.Get(...)`.

Tiers are applied at **group** level, so a new route inherits its group's tier:

| Tier | Routes |
|---|---|
| Public | `/api/v1/health`, `auth/register`, `auth/login`, `auth/logout`, `auth/google`, `auth/oauth2callback/*`, `geo/*` (used during signup) |
| User | `auth/info`, `auth/verify`, `users/*`, `persona/*` |
| Persona | `channels/*`, `notifications/*`, `POST /query`, `POST /control` |

**Content and channel actions belong to a persona, not a user**: authorship, membership, realtime subscriptions (Redis `persona:<id>:subjects`) are all keyed by `persona_id`; `user_id` is only for account and persona management. `/playground` is only mounted when `GIN_MODE` is not `release`.

The frontend mirrors this: REST calls go through `src/lib/apiFetch.ts` and Apollo through an `ErrorLink` in `src/graphql/client.ts`. On 401 they clear `user` (App renders the public layout); on 403 `persona_required` they clear `persona` (DashboardLayout renders persona selection). No redirects.

### The realtime path

1. Browser opens one WebSocket to the Rust proxy (`/ws`, `nats/src/ws.rs`), forwarding cookies.
2. Proxy POSTs subscribe/unsubscribe control messages to the Go app's `/control`, passing the browser's `Cookie` header through (`nats/src/go_bridge.rs`, target from `GO_APP_URL`).
3. Go validates membership, resolves NATS subjects plus per-subject offsets from Redis, and returns `{action, subjects: [{subject, offset}], durable}`.
4. Proxy attaches JetStream consumers for those subjects and multiplexes events down the one socket.
5. Frontend (`front-end/src/ws/index.tsx`, a singleton with a 5s `HEARTBEAT`) dispatches incoming frames to listeners keyed by the message `id`, then refetches details over REST/GraphQL — events carry IDs, not full payloads.

Subject strings are built only through `shared/pkg/subject` — `{stream}.{ownerType}.{ownerID}.{event}.{action}` (stream segment omitted when `StreamName` is nil). Streams are declared in `shared/external/db/nats/natsConn.go` (`STREAM_USER_EVENTS`, `STREAM_CONTENT_EVENTS`, `STREAM_CHANNEL_EVENTS`). Channel membership changes (`member`, `follower`, `join_request` × `create`/`delete`, payload `{persona_id, reason}`, `actor_id` = who made the change) go to `STREAM_CHANNEL_EVENTS` only — they are NATS events, not `events` rows. `/control` subscribes a channel's websockets to both the content and channel-events subjects.

### Channel access

Rules live in one place, `shared/pkg/access` (`LoadChannel` → `CanRead`/`CanWrite`/`CanModerate`), used by the REST channel handlers, `/control`, and the GraphQL resolvers:

| | public channel | private channel |
|---|---|---|
| see metadata (list, `getChannel`) | every persona | every persona (so they can request to join) |
| read posts/comments, subscribe | every persona | active members |
| post / comment / like | active members | active members |
| join | immediate (`status = 'active'`) | pending request; owner, channel moderators, or global Administrators approve via `/channels/:id/requests/...` |

Membership is `channel_members` with `left_at IS NULL AND status = 'active'` — every membership query must filter on both. Moderators list and remove members via `/channels/:id/members[/:persona_id/remove]` (the owner can't be removed); leaving or being removed also soft-deletes the persona's `channel_roles`, because `can_moderate` reads roles, not membership. Non-readers get 404 / `channel not found`, never 403, so private channels don't leak existence of content. For existing objects (comments, likes) resolvers authorize and publish against the owner **stored on the Mongo document** (`loadObject` → `authorizeOwner`), never the client's `owner` input. Only channel-owned content is supported: `authorizeOwner` refuses any other owner type (`PERSONA`, `PAGE`) as not found until those get access rules.

### Counters: Postgres is the source of truth, Redis is a cache

Every like/comment is a row in the Postgres `events` table (unlike = soft delete). Counts are always a recount of those rows (`shared/pkg/counters.Count`), never a running total:

- The redis worker (`redis/internal/root.go`) is a durable JetStream pull consumer (`redis-counters`, explicit ack, NAK with backoff, `Term` for unparseable messages). For each like/comment event it recounts the target and **overwrites** `content:post:<id>` / `content:comment:<id>` (`ContentStore.Set*Meta`). Duplicate, replayed or out-of-order events converge; events published while the worker is down are picked up on restart. It needs `DATABASE_DSN`.
- GraphQL reads `Get*Meta`; on a miss it recounts and uses `Fill*Meta` (HSETNX), so a slow cache fill never clobbers a newer worker write.
- Content keys expire after 24h; Redis can be flushed at any time and refills on demand.
- "Liked by me" is one Postgres query per page (`GetLikedTargets`), not a Redis set.

A new counter needs: the event written to `events` + published, a case in `counters.Count`, and a field in `ContentStore.writeMeta`/`getMeta`.

Deletes are soft. `deletePost`/`deleteComment` (author or channel moderator) set `deletedat` on the Mongo document, soft-delete the events about the object via `events.object_id` (its own create event and the likes on it; `object_id` is NOT NULL, likes store the liked object), and publish `…post.delete` / `…comment.delete`. Every read of `app.objects` must filter `deletedat: nil`.

Publishing uses `JetStream.Publish` (acknowledged), so a missing stream is an error. Only the backend runs `EnsureStreams` (creates streams, sets `MaxAge` 7d); the workers (redis, notifier) only `CheckStream`.

### Notifications

The `notifier/` service writes them; the backend only reads them (`/api/v1/notifications`: list, `unread-count`, `read`, `read-all`). Recipients are **personas**. Direct messages and broadcast news are deliberately **not** notifications: DMs keep per-conversation unread state, and broadcasts belong in a future announcements table, not N rows.

- **Generic rows** (`notifications`, migration 012). `subject_type/subject_id` is what the notification is about (`POST`, `COMMENT`, `CHANNEL`, `PERSONA`). `scope_type/scope_id` is whose access rule decides visibility: `CHANNEL`, or NULL for personal, always visible. There are no foreign keys to subjects or scopes; the notifier soft-deletes by subject when one goes away. `kind`, subject and scope types are Postgres enums.
- **One row per thing**: `UNIQUE (recipient_id, group_key)`, `group_key = "<kind>:<subject_id>"`. New activity upserts the row, moves it to the top and marks it unread. Counts and the latest actor of aggregated kinds are **recounted** from `events` / `channel_members` when read, never stored, like the counters. A recount of zero soft-deletes the row, and later activity revives it.
- **Replay guard**: `last_event_at` is the newest event applied. The upsert only changes a row for a newer event and returns no row otherwise (`sql.ErrNoRows` → nothing published). Soft-deletes move it forward too, so redelivered or out-of-order events can't mark a read row unread or revive a removed one.
- **Visibility** (`ListNotifications` / `CountUnreadNotifications`): one SQL rule per scope type, mirroring `access.CanRead` for `CHANNEL`. A persona that loses access keeps its rows, but they don't show.
- **Registry of kinds**: `shared/pkg/notifications.Kinds` maps each kind to its subject type and batched recount (nil = single actor, stored in `actor_id`). The notifier and the API both use it, and both call `notifications.Check` at startup, which fails if the database enum has a kind without a spec.
- **Notifier**: durable consumers `notifier-content` / `notifier-channel` (`DeliverNew`, explicit ack, same backoff as the redis worker). It never notifies you about your own activity, and it takes the recipient of comments and likes from the event's `recipient_id` (set by the resolvers), so it doesn't read Mongo. It publishes `STREAM_USER_EVENTS.PERSONA.<id>.notifications.{create|delete}` with `{notification_id}`. A future consumer of `STREAM_USER_EVENTS` must use specific filter subjects, never `STREAM_USER_EVENTS.>`, or it would consume these frames.
- **API paging**: the cursor is `"<updated_at µs>_<id>"`, taken from the last row read. Rows whose recount is zero are dropped after the query, so a page can be short or empty and still have `next_cursor`; page until it's null.

A new kind needs:
1. `ALTER TYPE notification_kind_enum ADD VALUE` in its own migration (plus subject/scope values if new), then `make generate-models`.
2. A spec in `notifications.Kinds`.
3. A notifier handler for its source events.
4. A visibility rule if the scope type is new.
5. Frontend rendering.

### Dependencies are wired explicitly in each `main`

There are no connection globals. `shared/external/db/{postgres,mongo,nats,redis}` each expose `Connect(...)`, and importing a package connects nothing. Each binary's `main` loads its own `internal/config` (built on `shared/util/envconfig`, which reports **all** missing vars in one error), connects only what it uses, and passes handles into constructors:

- Backend: `backend/cmd/server/root.go` builds one `Handler` struct per domain (`users`, `channels`, `notifications`, `geo`, the `/control` handler, `oauthproviders.Google`) plus the GraphQL `resolvers.Resolver`, each holding only its own deps (`*db.Queries`, specific Redis sub-stores, `*nats.NatsHelper`, `*token.Signer`). The seeder (`app seed`) loads only `DATABASE_DSN` and the admin credentials.
- Redis worker: `redis/main.go` → `internal.NewWorker(...)`.
- Notifier: `notifier/main.go` → `notifications.Check`, then `internal.NewWorker(nats, q)`. It needs `DATABASE_DSN` and `NATS_CONNECTION` only.
- JWTs go through `token.Signer` (`shared/util/token`), which refuses a secret under 32 bytes. `s3` builds its own signer to verify the backend's image tokens.

Only `config` packages call `os.Getenv`. A new dependency means a constructor parameter, not a package global.

### Data split

- **Postgres** (sqlc): users, personas, roles, channels, memberships, geo, verification, events, notifications.
- **MongoDB** (`app.objects`): posts, comments, replies as portable-text documents.
- **Neo4j**: not wired into any binary for now (planned for friends-of-friends recommendations); `shared/external/db/neo` keeps a `Connect` for when it returns.
- **Redis**: sessions, subscription lists, per-subject offsets, content counters, persona cache.

### The `whatsapp` service is deliberately different

It breaks several repo-wide patterns on purpose — keep it that way:

- **No `shared` import**: it has no need for the platform's databases or env. Config is loaded explicitly via `internal/config.Load()`.
- **Auth aborts** with 401 (static bearer token, constant-time compare) instead of the backend's always-`c.Next()` pattern. No CORS; browsers never call it — go frontend → backend → whatsapp.
- **Pure-Go SQLite (`modernc.org/sqlite`) with `CGO_ENABLED=0`.** Swapping to `mattn/go-sqlite3` breaks the macOS → linux cross-build.
- **Session DB lives in `/opt/whatsapp-data/`**, outside the versioned `/opt/whatsapp/<version>` dir the gRPC agent creates, or each deploy would orphan it.
- Boots unpaired and prints a pairing QR to stdout (`journalctl -u whatsapp -f`); poll `GET /api/v1/status` for link state. Sends are never auto-retried; callers pass `message_id` for idempotent retries.

### Frontend conventions

`@/` aliases `src/` (both `vite.config.ts` and tsconfig). Data access splits three ways: `src/services/*.ts` for REST, Apollo + `.graphql` documents in `src/graphql/` for content (hooks come from `src/generated/graphql.ts` after `pnpm codegen`), and the WS singleton for realtime. Zustand stores in `src/stores/` hold client-only state; React contexts at `src/*.context.tsx` provide auth, theme, dialogs, websocket. Components are shadcn-style under `src/components/ui/`. Post editing uses `@portabletext/editor` — the renderers and schema live in `src/components/portable-text/`.

Dev-mode requests are proxied, not direct: `/api`, `/query`, `/ws` go to `VITE_API_BASE_URL` / `VITE_WEBSOCKET_BASE_URL` (default `https://lxd-development-app`) with `secure: false` and `cookieDomainRewrite: "localhost"`.

## Environment

`.env` files are gitignored; in production values come from Ansible vault vars. Go services read:

`DATABASE_DSN`, `MONGODB_DSN`, `NATS_CONNECTION`, `REDIS_ADDR`, `REDIS_PASSWORD`, `JWT_SECRET_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL_ADDRESS`, `SMTP_EMAIL_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GRPC_PORT`, `GRPC_WATCHING_DIR`.

`whatsapp` reads only its own vars: `WHATSAPP_API_TOKEN` (required, fatal if unset), `WHATSAPP_SESSION_DB`, `WHATSAPP_SEND_RATE`, `WHATSAPP_SEND_BURST`, `WHATSAPP_PORT`.

Rust proxy: `GO_APP_URL`. Frontend: `VITE_API_BASE_URL`, `VITE_WEBSOCKET_BASE_URL`, `VITE_HEART_REACT_VOICE_URL`.

## Conventions

- Older commits are prefixed with a ticket key (`WWW-0000 Fix linting issues`); recent ones use conventional-commit prefixes (`feat: ...`). Follow whatever the user asks for.
- Never hand-edit generated output: `shared/pkg/db/`, `shared/pkg/graph/*.generated.go`, `shared/pkg/graph/models/models_gen.go`, `front-end/src/generated/graphql.ts`, `gRCP/*/app_service/`.
- A backend change touching the GraphQL schema requires regenerating on both sides: `make generate-models` in `shared/`, then `pnpm codegen` in `front-end/` once the schema is deployed.

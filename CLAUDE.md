# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A realtime social platform ("flookaa") built as a polyglot monorepo: several Go services in one `go.work` workspace, a Rust WebSocket proxy, a React/Vite frontend, and Ansible playbooks that provision everything into LXD containers. `README.md` at the root has the intended architecture overview; `notes.md` holds the running TODO list.

There are no tests anywhere in the repo (no `*_test.go`, no frontend test runner). Don't claim test coverage or invent test commands.

## Layout

| Path | Module / language | Role |
|---|---|---|
| `backend/` | Go, module `app` | Main HTTP service: REST (`/api/v1`), GraphQL (`/query`), and `/control` |
| `shared/` | Go, module `shared` | Shared library: DB connections, SQL migrations/queries, generated sqlc + gqlgen code, subject helpers. Imported by all Go services |
| `redis/` | Go, module `redis_worker` | NATS consumer that maintains Redis counter caches |
| `s3/` | Go, module `s3` | Separate upload service (images, audio) backed by S3 |
| `gRCP/server`, `gRCP/client` | Go | gRPC deploy agent: watches a directory, publishes binaries to `/opt/<svc>/<version>`, flips a `current` symlink, restarts systemd |
| `nats/` | Rust, crate `ws_proxy` | Axum WebSocket proxy that bridges browsers ↔ NATS JetStream |
| `front-end/` | React 19 + Vite + TS | SPA |
| `ansible/` | Ansible | LXD host + per-service container provisioning |

`go.work` uses `backend`, `redis`, `shared`, `gRCP/client`, `gRCP/server`, `s3`. Note `gRCP` is spelled that way on disk (not `gRPC`).

## Commands

### Code generation (run from `shared/`)

Postgres models and GraphQL server code are **generated** — never hand-edit `shared/pkg/db/` or `shared/pkg/graph/*.generated.go`:

```bash
cd shared
make generate-models        # rm -rf pkg/db && sqlc generate && gqlgen generate
```

The workflow is: edit `external/db/postgres/schemas/*.sql` + `external/db/postgres/queries/*.sql` (for sqlc) or `external/graph/*.graphqls` (for gqlgen), then regenerate. `sqlc.yaml` connects to `$DATABASE_DSN`, so that must be set and reachable. Resolver bodies live in `shared/pkg/graph/resolvers/schema.resolvers.go` and are preserved across `gqlgen generate`.

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

`backend/cmd/server/root.go` builds one Gin engine with three groups, all behind a single CORS config and `AuthMiddleware`:

- `api.AddApiGroup` → `/api/v1/*` REST: auth, users, personas, channels, geo, health. Postgres-backed via sqlc handlers in `backend/internal/db/postgres/handlers/`.
- `graphql.AddGraphQLGroup` → `POST /query` and `GET /playground`. Posts/comments/replies live in MongoDB (`app.objects` collection); the resolver struct carries Postgres, Mongo **and** Neo4j handles.
- `control.AddControlGroup` → `POST /control`, called by the Rust proxy, not by browsers.

`main.go` dispatches on `os.Args[1]`: no args starts the server, `seed` runs `cmd/seeder`.

### Auth is cookie-JWT and non-blocking

`AuthMiddleware` reads the `jwt` cookie, verifies it, and sets `email_address`, `user_id`, `persona_id` in the Gin context. **It always calls `c.Next()`** — a missing or invalid token is not rejected here. Every handler that needs identity must check `c.Get("user_id")` itself and return 401. A `persona_id` claim matters: content is authored by a persona, not directly by a user.

### The realtime path

1. Browser opens one WebSocket to the Rust proxy (`/ws`, `nats/src/ws.rs`), forwarding cookies.
2. Proxy POSTs subscribe/unsubscribe control messages to the Go app's `/control`, passing the browser's `Cookie` header through (`nats/src/go_bridge.rs`, target from `GO_APP_URL`).
3. Go validates membership, resolves NATS subjects plus per-subject offsets from Redis, and returns `{action, subjects: [{subject, offset}], durable}`.
4. Proxy attaches JetStream consumers for those subjects and multiplexes events down the one socket.
5. Frontend (`front-end/src/ws/index.tsx`, a singleton with a 5s `HEARTBEAT`) dispatches incoming frames to listeners keyed by the message `id`, then refetches details over REST/GraphQL — events carry IDs, not full payloads.

Subject strings are built only through `shared/pkg/subject` — `{stream}.{ownerType}.{ownerID}.{event}.{action}` (stream segment omitted when `StreamName` is nil). Streams are declared in `shared/external/db/nats/natsConn.go` (`STREAM_USER_EVENTS`, `STREAM_CONTENT_EVENTS`).

### Counters are eventually consistent

Writes publish an `Event` to JetStream. `redis/internal/root.go` subscribes to `STREAM_CONTENT_EVENTS.>` and increments hash fields (`likes_count`, `comments_count`, …) in Redis via `shared/external/db/redis/contentStore.go`. GraphQL `Meta`/`PersonalizedMeta` reads come from that cache. So a new counter needs three coordinated changes: the event publish, a `handle*Event` case in the redis worker, and the store method.

### DB connections are package-level `init()` singletons

`shared/external/db/{postgres,mongo,nats,neo,redis}` each open their connection in `init()` and `log.Fatal` on failure. Importing the package connects. Consequence: any Go binary that imports these — including a CLI subcommand or the seeder — needs the full env set present or it dies at startup.

### Data split

- **Postgres** (sqlc): users, personas, roles, channels, memberships, geo, verification, events.
- **MongoDB** (`app.objects`): posts, comments, replies as portable-text documents.
- **Neo4j**: wired into the resolver but only lightly used.
- **Redis**: sessions, subscription lists, per-subject offsets, content counters, persona cache.

### Frontend conventions

`@/` aliases `src/` (both `vite.config.ts` and tsconfig). Data access splits three ways: `src/services/*.ts` for REST, Apollo + `.graphql` documents in `src/graphql/` for content (hooks come from `src/generated/graphql.ts` after `pnpm codegen`), and the WS singleton for realtime. Zustand stores in `src/stores/` hold client-only state; React contexts at `src/*.context.tsx` provide auth, theme, dialogs, websocket. Components are shadcn-style under `src/components/ui/`. Post editing uses `@portabletext/editor` — the renderers and schema live in `src/components/portable-text/`.

Dev-mode requests are proxied, not direct: `/api`, `/query`, `/ws` go to `VITE_API_BASE_URL` / `VITE_WEBSOCKET_BASE_URL` (default `https://lxd-development-app`) with `secure: false` and `cookieDomainRewrite: "localhost"`.

## Environment

`.env` files are gitignored; in production values come from Ansible vault vars. Go services read:

`DATABASE_DSN`, `MONGODB_DSN`, `NATS_CONNECTION`, `REDIS_ADDR`, `REDIS_PASSWORD`, `JWT_SECRET_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL_ADDRESS`, `SMTP_EMAIL_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GRPC_PORT`, `GRPC_WATCHING_DIR`.

Rust proxy: `GO_APP_URL`. Frontend: `VITE_API_BASE_URL`, `VITE_WEBSOCKET_BASE_URL`, `VITE_HEART_REACT_VOICE_URL`.

## Conventions

- Commits are prefixed with a ticket key, e.g. `WWW-0000 Fix linting issues`.
- Never hand-edit generated output: `shared/pkg/db/`, `shared/pkg/graph/*.generated.go`, `shared/pkg/graph/models/models_gen.go`, `front-end/src/generated/graphql.ts`, `gRCP/*/app_service/`.
- A backend change touching the GraphQL schema requires regenerating on both sides: `make generate-models` in `shared/`, then `pnpm codegen` in `front-end/` once the schema is deployed.

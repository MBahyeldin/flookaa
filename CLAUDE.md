# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A realtime social platform ("flookaa") built as a polyglot monorepo: several Go services in one `go.work` workspace, a Rust WebSocket proxy, a React/Vite frontend, and Ansible playbooks that provision everything into LXD containers. `README.md` at the root has the intended architecture overview; the TODO list lives in Jira (project `WWW` on flookaa.atlassian.net), not in `notes.md`.

There are no tests anywhere in the repo (no `*_test.go`, no frontend test runner). Don't claim test coverage or invent test commands.

## Layout

| Path | Module / language | Role |
|---|---|---|
| `backend/` | Go, module `app` | Main HTTP service: REST (`/api/v1`), GraphQL (`/query`), and `/control` |
| `shared/` | Go, module `shared` | Shared library: DB connections, SQL migrations/queries, generated sqlc + gqlgen code, subject helpers. Imported by every Go service except `whatsapp` |
| `redis/` | Go, module `redis_worker` | NATS consumer that maintains Redis counter caches |
| `notifier/` | Go, module `notifier` | NATS consumer that turns content/channel/follow events into per-persona notifications in Postgres and pushes their ids over `STREAM_USER_EVENTS`. See "Notifications" below |
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

`pnpm codegen` reads the repo's schema files, `shared/external/graph/*.graphqls` (see `codegen.yml`), so it runs offline and matches the branch. `src/generated/graphql.ts` is generated; don't edit it.

`tsc-check` is `! npx tsc -b | grep '.tsx'` — it only fails the build on errors in `.tsx` files. Type errors in `.ts` files pass. Keep that in mind when "the build is green".

### Build & deploy

Each Go service has its own `deploy.bash` / `deploy.sh` that cross-compiles for `linux/amd64` and `scp`s the binary into the target container's gRPC watch directory (`/home/gRPC/watched`), where the gRPC agent picks it up:

```bash
cd backend && ./deploy.bash     # -> gRPC@backend
cd s3      && ./deploy.bash     # -> gRPC@s3
cd redis   && ./deploy.bash     # -> gRPC@redis
cd notifier && ./deploy.bash    # -> gRPC@notifier (needs migrations through 032 applied, or it refuses to start)
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

- `auth.Middleware(signer)` (global) only **parses** the `jwt` cookie and sets `user_id`, `persona_id`, `email_address`, `email_verified` in the Gin context. It never rejects.
- `auth.RequireSession()` → 401 `{"error":"unauthenticated"}`. `auth.RequireUser()` → 401, or 403 `{"error":"email_unverified"}`. `auth.RequirePersona()` → 401, 403 `email_unverified`, or 403 `{"error":"persona_required"}` when no persona is chosen (`persona_id` is 0 after login until `set-current-persona` reissues the JWT), checked in that order.
- **Email verification is a JWT claim** (`email_verified`, set by `LoginToken` from `users.is_verified`), not a per-request lookup: verification only goes one way, so a stale claim only fails closed. A token without the claim counts as unverified. `auth/info` reissues the cookie when the claim disagrees with the database, and `auth/verify` reissues it on success. If anything ever un-verifies a user, the gate needs a DB lookup. Google login verifies an existing unverified account.
- `auth.RequireAdministrator(isAdmin)` → the `RequireUser` answers, then 403 `{"error":"not_administrator"}` unless the user is a global `Administrator` (`user_roles`). It's a **DB check per request** (`IsGlobalAdministrator`), not a JWT claim, because a role can be taken away. `auth/info` returns `is_admin` only as a UI hint (the sidebar's Admin entry); a 403 `not_administrator` clears it in the frontend.
- Handlers read identity with `auth.UserID(c)` / `auth.PersonaID(c)` / `auth.Email(c)` / `auth.EmailVerified(c)`, never `c.Get(...)`.

Tiers are applied at **group** level, so a new route inherits its group's tier:

| Tier | Routes |
|---|---|
| Public | `/api/v1/health`, `auth/register`, `auth/login`, `auth/logout`, `auth/google`, `auth/oauth2callback/*`, `geo/*` (used during signup), `GET interests` |
| Session (unverified allowed) | `auth/info`, `auth/verify`, `auth/verify/resend` |
| User | `users/*`, `persona/*` (except below) |
| Persona | `channels/*`, `communities/*`, `notifications/*`, `persona/:persona_id`, `persona/:persona_id/*`, `POST /query`, `POST /control` |
| Administrator | `admin/*` |

**Content and channel actions belong to a persona, not a user**: authorship, membership, realtime subscriptions (Redis `persona:<id>:subjects`) are all keyed by `persona_id`; `user_id` is only for account and persona management. A response about another persona never carries `user_id`, `is_default`, or any other field that ties it to the account or to the user's other personas; only your own account and persona endpoints return them. GraphQL never reads `user_id`. `/playground` is only mounted when `GIN_MODE` is not `release`.

The frontend mirrors this: REST calls go through `src/lib/apiFetch.ts` and Apollo through an `ErrorLink` in `src/graphql/client.ts`. On 401 they clear `user` (App renders the public layout); on 403 `email_unverified` they mark `user.is_verified` false (DashboardLayout renders the verify step, `pages/verify-email`, on any route); on 403 `persona_required` they clear `persona` (DashboardLayout renders persona selection). No redirects. Verification codes: one live code per user, 5 attempts, resend cooldown 60 s (`backend/util/verification`).

### Onboarding

New users go through onboarding after verification and before the dashboard; it's a UI flow, not a backend gate.

- **Steps are registered on the server**, in order, in `backend/internal/onboarding` (`onboarding.New(steps...)` in `root.go`): `Step{ID, Key, Skippable, Done}`. Ids are fixed and increase in flow order (`about_you` 1, `interests` 2, `communities` 3, `channels` 4, `personas` 5); all five are registered. Once a step id is deployed it never changes, because `users.onboarding_step` stores it.
- **State**: `users.onboarding_step` is the id of the last step passed (0 = none); the current step is the first registered one with a larger id. Completed = `onboarding_completed` or no step left. Migration 021 marked every user before it as completed.
- **Catch-up**: past every step, the non-skippable steps whose `Done` is false (e.g. an older user without date of birth) become the flow on their own: `steps` lists only them, `next` writes nothing, `skip`/`back` are refused. Optional steps are never shown again. So `auth/info` of a completed user runs the required steps' `Done` queries; a `Done` error fails open (logged, treated as done).
- `auth/info` returns `onboarding: {completed, current, steps: [{key, skippable}]}`. `POST /api/v1/users/onboarding {step, action: next|skip|back}` moves it: `step` must be the current one (409 `step_mismatch`), `next` needs the step's `Done` (400 `step_incomplete`), `skip` only on skippable steps (400 `step_required`). The update is compare-and-set on `onboarding_step`. Every answer carries the fresh `onboarding`. Steps save their own data through their own endpoints; `PATCH /users/profile` never touches onboarding.
- **Frontend**: `DashboardLayout` renders verify → `pages/onboarding` (until completed) → persona selection → dashboard. The page first makes the default persona current (onboarding runs as it), then `OnboardingShell` shows the progress ("n / N" over all registered steps; a skipped step counts as passed) and the step from `pages/onboarding/steps.ts`. Each step renders `OnboardingFooter` (left note, Back, Skip now, Continue running the step's save then `next`). `/dev/onboarding` (dev builds) previews the frame with fake steps.

- **About you** (`about_you`): `users.date_of_birth` (1900-01-01 to today UTC) and `users.gender` (`gender_enum` male/female), saved through `PATCH /users/profile` (400 `invalid_date_of_birth` / `invalid_gender`), set or changed, never cleared. Account data: only `GET`/`PATCH /users/profile` return them, never `auth/info` or anything about a persona.
- **Interests** (`interests`): at least one interest on the **default persona** (`DefaultPersonaHasInterests`). The step edits the default persona by id, not the current one, so a catch-up works whichever persona is current.
- **Communities** (`communities`, skippable): cards from the current (default) persona's community suggestions (one fetch of up to 50, no paging, since a join drops it from the next fetch), each with Join (rules dialog first when it has rules, `components/community-rules-dialog`) and Follow. Actions go through the community endpoints at once, not on Continue. Footer shows "n selected"; Continue needs one. `Done` = the default persona is an active or pending member of, or follows, a live community (`DefaultPersonaInCommunity`). The card body is `CommunityCardBody`, shared with the communities list.
- **Channels** (`channels`, skippable): the same frame for the persona's channel suggestions, grouped "From your communities" (`source: community`) then "Based on your interests" (a heading only when both show). Join and Follow act at once through the channel endpoints; no success toasts. `Done` = the default persona is an active or pending member of, or follows, a live channel (`DefaultPersonaInChannel`). The card body is `ChannelCardBody` (`linked={false}` here, so it never navigates away), shared with `ChannelCard`.
- **Personas** (`personas`, skippable, last): `Done` is `onboarding.Always`, so Finish and Skip both complete onboarding; the footer shows Back and Finish, then navigates to `/`. The default persona's "Manage persona" and the "Add another persona" card (its privacy chips preset step 2) open `pages/onboarding/persona-wizard`: basics (avatar, persona type chips that set the private label `name`, `@slug`, theme, bio; names too when creating), privacy, interests (at least one), then save. Editing sends only changed fields to `/persona/update`, then the interests. Other personas open their settings form and interests in a sheet, not `/persona-manager/:id` (the dashboard shows onboarding on every route until it's completed). `POST /persona/create` takes an optional `slug` (`invalid_slug`, 409 `slug_taken`), `description` is optional, and it answers `{persona_id}`.

A new step needs: its `Step` in `onboarding.New` with a `Done` check, its endpoints, and its `steps.ts` entry (`title`, `Component` rendering `OnboardingFooter`).

### The realtime path

1. Browser opens one WebSocket to the Rust proxy (`/ws`, `nats/src/ws.rs`), forwarding cookies.
2. Proxy POSTs subscribe/unsubscribe control messages to the Go app's `/control`, passing the browser's `Cookie` header through (`nats/src/go_bridge.rs`, target from `GO_APP_URL`).
3. Go validates membership, resolves NATS subjects plus per-subject offsets from Redis, and returns `{action, subjects: [{subject, offset}], durable}`.
4. Proxy attaches JetStream consumers for those subjects and multiplexes events down the one socket.
5. Frontend (`front-end/src/ws/index.tsx`, a singleton with a 5s `HEARTBEAT`) dispatches incoming frames to listeners keyed by the message `id`, then refetches details over REST/GraphQL — events carry IDs, not full payloads.

Subject strings are built only through `shared/pkg/subject` — `{stream}.{ownerType}.{ownerID}.{event}.{action}` (stream segment omitted when `StreamName` is nil). Streams are declared in `shared/external/db/nats/natsConn.go` (`STREAM_USER_EVENTS`, `STREAM_CONTENT_EVENTS`, `STREAM_CHANNEL_EVENTS`). Channel membership changes (`member`, `follower`, `join_request` × `create`/`delete`, payload `{persona_id, reason}`, `actor_id` = who made the change) go to `STREAM_CHANNEL_EVENTS` only — they are NATS events, not `events` rows. `/control` subscribes a channel's websockets to both the content and channel-events subjects. Persona follow changes (`follower`, `follow_request` × `create`/`delete`, same payload with the follower's `persona_id`) go to `STREAM_USER_EVENTS.PERSONA.<followed>.…`, also NATS-only, and are not in the default WS subscription. Approving, rejecting or removing publishes on the same subjects with the followed persona as `actor_id` (reasons `approved`, `rejected`, `removed`). Whatever starts or ends an **active** follow also publishes `…PERSONA.<id>.follow_counts.update` (no payload) for both personas; `/control` owner `PERSONA` serves that subject to viewers who see the persona, so visitors get live counts without learning who follows. Follow invitations publish `follow_invitation` × `create`/`delete` on the **invitee's** subject, `STREAM_USER_EVENTS.PERSONA.<invitee>.follow_invitation.…`, with the inviter as payload `persona_id` (reasons `invited`, or `accepted`/`rejected`/`cancelled`); an accepted one also publishes `…PERSONA.<inviter>.follower.create` with reason `invited`. Only the persona itself also gets its own `follower.*`, `follow_request.*` and `follow_invitation.*` subjects. Communities publish `STREAM_CHANNEL_EVENTS.COMMUNITY.<id>.info.update` (info or interests) and `…channels.update` (a channel added or taken out), NATS-only with no payload; `/control` owner `COMMUNITY` serves both to every persona, plus `counts.update` (and `join_request.*`, `channel_request.*` to managers, see Communities). A channel's community row changing publishes `STREAM_CHANNEL_EVENTS.CHANNEL.<id>.community.update` (no payload), which reaches the channel's websockets like its other events. Owner type `COMMUNITY` is `subject.OwnerTypeCommunity`, not a GraphQL `OwnerType`: communities own no content. Community membership and `moderator` events are described under Communities. `notifier-channel` filters `STREAM_CHANNEL_EVENTS.CHANNEL.>` `STREAM_CHANNEL_EVENTS.COMMUNITY.*.channel_request.*` and `STREAM_CHANNEL_EVENTS.COMMUNITY.*.join_request.*`.

### Channel access

Rules live in one place, `shared/pkg/access` (`LoadChannel` → `CanRead`/`CanWrite`/`CanModerate`), used by the REST channel handlers, `/control`, and the GraphQL resolvers:

| | public channel | private channel |
|---|---|---|
| see metadata (list, `getChannel`) | every persona | every persona (so they can request to join) |
| read posts/comments, subscribe | every persona | active members |
| post / comment / like | active members | active members |
| join | immediate (`status = 'active'`) | pending request; owner, channel moderators, or global Administrators approve via `/channels/:id/requests/...` |

**Age limits** (`min_age` on `channels` and `communities`: required, `NOT NULL` with no default, one of 13/16/18/21; migration 033 set 13 on every row that existed then, the seeder uses 13): one SQL function, `persona_meets_min_age(persona_id, min_age)`, compares the persona's **user**'s `date_of_birth` (UTC; none = too young, so such a user sees no community or channel). `GetChannelAccess` / `GetCommunityAccess` return `meets_min_age`, and `LoadChannel` / `LoadCommunity` answer not found when it's false, so a too-young persona gets 404 everywhere (metadata, content, join, follow, `/control`) and never learns why. List queries (`GetAllChannels`, `ListCommunities`, `ListChannelCommunities`, `ListModeratedChannels`, `SuggestCommunities`, `SuggestChannels`) and notification visibility (`CHANNEL` scope, and personal rows whose subject is a `COMMUNITY`) call the same function; any new list must too. No exceptions for owners, moderators or Administrators; setting a limit above your own age is 400 `invalid_min_age`. Raising it keeps under-age rows and only hides access. Channels and their community have independent limits. Set with `min_age` on community create (required)/`PATCH` and channel create (required), and `PUT /channels/:channel_id/min-age` (`CanModerate`), which publishes `STREAM_CHANNEL_EVENTS.CHANNEL.<id>.info.update` (no payload; the channel page refetches).

Membership is `channel_members` with `left_at IS NULL AND status = 'active'` — every membership query must filter on both. Moderators list and remove members via `/channels/:id/members[/:persona_id/remove]` (the owner can't be removed); leaving or being removed also soft-deletes the persona's `channel_roles`, because `can_moderate` reads roles, not membership. Non-readers get 404 / `channel not found`, never 403, so private channels don't leak existence of content. For existing objects (comments, likes) resolvers authorize and publish against the owner **stored on the Mongo document** (`loadObject` → `authorizeOwner`), never the client's `owner` input. Only channel-owned content is supported: `authorizeOwner` refuses any other owner type (`PERSONA`, `PAGE`) as not found until those get access rules.

### Communities

A community groups channels; it has no posts of its own (its content is its channels' posts).

- Tables: `communities` (`slug` unique across **all** rows, deleted ones too, so an old link never points elsewhere; `create` is reserved for `/communities/create`), `community_interests` (1 to 5, same rules and codes as channel interests), `community_channels` (one row per pair, `status` pending/active/rejected; a partial unique index allows one live row per channel, so a channel is in one community or waits on one, never both; there is no `channels.community_id`).
- Rules in `shared/pkg/access/community.go` (`LoadCommunity`). Every persona sees every community's metadata.
  - `CanManage` (owner, moderator or global Administrator): info, interests, rules, join requests, member list and removal, creating channels in it. 403 `not_community_manager`.
  - `CanOwn` (owner or global Administrator): appointing and removing moderators, changing `visibility`, removing a moderator from the community. 403 `not_community_owner`.
  - **Moderators**: `community_roles` (like `channel_roles`, role `moderator`, soft `deleted_at`; the owner has no row). A role counts only while its persona is a live active member. `POST /communities/:id/moderators/:persona_id` (`CanOwn`, active members only, 400 `not_a_member`) and `…/remove` (`CanOwn`, or the moderator stepping down). Leaving or being removed ends the persona's roles in the same transaction. Community moderators are **not** channel moderators: `access.Channel` never reads `community_roles`.
  - **Rules**: `communities.rules`, plain text up to 5000 characters (400 `invalid_rules`), on every `Community` response; the page shows them, and joining a community with rules goes through an "Agree and join" dialog (UI only, nothing stored).
- REST (`communities.Handler`): `GET /communities/?interest=`, `POST /communities/create`, `GET /communities/by-slug/:slug`, `GET`/`PATCH /communities/:community_id` (managers, 403 `not_community_manager`; 409 `slug_taken`). The owner is shown through `ResolvePersonasForViewer` (anonymous key 0).
- **Channels in a community**: nothing appears in a community without a manager's approval.
  - A manager creating a channel there (`community_id` on `POST /channels/create`) puts it in directly. Anyone else's channel is created standalone with a pending request in the same transaction (the response's `community_status` says which). `channels.Create` writes the channel, owner membership/follow/moderator role, interests and community row in one transaction; the seeder uses it too.
  - An existing channel's `CanModerate` asks with `POST /communities/:id/channels/:channel_id/request` (202 `pending`; 409 `channel_in_community`, `channel_request_pending`, or `recently_rejected` inside 30 days of a rejection of that pair; another community can be asked at once) and can `…/cancel`. Managers list `GET …/channel-requests` and `POST …/channel-requests/:channel_id/{approve|reject}`; the requester (`requested_by`) is told either way.
  - `…/channels/:channel_id/remove` (soft `removed_at`): managers remove it, the channel's moderators take it out. Asking again later revives the row.
  - Every "is in the community" read (`channels_count`, `GET /channels/?community_id=`, `Channel.community`, the seeder's lookups) filters `status = 'active' AND removed_at IS NULL`.
  - Channel side: `GET /channels/:channel_id/community` (moderators: `{status, community, rejected_until?}`, the Manage sheet's Community tab) and `GET /channels/moderated` (the suggest picker).
  - Events: `channel_request` × `create`/`delete` on `…COMMUNITY.<id>`, payload `{channel_id, reason}` (`requested`, `approved`, `rejected`, `cancelled`), managers only; approve, remove and leave also publish `channels.update`.
  - Channel access never depends on the community. `GET /channels/?community_id=` lists a community's channels; list items and GraphQL `Channel.community` carry `{id, name, slug}`.
- **Membership and following are separate**, one row per pair each (like `persona_followers`):
  - `community_members` (`status` pending/active/rejected, no default; `resolved_at`; soft `left_at`, joining again revives the row). Live member = `status = 'active' AND left_at IS NULL`. The owner is a member from `CreateCommunity` (one CTE, so the seeder gets it too) and can't leave or be removed.
  - `community_followers` (soft `unfollowed_at`). Only public communities can be followed (400 `cannot_follow_private`). Following grants nothing; joining never follows and following never joins.
  - Join: public is `active` at once, private files a `pending` request that managers approve or reject. Approval and rejection are both told (notifications, below). A rejection has a 7-day cooldown from `resolved_at` (`access.RejectedUntil`): inside it the viewer's status reads `rejected` with `rejected_until`, and joining again is 409 `recently_rejected` and changes nothing. After it, joining files a new request.
  - Going private ends every follow; going public admits every pending request (both in the `PATCH` transaction).
  - Membership never grants anything in the community's channels.
- Member list and the community page's channel list (`GET /channels/?community_id=`): every persona on a public community, members and managers on a private one (`CanSeeInside`, 403 `members_only`). The channels themselves stay in the general `/channels` list under their own rules. Member and request rows go through `VisiblePersonas`, with `access.AnonymousCommunityName(persona, community)` for the anonymous view (differs from channel names and across communities).
- `Community` responses carry recounted `members_count`/`followers_count` and the viewer's `membership_status` (`none`/`pending`/`active`, or `rejected` plus `rejected_until` inside the cooldown) and `following` (`ListCommunityStats`, one query per page); single ones add `can_manage`/`can_own`/`is_owner`/`is_moderator`. Member rows carry `is_moderator`.
- REST: `POST /communities/:id/{join|leave|follow|unfollow}`, `GET …/members`, `POST …/members/:persona_id/remove`, `GET …/requests`, `POST …/requests/:persona_id/{approve|reject}` (managers).
- Events (NATS-only, `STREAM_CHANNEL_EVENTS.COMMUNITY.<id>.…`): `member`/`follower`/`join_request` × `create`/`delete` with `{persona_id, reason}` like channels, `moderator` × `create`/`delete` (same payload, reasons `appointed`, `removed`, `stepped_down`, `left`), and `counts.update` (no payload) when a member or follower count changes. `/control` owner `COMMUNITY` serves `info`, `channels`, `counts`, `moderator.*` to everyone and `join_request.*` to managers; the page resubscribes when the viewer's `can_manage` changes. A requester learns of an approval through `counts`, and of a rejection through its notification (the page refetches on a notification while pending).
- **Suggestions** (`GET /persona/:persona_id/suggestions/{communities|channels}`, any of the user's own personas like `/interests`, 403 `not_your_persona`; `?limit=` ≤ 50, `?offset=`): computed **as that persona** (age, exclusions, viewer fields), one query per page, nothing stored, not realtime. Communities need at least one shared interest (none = `[]`, no popularity fallback). Channels add `source`: `community` (active channels of communities the persona is an active member of or follows) before `interest` (shares an interest). Order: source, shared interests, live members, members of the persona's user's gender (everyone if unset), id; only the order is returned. Public only. Left out: too young, deleted, and anything with a live membership row (any status, so a community that rejected the persona is never suggested again) or a live follow. Items are the list shapes (`communities.Handler.build`, `channels.Handler.build`).
- Pages: `/communities`, `/communities/create`, `/communities/:slug` (follows a slug change made elsewhere by refetching by id; Join/Follow, counts, `MembersSheet` with a Requests tab for managers).

### Persona access

Private and `only_me` personas can do everything a public one can (join, post, comment, like). Persona privacy decides **which view** of a persona a viewer gets, not what the persona may do. Rules live in `shared/pkg/access/persona.go` (`VisiblePersonas`, one query per page):

| Persona's privacy | Sees the real persona | Everyone else |
|---|---|---|
| `public` | everyone | — |
| `private` | itself, its user's other personas, its approved followers, personas it follows or asked to follow | anonymous |
| `only_me` | itself, its user's other personas, personas it follows or asked to follow | anonymous |

- **Approved follower**: a `persona_followers` row with `status = 'active' AND unfollowed_at IS NULL`. `status` (`persona_follow_status_enum`: `pending`/`active`/`rejected`) has no default, so every insert states it.
- **Following** (`POST /persona/:persona_id/follow` and `/unfollow`, `followers.Handler`): a public persona is followed at once (200 `active`), a private one gets a pending request (202 `pending`), an `only_me` or missing one is 404, and you can't follow yourself. `persona_followers` has one row per pair: unfollow is soft (`unfollowed_at`) and a later follow revives the row. A rejected request stays rejected: following again answers pending and changes nothing, and unfollow refuses it.
- **Following reveals you**: a `pending` or `active` follow shows the follower's real self to the persona it follows, everywhere (a rejected or ended follow hides it again). The follow button warns a non-public follower before it follows.
- **Managing followers** (`followers.Handler`, self only, otherwise 403 `not_your_persona`): `GET /persona/:persona_id/requests`, `POST …/requests/:follower_id/{approve|reject}`, `GET …/followers`, `POST …/followers/:follower_id/remove`. Reject is permanent; remove is soft (`unfollowed_at`), notifies nobody, and the persona may follow again. The profile page opens them in `FollowersSheet` (`?followers=requests|followers`).
- **Anonymous view**: `access.AnonymousName(personaID, channelID)` ("Quiet Otter 37"), the same within a channel and different across channels, and no thumbnail; the frontend draws a `GeneratedAvatarFallback` from the name. **Ids stay real**, so moderators act on anonymous members by `persona_id`.
- There are no exceptions for moderators or global Administrators.
- The rule is one SQL query, `ResolvePersonasForViewer(viewer_id, ids)` (fields + `visible`). Every response that shows another persona's name or avatar goes through it: GraphQL post/comment authors and the channel owner (`Resolver.resolvePersonas`), channel member and join-request lists (`access.VisiblePersonas` via `channels.Handler.anonymize`, non-public personas only), and notification actors (`notifications.Handler.resolveActors`, as the recipient sees them, anonymous names keyed by the notification's community for community kinds, else its channel, or 0 when personal).
- **Follow-request link** (`personas.invite_token`, migration 017): a private persona's one shareable link, `/follow/<token>`, valid until reset. A CHECK keeps it private-only and a privacy change away from private clears it, like `show_on_profile`. Owner (self only, 403 `not_your_persona`): `POST /persona/:persona_id/invite-link` (get or create) and `…/invite-link/reset`. Visitor: `GET /persona/invite/:token` answers `{visible: true, persona_id}` only to a viewer who already sees the persona, otherwise `{visible: false, follow_status}`, so the link never reveals the id; `POST /persona/invite/:token/request` goes through the same `follow` as `/:persona_id/follow`. Unknown or reset tokens are 404. Login takes `?next=` (same-site paths only) so a logged-out visitor comes back to the link.
- **Follow invitations** (`persona_follow_invitations`, migration 018, `followers/invitations.go`): A invites a specific B to follow A (`POST /persona/:persona_id/invite`, `…/uninvite`, `:persona_id` = B). Only a private A can invite (a public one can just be followed; others get 400 `cannot_invite`), and only a B that A sees and that isn't the same user's, public or not (404 otherwise). If B already follows A it answers `following`; if B has a pending request it's approved instead (`following`); otherwise a pending invitation (202 `invited`). B answers with `POST /persona/:persona_id/invitations/:inviter_id/{accept|reject}` (self only). Accepting makes B an active follower from any earlier state, even a rejected request; following an inviter (`/follow` or the link) accepts its invitation too. A rejection isn't told to A: for 30 days re-inviting answers `invited` and changes nothing, and `invite_status` keeps reading `pending`. One row per pair; leaving private cancels the persona's pending invitations (`UpdatePersona` → `followers.Handler.CancelInvitationsFrom`). A pending invitation from a private A shows A's real self to B (a clause in `ResolvePersonasForViewer`). `GET /persona/:persona_id` adds `invite_status`, `invited_you`, `can_invite`; the card and profile show "Invite to follow" when `can_invite`, and the profile shows an Accept/Decline banner when `invited_you`.
- **`show_on_profile`** (opt-in link from a public persona to its user's profile, default off) is public-only: a CHECK constraint enforces it, and a privacy change away from public clears it in the same update. Like `is_default`, it is account data, returned only by your own `/persona/list` and `/persona/update`.
- **Connected personas** (`GET /persona/:persona_id/connected`, `ListConnectedPersonas`): a persona that is public with `show_on_profile` on is **linked**. Only a linked source lists its user's other linked personas, and the source itself is not in the list. A source the viewer sees only anonymously is 404. A visible but unlinked source returns `[]`, since listing its siblings would tie it to them. The owner gets the same view as a visitor.
- **Profile page** (`/personas/:id`, `GET /persona/:persona_id`): the persona's public fields (`id`, names, `slug`, `thumbnail`, `bio`, never `name`, which is the owner's label) plus its connected personas, with `locked: false`. A private persona the viewer only sees anonymously answers 200 `{id, locked: true, follow_status}` and nothing else about it; the page shows a locked view with a "Request to follow" button, and listens to the viewer's own `follow_counts.update` (it can't subscribe to the target) so an approval turns it into the full profile. `only_me`, deleted and missing personas are 404. Persona views carry `anonymous` (GraphQL `Persona`, channel member and join-request rows), and every name or avatar opens a card (`components/persona-link`, `PersonaLink` → `PersonaCard`) that fetches `GET /persona/:persona_id` on open: a full answer gives the real persona, a follow button when `followable` (not `only_me`) and "View profile"; `locked` gives the anonymous name with "Request to follow"; 404 gives the anonymous name only.
- **Follow counts** (on `GET /persona/:persona_id`): `followers_count`/`following_count` are recounted active rows whose other persona isn't deleted, `follow_status` is the viewer's own follow (`rejected` reads as `pending`), and `requires_approval` is true for a private persona (it drives the unfollow confirm). The profile page refetches on `follow_counts.update`. `/connected` items carry `follow_status` too.
- **The Redis persona cache (`persona:<id>:info`) holds public personas only**: `SetPersonaInfo` skips the others and `GetPersonaInfo` drops a cached non-public entry. A cache hit is therefore visible to everyone and needs no query; only misses go to Postgres, one batch per page. `UpdatePersona` evicts the entry.

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
- **Notifier**: durable consumers `notifier-content` / `notifier-channel` / `notifier-user` (`DeliverNew`, explicit ack, same backoff as the redis worker). It never notifies you about your own activity, and it takes the recipient of comments and likes from the event's `recipient_id` (set by the resolvers), so it doesn't read Mongo. It publishes `STREAM_USER_EVENTS.PERSONA.<id>.notifications.{create|delete}` with `{notification_id}`. `notifier-user` reads `STREAM_USER_EVENTS` through specific filter subjects (`PERSONA.*.follower.*`, `PERSONA.*.follow_request.*`, `PERSONA.*.follow_invitation.*`); any consumer there must do the same, never `STREAM_USER_EVENTS.>`, or it would consume these frames.
- **Follow kinds** (`new_follower`, `follow_request`): personal, subject `PERSONA` = the followed persona, aggregated per persona and recounted from `persona_followers` (all active followers, or pending requests). Only `follower.create` with reason `followed` notifies; unfollows, removals, resolved and cancelled requests remove the row once nobody is left. `follow_request_approved` goes to the requester on `follower.create` with reason `approved`: single actor (the approving persona), subject `PERSONA` = that persona.
- **Invitation kinds**: `follow_invitation` goes to the invitee, single actor, subject `PERSONA` = the inviter (one row per inviter), and is removed for that recipient only (`removeOne`, which skips rows a newer event touched) when the invitation is accepted, rejected or cancelled. `follow_invitation_accepted` goes to the inviter on `follower.create` with reason `invited`: single actor, subject `PERSONA` = the new follower. An accepted invitation doesn't also create `new_follower`.
- **`data`** (`shared/pkg/notifications.Data`) holds only facts that can't change for the notification's life. For example `post_id`, the post at the top of a content notification's thread: resolvers put it on the event and the notifier stores it. It never holds names, avatars, counts or editable text; those are looked up at read time like actors. Rows written before a field existed lack it, so readers treat every field as optional.
- **Channel request kinds**: `channel_request` goes to each community manager (owner + live moderators, from `ListCommunityManagerIDs`), subject `COMMUNITY`, aggregated per community and recounted from pending `community_channels` rows; the recount is zero for a recipient that no longer manages the community, so its row stops showing. `channel_request_approved` / `channel_request_rejected` go to the event's `recipient_id` (the requester): single actor (the deciding manager), subject `COMMUNITY`, `data.channel_id`.
- **Community join kinds**: `community_join_request` goes to the community's managers on `join_request.create`, subject `COMMUNITY`, aggregated per community and recounted from pending `community_members` (zero for a recipient that no longer manages it). `join_request.delete` recounts it, and with reason `approved`/`rejected` sends `community_request_approved`/`community_request_rejected` to payload `persona_id`: single actor, subject `COMMUNITY`. A community going public approves every pending request, so those requesters are told too.
- **`channel`** in the list response is looked up at read time (one batched `ListChannelSummaries` per page), like `latest_actor`: names change, so they're never stored. For community kinds it comes from `data.channel_id`, and **`community`** is looked up the same way (`ListCommunitySummaries`).
- **Frontend**:
  - `stores/NotificationStore` holds the badge and popover state, and `hooks/useNotificationsRealtime` (in `DashboardLayout`) feeds it from the default WS subscription via `subscribeToDefaultEvents`.
  - `components/notifications/describe.ts` is the one place mapping a kind to its text and link; unknown kinds return null and aren't rendered.
  - Content kinds link to `/channels/<id>?post=<data.post_id>`, which `channels/[id]/PostDialog` opens.
- **API paging**: the cursor is `"<updated_at µs>_<id>"`, taken from the last row read. Rows whose recount is zero are dropped after the query, so a page can be short or empty and still have `next_cursor`; page until it's null.

A new kind needs:
1. `ALTER TYPE notification_kind_enum ADD VALUE` in its own migration (plus subject/scope values if new), then `make generate-models`.
2. A spec in `notifications.Kinds`.
3. A notifier handler for its source events.
4. A visibility rule if the scope type is new.
5. Frontend rendering.

### Dependencies are wired explicitly in each `main`

There are no connection globals. `shared/external/db/{postgres,mongo,nats,redis}` each expose `Connect(...)`, and importing a package connects nothing. Each binary's `main` loads its own `internal/config` (built on `shared/util/envconfig`, which reports **all** missing vars in one error), connects only what it uses, and passes handles into constructors:

- Backend: `backend/cmd/server/root.go` builds one `Handler` struct per domain (`users`, `channels`, `communities`, `notifications`, `geo`, the `/control` handler, `oauthproviders.Google`) plus the GraphQL `resolvers.Resolver`, each holding only its own deps (`*db.Queries`, specific Redis sub-stores, `*nats.NatsHelper`, `*token.Signer`). The seeder (`app seed`) loads only `DATABASE_DSN` and the admin credentials; it creates the roles and the `ADMIN_EMAIL` user, grants that user `Administrator` (revives a removed grant), seeds the starting interests, and creates the starting communities with their channels (owned by the admin's default persona; skips a community whose slug exists and a channel whose name its community already has). Everything it does is idempotent. Platform base content belongs in the seeder, not only in one database.
- Redis worker: `redis/main.go` → `internal.NewWorker(...)`.
- Notifier: `notifier/main.go` → `notifications.Check`, then `internal.NewWorker(nats, q)`. It needs `DATABASE_DSN` and `NATS_CONNECTION` only.
- JWTs go through `token.Signer` (`shared/util/token`), which refuses a secret under 32 bytes. `s3` builds its own signer to verify the backend's image tokens.

Only `config` packages call `os.Getenv`. A new dependency means a constructor parameter, not a package global.

### Interests catalogue

`interests` is the one catalogue personas, channels and communities are tagged with: `name` (unique case-insensitively), `slug` (same rule as persona slugs, `backend/internal/slug` / `front-end/src/lib/slug.ts`), `emoji`, `group_id`, `sort_order`, `retired_at`. Every interest belongs to an `interest_groups` row (name, slug, order); the column is nullable only for rows from before migration 024, and the API requires it (400 `invalid_group`). Retired interests aren't offered for new picks but stay on existing tags; there is no hard delete, of interests or groups. `GET /api/v1/interests` returns groups in order with their active interests (empty groups and ungrouped interests left out). Global Administrators manage both under `/api/v1/admin/interests` (`{groups, interests}`, create, `PATCH`, `/:id/move {direction}` within its group, which renumbers the whole list, `/:id/retire|restore`) and `/api/v1/admin/interest-groups` (create, `PATCH`, move), and at `/admin/interests` in the app (non-admins get "Page not found"). Edits aren't realtime: rare, one admin, next load shows them.

**Persona interests** (`persona_interests`, never on the user) are owner-only for now. `GET`/`PUT /persona/:persona_id/interests` works on any of the user's own personas, current or not (403 `not_your_persona` otherwise). `GET` answers `{groups, selected, retired}`: the active catalogue, the persona's ids, and its interests that have since been retired. `PUT {interest_ids}` replaces the set: 1 to 20 distinct ids (400 `invalid_interests`), and each new id must be active (400 `invalid_interest`); an already-tagged retired one may be kept. Inside each group, interests are ranked by how many personas of users with the viewer's gender have them (everyone's if no gender), then admin order. Only the order is returned, never counts or genders. The picker (`components/interests/InterestPicker`) is used by the onboarding step and by the Interests section of `/persona-manager/:id`. Not realtime.

**Channel interests** (`channel_interests`): 1 to 5 per channel, required on create (`interest_ids` on `POST /channels/create`, checked before anything is inserted), same id rules and error codes as persona interests. Older channels may have none. Every persona that sees a channel's metadata sees its tags: `GET /channels/:channel_id/interests` → `{interests, can_edit}`; `PUT` is `CanModerate` only (403 `not_moderator`, 404 for non-readers) and publishes `STREAM_CHANNEL_EVENTS.CHANNEL.<id>.interests.update` (NATS-only, empty payload), which the channel page refetches on. `GET /channels/` embeds `interests` per item (one batched query per page) and takes `?interest=<slug>` to filter. Editing lives in the Manage channel sheet's Interests tab; the picker sizes its grid with container queries, so it fits the sheet and the full page alike.

### Data split

- **Postgres** (sqlc): users, personas, roles, communities, channels, memberships, geo, verification, events, notifications.
- **MongoDB** (`app.objects`): posts, comments, replies as portable-text documents. A post stores `content` (parsed and validated by `portabletext.ParseContent`) and `rawContent`, marshalled from `content` so the two can't drift. Everything renders from `rawContent`; comments are plain `SimpleInput` strings.
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

`@/` aliases `src/` (both `vite.config.ts` and tsconfig). Data access splits three ways: `src/services/*.ts` for REST, Apollo + `.graphql` documents in `src/graphql/` for content (hooks come from `src/generated/graphql.ts` after `pnpm codegen`), and the WS singleton for realtime. Zustand stores in `src/stores/` hold client-only state; React contexts at `src/*.context.tsx` provide auth, theme, dialogs, websocket. Components are shadcn-style under `src/components/ui/`, restyled to the Figma Components page: buttons hover with the `tint` utility (12% `scrim`, any fill), focus is a 2px `ring`, `Button` takes `loading` (spinner + disabled), sizes `sm`/`default`/`lg`/`icon`/`icon-sm`; `Badge` is the Figma Tag (`variant="count"` for counters); `Chip` (`kind` interest/filter, a toggle when it has `onClick`), `FormField` (label, control, helper or error, ids wired), `SectionNav`, `SectionHeader`, `Logo` (channel/community mark). Cards have a border and no shadow; `shadow-sm` is for overlays only. Lists show `SkeletonList` (`SkeletonRow`/`SkeletonPost`) on first load, `EmptyState` (icon, title, one action at most) and `ErrorState` (`onRetry`); both take `compact` inside sheets, dialogs and popovers. A failed load is never rendered as an empty list. The app shell (`DashboardLayout`) is `components/app-sidebar` on `ui/sidebar` plus `components/mobile-header`: desktop (≥ 1024) expanded or collapsed to an icon rail (remembered in `localStorage`, Ctrl/⌘+B), tablet always the rail, mobile a header with the sidebar in a sheet. Its entries are the list in `app-sidebar/index.tsx`; a new top-level page adds its entry there, and an entry is only listed once its page exists. The shell keeps the viewer's palette. Unknown routes render `components/not-found`. Post editing uses `@portabletext/editor`, with the schema and renderers in `src/components/portable-text/`. Custom blocks are registered once in `portable-text/blocks/` (`defineBlock`, the `blocks` list), and `PostContent` is the only way to show a post body: it skips blocks it doesn't know or that fail their schema, and wraps the body in a `data-theme` scope.

#### Theme palettes

`data-theme="<id>"` on any element re-colours everything inside it; ids are `themes/palettes.ts` (`tide` is the default, also on `:where(:root)` / `:where(.dark)`). Every palette in `src/themes.css` is a **literal** token set (`#RRGGBB`, `#RRGGBBAA` when translucent), one light block (`[data-theme="<id>"]`) and one dark block (`.dark [data-theme="<id>"], .dark[data-theme="<id>"]`): no `oklch`, `calc` or `var()` between colour tokens. The six light blocks and `tide`'s dark block mirror the Figma `Theme` variables one to one. The other five dark blocks are **derived in code** (Figma has no mode for them): Deep Tide Dark's neutrals turned to the palette's hue at the same lightness and chroma, `primary` a light step of the palette's hue at least 7:1 on `card`, `hero-overlay` `#000000A6`. A new token goes in every palette's light and dark block (and in Figma). Besides the shadcn tokens, the palettes carry `scrim`, `sidebar-solid`, `surface-sunken` (section bands) and `hero-overlay` (scrim over a cover image). Surfaces are flat: the body is plain `bg-background`, `bg-primary` a solid fill, cards `bg-card` with a border. Light/dark stays the global `.dark` class. Status colours (`success`, `warning`, `destructive` + `-foreground`) and charts are shared by every palette (`:root` / `.dark` in `index.css`) and text-safe. Fixed foundations from Figma live in `index.css`'s `@theme`: Readex Pro as `font-sans` (Arabic and English), radius `sm` 4 / `md` 6 / `lg` 8 / `xl` 12 / `2xl` 20 (blocks only), one `shadow-sm` for raised overlays, and the type tokens `text-display`, `text-h1`..`text-h4`, `text-lead`, `text-overline`, whose sizes follow Figma's `Breakpoint` modes through `--type-*` (Mobile, `md` Tablet, `lg` Desktop); `h1`..`h4` use them by default. `article` (a utility) is the long-form post body. Check contrast on `/dev/themes` (dev builds only) after touching any colour.

#### Adding a Portable Text block

1. Pick the `_type` name and fields with care: they're permanent. Fields may be added, never renamed, retyped or removed; a retired block stays registered and only leaves the insert menu.
2. GraphQL (`shared/external/graph/portableText.graphqls`): a `BlockType` value, output type, input type, and a `Blocks` / `BlockInput @oneof` field.
3. Go (`shared/util/portableText/block-objects/`): a `parse` function that validates the block, and its case in `ParseBlock`.
4. `make generate-models` in `shared/`, then `pnpm codegen` in `front-end/`.
5. A `defineBlock` file in `front-end/src/components/portable-text/blocks/` (meta, `fields`, a zod `schema` mirroring the Go checks, `View`, `Editor` if it differs, `examples`), added to `blocks`.
6. Colours from semantic tokens only (`bg-card`, `text-primary`…), so a persona theme on the wrapper restyles the block, and no outer margins: the wrapper spaces blocks.

Dev-mode requests are proxied, not direct: `/api`, `/query`, `/ws` go to `VITE_API_BASE_URL` / `VITE_WEBSOCKET_BASE_URL` (default `https://lxd-development-app`) with `secure: false` and `cookieDomainRewrite: "localhost"`.

## Figma

The design is "Flookaa v2", https://www.figma.com/design/cB5tjyC1Vpx9aMQsrX0kDY (file key `cB5tjyC1Vpx9aMQsrX0kDY`), in Sara's Figma team (`team::1694463309195621194`), not the user's own. Pages: Foundations `3:2` (specimen `4:2`), Components `3:3`, Patterns `3:4`, Blocks & Posts `32:6`, Channel & Community `3:5`, Feed & Discovery `3:6`, Profile & Personas `3:7`, Public & Onboarding `3:8`, RTL `3:9`. Every page, component, variable and text style id is in `plans/WWW-77-figma-handoff.md`; the rules are in `plans/WWW-77-redesign.md`. Each redesign ticket's Jira Design section links its frames.

- Figma MCP: `whoami` first; on a permission error stop and ask the user. `create_session` with the file key, then pass its `sessionId` on every call. Load the `figma-design-to-code` skill before `get_design_context` (node id from the URL, `17-2` → `17:2`); `get_variable_defs` for a frame's tokens, `get_screenshot` to compare.
- Output is a reference, not code: reuse `components/ui/`, map variables to tokens (`base/primary` → `bg-primary`, `radius/lg` → `rounded-lg`), never hard-code hex.
- Frames are `Desktop` (1440), `Tablet` (834), `Mobile` (390). `Theme` modes are the palettes (frames set the entity's, the sidebar keeps the viewer's = `data-theme`); `Breakpoint` holds type sizes, gutter and section gap.
- Implementation tickets never edit the file; design tickets (label `design`) do, with the `figma-use` skill, and record new ids in the handoff doc.

## Environment

`.env` files are gitignored; in production values come from Ansible vault vars. Go services read:

`DATABASE_DSN`, `MONGODB_DSN`, `NATS_CONNECTION`, `REDIS_ADDR`, `REDIS_PASSWORD`, `JWT_SECRET_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL_ADDRESS`, `SMTP_EMAIL_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GRPC_PORT`, `GRPC_WATCHING_DIR`.

`whatsapp` reads only its own vars: `WHATSAPP_API_TOKEN` (required, fatal if unset), `WHATSAPP_SESSION_DB`, `WHATSAPP_SEND_RATE`, `WHATSAPP_SEND_BURST`, `WHATSAPP_PORT`.

Rust proxy: `GO_APP_URL`. Frontend: `VITE_API_BASE_URL`, `VITE_WEBSOCKET_BASE_URL`, `VITE_HEART_REACT_VOICE_URL`.

## Conventions

- Older commits are prefixed with a ticket key (`WWW-0000 Fix linting issues`); recent ones use conventional-commit prefixes (`feat: ...`). Follow whatever the user asks for.
- Keep code comments minimal: no doc blocks restating the code, no rule tables or ticket narration in code. At most one short line where the *why* isn't obvious. Explanations go in the plan or this file.
- Never hand-edit generated output: `shared/pkg/db/`, `shared/pkg/graph/*.generated.go`, `shared/pkg/graph/models/models_gen.go`, `front-end/src/generated/graphql.ts`, `gRCP/*/app_service/`.
- A backend change touching the GraphQL schema requires regenerating on both sides: `make generate-models` in `shared/`, then `pnpm codegen` in `front-end/`. Deploy the backend before the frontend that queries the new fields.

## Tickets and releases

Work is tracked in Jira, project `WWW` on flookaa.atlassian.net (Kanban). Keys are `WWW-<n>`, never zero-padded. Older `WWW-000N` branches and plans are history.

**No plan, no work.** Never change code for a ticket until `plans/WWW-<n>-<slug>.md` exists for that ticket and the user has approved it. The plan is the first commit on the ticket branch. If a request has no ticket, ask which ticket it belongs to, or offer to create one, before starting.

- **One ticket = one small task = one small plan = one squash PR.** Types are Task, Bug, and Epic (to group the Tasks of a big feature).
- **Statuses**, in this order:
  - Backlog → Need Specs (plan being written) → READY TO START (plan approved) → In Progress → In Review (code review + QA by the user) → READY TO DEPLOY (merged into the release branch) → Done (release merged to `main` and live).
  - QA REVISION: QA failed; the ticket waits there until it's picked up and goes back to In Progress.
  - REJECTED: won't do; only the user rejects.
  - The workflow is strictly sequential.
- **Releases** are named `<Pokemon>-v1NNN`, with NNN the Pokémon's 3-digit National Pokédex number.
  - Multiples of 5 are planned releases (Charmeleon-v1005, Caterpie-v1010, …). The numbers in between are hotfixes, each with its own Pokémon.
  - Only one release is open at a time. A ticket gets the open release as its fix version when it enters READY TO START.
- **Branches:**
  - Never use `/` in a branch name.
  - The ticket branch `WWW-<n>-<slug>` is cut from `release-<pokemon>-v1NNN` and goes back into it by squash PR.
  - The release branch goes to `main` by merge commit (not squash). `main` is then tagged `<pokemon>-v1NNN`.
  - Deploy only from `main`.
  - A hotfix branches from `main`, gets its own release, and is merged back into the open release branch.
- **Who moves tickets:**
  - Claude moves a ticket up to In Review, stating every transition in its reply.
  - The user moves it to READY TO DEPLOY by merging the PR.
  - Claude moves the release's tickets to Done and releases the version only after the user confirms the release is merged and deployed.
  - Claude never commits, and never moves a ticket backwards or past a status without saying so.

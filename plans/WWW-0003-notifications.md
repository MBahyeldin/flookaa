# WWW-0003 — Notifications

Branch `WWW-0003`. Steps are applied one at a time; each step leaves the tree
buildable and is reviewed and committed by hand before the next one starts.

## Decisions

| Topic | Decision |
|---|---|
| Producer | A new `notifier/` Go service in its own LXD container, a durable JetStream consumer. Nothing is written in the request path. |
| Storage | Postgres `notifications` table, keyed by `recipient_id` → `personas(id)`. |
| Grouping | One row per *thing* (`UNIQUE (recipient_id, group_key)`). Counts and "latest actor" are **recounted** from `events` / `channel_members` at read time, never stored. |
| Scope | A persona sees only its own notifications; no cross-persona badges. |
| Retention | Keep everything for now. |
| Delivery | `STREAM_USER_EVENTS.PERSONA.<id>.notifications.<action>`, already in every persona's default subjects. Frames carry the notification id only; the browser refetches over REST. |
| API | REST under `/api/v1/notifications`, persona tier. |
| Out of v1 | Mentions, "new post in your channel", email/WhatsApp/push, preferences, retention jobs. |

## v1 notification kinds

| Kind | Triggered by | Recipient | `group_key` | Aggregated? |
|---|---|---|---|---|
| `post_comment` | `CONTENT … comment.create`, target type `POST` | post author | `post_comment:<post_id>` | yes: active comment events with `target_id = post` |
| `comment_reply` | `CONTENT … comment.create`, target type `COMMENT` | parent comment author | `comment_reply:<comment_id>` | yes: active comment events with `target_id = comment` |
| `post_like` | `CONTENT … like.create`, target type `POST` | post author | `post_like:<post_id>` | yes: active like events with `object_id = post` |
| `comment_like` | `CONTENT … like.create`, target type `COMMENT` | comment author | `comment_like:<comment_id>` | yes: active like events with `object_id = comment` |
| `join_request` | `CHANNEL … join_request.create` | channel owner and every channel moderator | `join_request:<channel_id>` | yes: pending rows in `channel_members` |
| `request_approved` | `CHANNEL … member.create`, reason `approved` | the approved persona | `request_approved:<channel_id>` | no (single actor = moderator) |
| `removed_from_channel` | `CHANNEL … member.delete`, reason `removed` | the removed persona | `removed:<channel_id>` | no (single actor = moderator) |

Rules applied to every kind:

- **Never notify yourself**: skip when `actor_id == recipient_id`.
- Aggregated counts and actors exclude the recipient's own events. For example, your own comment on your post doesn't count.
- A recount of zero means the notification is gone: the notifier soft-deletes the row (see step 3). A later event on the same thing revives it with the same `group_key`.

## Data model (migration 012)

```sql
CREATE TYPE notification_kind_enum AS ENUM (
  'post_comment', 'comment_reply', 'post_like', 'comment_like',
  'join_request', 'request_approved', 'removed_from_channel'
);

CREATE TABLE notifications (
  id             BIGSERIAL PRIMARY KEY,
  recipient_id   BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  kind           notification_kind_enum NOT NULL,
  group_key      varchar(255) NOT NULL,
  object_id      varchar(255) NULL,     -- post/comment the notification is about (content kinds)
  channel_id     BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  actor_id       BIGINT NULL REFERENCES personas(id) ON DELETE SET NULL, -- single-actor kinds only
  last_event_at  TIMESTAMPTZ NOT NULL,  -- timestamp of the newest event applied; guards replays
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at        TIMESTAMPTZ NULL,
  deleted_at     TIMESTAMPTZ NULL,
  UNIQUE (recipient_id, group_key)
);

CREATE INDEX idx_notifications_recipient_feed
  ON notifications (recipient_id, updated_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_id) WHERE deleted_at IS NULL AND read_at IS NULL;
CREATE INDEX idx_notifications_object
  ON notifications (object_id) WHERE deleted_at IS NULL;
```

Upserting a new event (idempotent, safe on replay):

```sql
INSERT INTO notifications (recipient_id, kind, group_key, object_id, channel_id, actor_id, last_event_at, updated_at)
VALUES (…, $event_ts, $event_ts)
ON CONFLICT (recipient_id, group_key) DO UPDATE
SET actor_id = EXCLUDED.actor_id, last_event_at = EXCLUDED.last_event_at,
    updated_at = EXCLUDED.updated_at, read_at = NULL, deleted_at = NULL
WHERE notifications.last_event_at < EXCLUDED.last_event_at;
```

The `WHERE` makes a replayed or out-of-order event a no-op. It can't mark a
read notification unread again or move it back up the list. `updated_at` is
the event time, not `NOW()`, so replays can't reorder the list either.

## Steps

### Step 1: Event enrichment (backend + shared)

The notifier must not need Mongo. The resolvers already load the parent/target through `loadObject`, so they know the author.

- `shared/external/db/nats/natsConn.go`: add `RecipientID *int64 \`json:"recipient_id,omitempty"\`` to `nats.Event`. `EventID int64` isn't needed: dedupe comes from `group_key` + `last_event_at`.
- `createComment`: set `RecipientID = parent.AuthorID`.
- `likeObject` (create and delete): set `RecipientID = target.AuthorID`.
- `deletePost` / `deleteComment`: no change. They already publish `object_id`.
- Channel events: no change. The payload already has `persona_id` and `reason`, and `actor_id` is who made the change.
- The frontend WS and the redis worker ignore the new field. No codegen is needed; this isn't a GraphQL schema change.

### Step 2: Schema + queries (shared)

- `shared/external/db/postgres/migrations/012_notifications.{up,down}.sql` as above. The down file drops the table and the enum.
- `shared/external/db/postgres/queries/notification.sql`:
  - `UpsertNotification` (above)
  - `SoftDeleteNotificationsByGroup(group_key, event_at)`: used whenever a recount reaches zero. For likes and comments the group has one recipient; for join requests it has every moderator
  - `SoftDeleteNotificationsByObject(object_id)`: the post/comment was deleted
  - `ListNotifications(recipient_id, cursor_updated_at, cursor_id, limit)`, with the access filter below
  - `CountUnreadNotifications(recipient_id)`, with the same access filter
  - `MarkNotificationsRead(recipient_id, ids[])`
  - `MarkAllNotificationsRead(recipient_id)`
  - `ListChannelModeratorIDs(channel_id)`: owner + channel moderators/Administrators. Global Administrators are left out.
  - Recount helpers that return `count` + `latest_actor_id` per group, batched with `ANY($1)` for a page:
    - `RecountCommenters`: comment events by `target_id`
    - `RecountLikers`: like events by `object_id`
    - `RecountPendingJoinRequests`: pending join requests by `channel_id`
    - all excluding the recipient as actor. A group missing from the result has a count of zero.
  - Both soft-delete queries take the event time and move `last_event_at` forward (`GREATEST`), so a redelivered older create can't revive the row.
- Run `make migrate-up` on a DB-backed sqlc target, then `make generate-models`. Never generate offline.

**Access filter** (used by list and count): hide a row when its channel is private and the recipient isn't an active member (`left_at IS NULL AND status = 'active'`). Exceptions are `request_approved`, `removed_from_channel` and `join_request`, which are about membership itself. A persona removed from a private channel keeps its old rows, but they don't show while it lacks access.

### Step 3: `notifier/` service

New module `notifier` (module name `notifier`), added to `go.work`. It follows the redis worker's layout:

```
notifier/
  main.go               # load config, connect Postgres + NATS, run, graceful stop
  internal/config/      # DATABASE_DSN, NATS_CONNECTION (envconfig, all-missing-in-one-error)
  internal/worker.go    # consumers, dispatch, ack/nak/term
  internal/content.go   # comment/like/delete handling
  internal/channel.go   # join_request/member handling
  deploy.bash           # linux/amd64 → gRPC@notifier:/home/gRPC/watched
  README.md
```

- Two durable pull consumers (one consumer can't span streams), both explicit-ack:
  - `notifier-content` on `STREAM_CONTENT_EVENTS.>`
  - `notifier-channel` on `STREAM_CHANNEL_EVENTS.>`
- Uses `CheckStream` only; the backend owns `EnsureStreams`.
- Unparseable message → `Term`. DB/NATS error → `NakWithDelay` (same backoff as the redis worker). Success → `Ack`.
- Ignore events the notifier doesn't use: `post.*`, `follower.*`, joins with reason `joined`, `left`, `cancelled`, `rejected`.
- **Create path**: resolve recipient(s), skip self, `UpsertNotification`, then publish `STREAM_USER_EVENTS.PERSONA.<rid>.notifications.create` with `{id}` via `shared/pkg/subject`. The publish only runs if the upsert changed a row (`RETURNING id`); a replayed event publishes nothing.
- **Remove path**: `like.delete`, `join_request.delete` (approved/rejected/cancelled), `post.delete` / `comment.delete`.
  - Likes and join requests: recount the group. If it's zero, soft-delete that recipient's row (or every recipient's row for `join_request`). Then publish `…notifications.delete` `{id}` so open badges update.
  - Post/comment deletes: `SoftDeleteNotificationsByObject(object_id)`. For `comment.delete` also recount the parent's `post_comment` / `comment_reply` group, because the deleted comment's event is now soft-deleted.
- Nothing is a running total: every decision is a recount from Postgres, so duplicates and reordering converge like the counters do.

### Step 4: Infrastructure (ansible)

Uses `whatsapp` / `redis` as templates.

- `vars/universe.yml`: `containers.notifier` (ip, grpc port)
- `inventory/notifier.inventory.yml`: `lxc_container: notifier`, `service_managed_by_gRPC: notifier`, `service_binary_name: notifier`, alloy monitor
- `notifier.playbook.yml`:
  - `init_container`
  - app user + SSH key
  - `grpc_server` role
  - systemd unit from `templates/notifier/app.service.j2` with `DATABASE_DSN` / `NATS_CONNECTION`
- `vars/notifier_vault.yml` (encrypted), plus its line in `pick-and-play.bash`
- Allow the new container's IP in Postgres `pg_hba` and anywhere NATS restricts clients. Check `postgres.playbook.yml` / `nats.playbook.yml` for per-container lists.
- Create the container on the LXD host the same way `whatsapp` was added (hosting-machine playbook / `universe.yml`).

### Step 5: REST API (backend)

`backend/internal/db/postgres/handlers/notifications/`, a new `Handler` with `*db.Queries`, wired in `backend/cmd/server/root.go`. It goes in its own group under `auth.RequirePersona()`; identity comes from `auth.PersonaID(c)`.

| Route | Returns |
|---|---|
| `GET /api/v1/notifications?cursor=&limit=` | page of `{id, kind, object_id, channel_id, count, latest_actor: {id, name, avatar}, read, updated_at}` + `next_cursor` |
| `GET /api/v1/notifications/unread-count` | `{count}` |
| `POST /api/v1/notifications/read` | body `{ids: []}` |
| `POST /api/v1/notifications/read-all` | — |

- For aggregated kinds, `count` and `latest_actor` come from the batched recount queries, one per kind present on the page. For single-actor kinds they come from `actor_id`.
- Persona display data comes from the existing persona lookup/cache.
- Rows whose recount returns zero between the notifier's cleanup and the read are dropped from the page. That's rare, and a notifier catch-up soft-deletes them.
- Marking read only touches rows owned by the caller (`recipient_id = persona`).

### Step 6: Frontend

- `src/types/notification.ts`, `src/services/notifications.ts` (via `apiFetch`)
- `src/stores/notifications.ts` (Zustand): unread count, loaded pages
- A bell with an unread badge in the dashboard header, and a dropdown or page listing notifications. Each item links to its post/comment/channel; opening one marks it read, and there's "Mark all read".
- WS listener on `…notifications.create` / `…notifications.delete`: refetch the unread count, and the first page if the list is open.
- Kinds the UI can't render yet aren't rendered. No disabled placeholders.
- `pnpm lint` + `pnpm build`. Remember `tsc-check` only fails on `.tsx` errors.

### Step 7: Docs

- `CLAUDE.md`: add `notifier/` to the layout table, `go.work` list, deploy commands and the environment section. Also add an "Architecture notes → Notifications" section covering grouping, recount-at-read, replay guard and access filter.
- Root `README.md` architecture overview.
- Fix the stale `-- Table: notifications` comment in migration 006. Only the comment changes, the migration SQL doesn't.

## Deploy order

1. Migration 012 (`make migrate-up` in prod).
2. Backend (step 1 + step 5): enriched events + API. Harmless without the notifier.
3. Container + notifier (steps 3–4). Its durable consumers start at the stream head, or should they start at `DeliverAll` to backfill the last 7 days? Decide at deploy. The recommendation is `DeliverAll` so the first deploy isn't empty, but it only has recipients for events published after step 1.
4. Frontend (step 6).

## Open questions (decide before the step that needs them)

- Step 3: should the notifier's consumers backfill (`DeliverAll`) or start new (`DeliverNew`) on first deploy?
- Step 6: dropdown only, or also a full `/notifications` page?

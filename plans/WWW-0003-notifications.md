# WWW-0003 — Notifications

Branch `WWW-0003`. Steps are applied one at a time; each step leaves the tree
buildable and is reviewed and committed by hand before the next one starts.

## Status

| Step | State |
|---|---|
| 1. Event enrichment | done |
| 2. Schema, queries, registry of kinds | done |
| 3. `notifier/` service | done |
| 4. Infrastructure (ansible) | done, not run yet |
| 5. REST API | done |
| 6. Frontend (+ `post_id` in `data`, channel names) | done: 6a + channel names committed; 6b written, not committed |
| 7. Docs | done |

## Decisions

| Topic | Decision |
|---|---|
| Producer | A new `notifier/` Go service in its own LXD container, a durable JetStream consumer. Nothing is written in the request path. |
| Storage | Postgres `notifications` table, keyed by `recipient_id` → `personas(id)`. |
| Recipients | **Personas only.** Account-level alerts ("new login", "password changed") are user-level and go through email or a separate channel later, never this table. |
| Generic, not channel-bound | A notification says **what it is about** (`subject_type` + `subject_id`) and, separately, **whose access rule decides whether the recipient may see it** (`scope_type` + `scope_id`, NULL = personal, always visible). Channels are one scope among future ones (persona walls, pages, groups). |
| Kind | A Postgres enum (`notification_kind_enum`), as are subject and scope types. A new kind is a migration (`ALTER TYPE … ADD VALUE`) plus regeneration. Per-kind *behaviour* (subject type, recount) lives in the registry of kinds in `shared/pkg/notifications`. |
| Grouping | One row per *thing* (`UNIQUE (recipient_id, group_key)`). Counts and "latest actor" are **recounted** from their source tables at read time, never stored. |
| Scope of the list | A persona sees only its own notifications; no cross-persona badges. |
| Retention | Keep everything for now. |
| Delivery | `STREAM_USER_EVENTS.PERSONA.<id>.notifications.<action>`, already in every persona's default subjects. Frames carry the notification id only; the browser refetches over REST. |
| First deploy | Consumers start at new events (`DeliverNew`); no backfill. |
| API | REST under `/api/v1/notifications`, persona tier. |
| Not notifications | **Direct messages** keep their own per-conversation unread state on the existing `direct_messages` subject. At most, later, one "unread messages" row per conversation. **Broadcast news** for everyone goes in a future `announcements` table with a per-persona "read up to" marker, not N rows. Targeted news (a subset of personas) fits this table as normal rows with `actor_id = NULL`. |
| Out of v1 | Mentions, "new post in your channel", email/WhatsApp/push, preferences, retention jobs. |

## v1 notification kinds

| Kind | Triggered by | Recipient | subject | scope | `group_key` | Aggregated / actor |
|---|---|---|---|---|---|---|
| `post_comment` | `CONTENT … comment.create`, target `POST` | post author | `POST:<post>` | `CHANNEL:<id>` | `post_comment:<post>` | yes: active comment events with `target_id = post` |
| `comment_reply` | `CONTENT … comment.create`, target `COMMENT` | parent comment author | `COMMENT:<comment>` | `CHANNEL:<id>` | `comment_reply:<comment>` | yes: active comment events with `target_id = comment` |
| `post_like` | `CONTENT … like.create`, target `POST` | post author | `POST:<post>` | `CHANNEL:<id>` | `post_like:<post>` | yes: active like events with `object_id = post` |
| `comment_like` | `CONTENT … like.create`, target `COMMENT` | comment author | `COMMENT:<comment>` | `CHANNEL:<id>` | `comment_like:<comment>` | yes: active like events with `object_id = comment` |
| `join_request` | `CHANNEL … join_request.create` | channel owner and every channel moderator | `CHANNEL:<id>` | — | `join_request:<id>` | yes: pending rows in `channel_members` |
| `request_approved` | `CHANNEL … member.create`, reason `approved` | the approved persona | `CHANNEL:<id>` | — | `request_approved:<id>` | no: `actor_id` = moderator |
| `removed_from_channel` | `CHANNEL … member.delete`, reason `removed` | the removed persona | `CHANNEL:<id>` | — | `removed_from_channel:<id>` | no: `actor_id` = moderator |

Membership kinds have no scope. They are about the recipient's own
relationship to the channel, so they show even when the recipient can't read
it (e.g. right after being removed from a private channel).

### How future kinds fit

These aren't built in WWW-0003. The rows show that the model holds them without schema changes beyond enum values.

| Kind | subject | scope | actor | Removed when |
|---|---|---|---|---|
| `follow_request` / `friend_request` | `PERSONA:<requester>` | — | recount of pending requests | none pending (same pattern as `join_request`) |
| `request_accepted` (friend/follow) | `PERSONA:<accepter>` | — | the accepter | never |
| targeted `news` | `NEWS:<id>` | — | NULL | never; `data` holds what the UI shows |
| a persona-wall like (when persona walls get access rules) | `POST:<post>` | `PERSONA:<wall owner>` | recount | recount = 0 |

Adding a kind:
1. A migration: `ALTER TYPE notification_kind_enum ADD VALUE '…'`, and subject/scope values if new. The new value can't be used in the same transaction, so keep it in its own migration.
2. `make generate-models`.
3. A spec in `shared/pkg/notifications.Kinds`. Services refuse to start without one.
4. A handler in the notifier for its source events.
5. A scope rule in the visibility filter if the scope type is new.
6. API/frontend rendering.

Rules applied to every kind:

- **Never notify yourself**: skip when `actor_id == recipient_id`.
- Aggregated counts and actors exclude the recipient's own activity. For example, your own comment on your post doesn't count.
- A recount of zero means the notification is gone: the notifier soft-deletes the row. A later event on the same thing revives it with the same `group_key`.

## Data model (migration 012)

```sql
CREATE TYPE notification_kind_enum AS ENUM (
  'post_comment', 'comment_reply', 'post_like', 'comment_like',
  'join_request', 'request_approved', 'removed_from_channel'
);
-- What a notification is about.
CREATE TYPE notification_subject_enum AS ENUM ('POST', 'COMMENT', 'CHANNEL', 'PERSONA');
-- Whose access rule decides visibility. Only channels have rules today.
CREATE TYPE notification_scope_enum AS ENUM ('CHANNEL');

CREATE TABLE notifications (
  id             BIGSERIAL PRIMARY KEY,
  recipient_id   BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  kind           notification_kind_enum NOT NULL,
  group_key      varchar(255) NOT NULL,
  subject_type   notification_subject_enum NOT NULL,
  subject_id     varchar(255) NOT NULL,   -- Mongo ObjectID hex or Postgres id as text
  scope_type     notification_scope_enum NULL,  -- NULL: personal, always visible
  scope_id       BIGINT NULL,
  actor_id       BIGINT NULL REFERENCES personas(id) ON DELETE SET NULL, -- single-actor kinds only; NULL for system
  data           JSONB NULL,               -- facts fixed for the notification's life (post_id, a news title); never names/counts/editable text
  last_event_at  TIMESTAMPTZ NOT NULL,     -- newest event applied; guards replays
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at        TIMESTAMPTZ NULL,
  deleted_at     TIMESTAMPTZ NULL,
  UNIQUE (recipient_id, group_key),
  CHECK ((scope_type IS NULL) = (scope_id IS NULL))
);

CREATE INDEX idx_notifications_recipient_feed
  ON notifications (recipient_id, updated_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_id) WHERE deleted_at IS NULL AND read_at IS NULL;
CREATE INDEX idx_notifications_group_active
  ON notifications (group_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_subject_active
  ON notifications (subject_type, subject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_scope_active
  ON notifications (scope_type, scope_id) WHERE deleted_at IS NULL AND scope_type IS NOT NULL;
```

There are no foreign keys to `channels` or other subject/scope tables: they're polymorphic. When a subject disappears (post, comment, channel deleted), the notifier soft-deletes by `(subject_type, subject_id)`, and for channels also by `(scope_type, scope_id)`. The read queries don't join subject tables.

Upserting a new event (idempotent, safe on replay):

```sql
INSERT INTO notifications (recipient_id, kind, group_key, subject_type, subject_id, scope_type, scope_id, actor_id, data, last_event_at, updated_at)
VALUES (…, $event_ts, $event_ts)
ON CONFLICT (recipient_id, group_key) DO UPDATE
SET actor_id = EXCLUDED.actor_id, data = EXCLUDED.data, last_event_at = EXCLUDED.last_event_at,
    updated_at = EXCLUDED.updated_at, read_at = NULL, deleted_at = NULL
WHERE notifications.last_event_at < EXCLUDED.last_event_at
RETURNING id;
```

The `WHERE` makes a replayed or out-of-order event a no-op. It can't mark a
read notification unread again or move it back up the list. `updated_at` is
the event time, not `NOW()`, so replays can't reorder the list either.

**Visibility filter** (used by list and count). There is one rule per scope type, and no join on subject tables:

```sql
AND (
  n.scope_type IS NULL
  OR (n.scope_type = 'CHANNEL' AND EXISTS (
        SELECT 1 FROM channels c
        WHERE c.id = n.scope_id AND c.deleted_at IS NULL
          AND (c.visibility = 'public' OR EXISTS (
                SELECT 1 FROM channel_members cm
                WHERE cm.channel_id = c.id AND cm.persona_id = n.recipient_id
                  AND cm.left_at IS NULL AND cm.status = 'active'))))
  -- later: OR (n.scope_type = 'PERSONA' AND <persona-wall rule>)
)
```

This mirrors `access.CanRead`. A persona removed from a private channel keeps its old content rows, but they don't show while it lacks access.

## Steps

### Step 1: Event enrichment (backend + shared)

The notifier must not need Mongo. The resolvers already load the parent/target through `loadObject`, so they know the author.

- `shared/external/db/nats/natsConn.go`: `nats.Event` gets `RecipientID *int64 \`json:"recipient_id,omitempty"\``.
- `createComment` sets it to the parent's author. `createLike` (create and delete) sets it to the target's author.
- Delete events already publish `object_id`, and channel events already carry `persona_id`, `reason` and `actor_id`. Neither changes.
- The frontend WS and the redis worker ignore the new field. No codegen: this isn't a GraphQL schema change.

### Step 2: Schema, queries, registry of kinds (shared)

- `shared/external/db/postgres/migrations/012_notifications.{up,down}.sql` and `schemas/notification.sql` as in the data model above. The down file drops the table and the three enums.
- `shared/external/db/postgres/queries/notification.sql`:
  - `UpsertNotification`: returns no row on a replay, so callers publish only real changes.
  - `SoftDeleteNotificationsByGroup(group_key, event_at)`: a recount reached zero.
  - `ListNotificationRecipientsByGroup(group_key)`: removal events don't name the recipient, so the notifier recounts for the recipients found here.
  - `SoftDeleteNotificationsBySubject(subject_type, subject_id, event_at)`: a post, comment, … was deleted.
  - `SoftDeleteNotificationsByScope(scope_type, scope_id, event_at)`: for a deleted channel. Its source event doesn't exist yet, so nothing calls it.
  - All three soft-deletes move `last_event_at` forward (`GREATEST`), so a redelivered older create can't revive the row.
  - `ListNotifications(recipient_id, cursor_updated_at, cursor_id, page_size)` and `CountUnreadNotifications(recipient_id)`, both with the visibility filter above.
  - `MarkNotificationsRead(recipient_id, ids[])` and `MarkAllNotificationsRead(recipient_id)`.
  - `ListChannelModeratorIDs(channel_id)`: owner + channel moderators/Administrators. Global Administrators are left out.
  - Recounts returning `count` + `latest_actor_id` per subject, batched with `ANY(…)`, excluding the recipient as actor, ordered by `created_at DESC, id DESC` so ties are stable. A subject missing from the result has a count of zero.
    - `RecountCommenters`: comment events by `target_id`
    - `RecountLikers`: like events by `object_id`
    - `RecountPendingJoinRequests`: pending members by `channel_id`
  - `ListNotificationKinds`: the enum's values (`enum_range`).
- **Registry of kinds** in `shared/pkg/notifications`, shared by the notifier (writes) and the API (reads) so they can't drift:
  - `Kinds map[db.NotificationKindEnum]Kind`, where `Kind{Subject, Recount}`.
  - `Subject` is the subject type every row of that kind has, so callers pass only `subject_id`.
  - `Recount` is batched by subject id. It's nil for single-actor kinds, which are never removed by a recount.
  - `GroupKey(kind, subjectID)` builds `"<kind>:<subject_id>"`.
  - `Lookup(kind)` returns a kind's spec.
  - `Check(ctx, q)` reads the real enum and fails if any kind has no spec. Every service that uses the registry calls it at startup.
- Generate with DB-backed sqlc against a throwaway local cluster (`initdb`, spare port, `make migrate-up`, `make generate-models`). Never generate offline. Verify that 012 goes down and back up cleanly.

### Step 3: `notifier/` service

New module `notifier`, added to `go.work`, with the same layout as the redis worker:

```
notifier/
  main.go               # config, Postgres + NATS, notifications.Check, run, stop on SIGINT/SIGTERM
  internal/config/      # DATABASE_DSN, NATS_CONNECTION (envconfig)
  internal/worker.go    # consumers, decode, ack / nak with backoff / term
  internal/notify.go    # notify (upsert + publish), removeIfEmpty, removeSubject, publish
  internal/content.go   # comment/like/delete handling
  internal/channel.go   # join_request/member handling
  deploy.bash           # linux/amd64 → gRPC@notifier:/home/gRPC/watched
  README.md
```

- **Consumers:** two durable pull consumers, `notifier-content` on `STREAM_CONTENT_EVENTS.>` and `notifier-channel` on `STREAM_CHANNEL_EVENTS.>`. One consumer can't span streams. Both use explicit ack and `DeliverNew`. The notifier only calls `CheckStream`; the backend owns `EnsureStreams`.
- **Errors:** an unparseable message is `Term`'d. A DB error is `NakWithDelay`'d with the redis worker's backoff.
- **Event time:** the event's `timestamp`, or the JetStream metadata timestamp if it's missing. It drives the replay guard.
- **Content handler:** only channel-owned content.
  - `comment.create` → `post_comment` / `comment_reply`, and `like.create` → `post_like` / `comment_like`. The subject is the target and the scope is `CHANNEL:<owner_id>`. The recipient is `recipient_id`; events without one (published before step 1) are skipped.
  - `like.delete` → `removeIfEmpty`.
  - `post.delete` / `comment.delete` → `removeSubject(POST|COMMENT, object_id)`. For a comment, it also calls `removeIfEmpty` on the parent's group, because the deleted comment's event is now soft-deleted.
- **Channel handler:** the subject is `CHANNEL:<id>` with no scope.
  - `join_request.create` → one row per moderator.
  - `join_request.delete` → `removeIfEmpty`.
  - `member.create` with reason `approved` → `request_approved`.
  - `member.delete` with reason `removed` → `removed_from_channel`.
  - Both single-actor kinds store the moderator as `actor_id`. Everything else is ignored.
- **Publishing:** `notify` skips self-notification and upserts. Only a changed row publishes `STREAM_USER_EVENTS.PERSONA.<rid>.notifications.create` with `{notification_id}`, built through `shared/pkg/subject`. Removals publish `…notifications.delete`. A failed publish is logged, not retried: the row is already stored.
- **Future sources:** a comment in `worker.go` says any future consumer of `STREAM_USER_EVENTS` must use specific `FilterSubjects`, so it never consumes the notifier's own `notifications.*` frames.

**Verify:** an end-to-end harness (scratchpad, not in the repo) against local Postgres + JetStream runs the real binary and checks:
- replays, unlikes, revival, self-activity, comment/post deletes and the join-request flow;
- stored subject/scope for content and membership rows;
- the visibility filter: a non-member of a private channel sees the unscoped `join_request` but not the scoped `post_like`, and sees both after joining;
- that the notifier refuses to start when the enum has a kind without a spec.

### Step 4: Infrastructure (ansible)

Uses `whatsapp` / `redis` as templates.

- `vars/universe.yml`: `containers.notifier` (ip, grpc port)
- `inventory/notifier.inventory.yml`: `lxc_container: notifier`, `service_managed_by_gRPC: notifier`, `service_binary_name: notifier`, alloy monitor
- `notifier.playbook.yml`:
  - `init_container`
  - app user + SSH key
  - `grpc_server` role
  - systemd unit from `templates/notifier/notifier.service.j2` with `DATABASE_DSN` / `NATS_CONNECTION`
- `vars/notifier_vault.yml` (encrypted), plus its line in `pick-and-play.bash`
- Container `notifier` at `10.0.0.130` (SSH `22130`, gRPC `50130`; 1 GB, 1 CPU, 5 GB disk), added to `lxd_containers` in `inventory/hosting-machine.inventory.yml`.
- No Postgres/NATS changes needed: `pg_hba` already allows `10.0.0.0/24`, and NATS listens on `0.0.0.0:4222` without auth.
- The service is stateless (rows in Postgres, consumer position in NATS), so unlike `whatsapp` there is no data directory outside `/opt/notifier/<version>`.

### Step 5: REST API (backend)

`backend/internal/db/postgres/handlers/notifications/` (`Handler{q, personas}`: `*db.Queries` + the Redis persona store), wired in `backend/cmd/server/root.go` and `api/v1/notifications.go`. It goes in its own group under `auth.RequirePersona()`; identity comes from `auth.PersonaID(c)`.

| Route | Returns |
|---|---|
| `GET /api/v1/notifications?cursor=&limit=` | `{notifications: [{id, kind, subject: {type, id}, scope: {type, id} \| null, count, latest_actor: {id, first_name, last_name, thumbnail} \| null, data?, read, updated_at}], next_cursor: string \| null}`. `limit` defaults to 20, max 50. |
| `GET /api/v1/notifications/unread-count` | `{count}` |
| `POST /api/v1/notifications/read` | body `{ids: [...]}`, 1–100 ids → `{updated}`. Other personas' ids are ignored. |
| `POST /api/v1/notifications/read-all` | `{updated}` |

- For aggregated kinds, `count` and `latest_actor` come from the batched recount queries, one per kind on the page. For single-actor kinds they come from `actor_id`, with `count = 1`. System kinds and deleted personas have `latest_actor = null`.
- `shared/pkg/notifications.Kinds` (step 2) decides which recount a kind uses. The backend calls `notifications.Check` at startup and refuses to start without a spec for every kind.
- Actors come from the Redis persona cache, falling back to `ResolvePersonaByID`, like GraphQL authors.
- The cursor is `"<updated_at unix µs>_<id>"`, taken from the last row **read**, not the last row shown.
- Rows whose recount is zero (the notifier hasn't removed them yet) are dropped from the page. **So a page can be shorter than `limit`, or empty, and still have a `next_cursor`: the frontend pages until `next_cursor` is null.** The unread count doesn't recount, so it can briefly include such a row.
- Marking read only touches rows owned by the caller (`recipient_id = persona`).
- Verified with a temporary test (deleted after the run) against a throwaway Postgres covering:
  - auth;
  - paging across dropped and hidden rows;
  - recounts excluding the recipient, and the latest actor;
  - unscoped vs private-channel scoped rows;
  - mark read (including another persona's id) and read-all;
  - bad input.

### Step 6: Frontend (+ `post_id` in the API)

Decisions (2026-09-29):

| Topic | Decision |
|---|---|
| Surface | Bell opens a **popover** with the latest ~10 and "See all" → a **`/notifications` page** with infinite scroll (also the mobile view). |
| Bell | **Top-right** next to the fixed theme toggle on desktop, and in the **mobile header** next to the sidebar trigger. Unread badge on both. |
| Click | Opens the **exact post**: `/channels/<channel>?post=<post_id>` (+ `&comment=<comment_id>` for comment kinds). Membership kinds go to `/channels/<channel>`. |
| Attention / read | **Badge only**, no toasts. A notification is read **when clicked**; "Mark all read" in the popover and page. |

**6a. Backend: `post_id` stored in `notifications.data`**
- `post_id` lives in the row's `data` (the user's call), not as a top-level API field. The API returns `data` as stored.
- `shared/pkg/notifications.Data{PostID}` is the one definition of the `data` shape. Every field is optional.
- The resolvers (`createComment`, `createLike`) find the thread's post with `threadPostID`, which walks `parentid` up `app.objects` from the parent/target they already load, capped at 32 levels. They send it as `nats.Event.post_id`. If the lookup fails, the error is logged and the event goes out without it; the comment or like is already stored.
- The notifier writes `data = {"post_id": …}` for the four content kinds, and never for membership kinds.
- The upsert keeps the stored data when a newer event has none: `data = COALESCE(EXCLUDED.data, notifications.data)`.
- Rows written before this deploy have no `post_id`; the UI links them to the channel. Deploy: backend + notifier.
- Verified with the notifier end-to-end harness (30 checks, including `data.post_id` stored, kept, and absent on membership rows). `threadPostID` wasn't run against Mongo: there was no local Mongo.

**6a+. Backend: channel names at read time**
- Notification text needs channel names. Names can be edited, so they can't go in `data`.
- The list response gets `channel: {id, name, thumbnail} | null`: the scope channel for content kinds, the subject channel for membership kinds. It's looked up with one batched `ListChannelSummaries` query per page, like `latest_actor`, and is null for a deleted channel.

**6b. Frontend**
- **Data:** `types/notification.ts` and `services/notifications.ts` (list, unread count, read, read-all via `apiFetch`).
- **Store:** `stores/NotificationStore.ts` (Zustand) holds:
  - `unreadCount`;
  - `recent`, the popover's list, null until first opened;
  - `version`, bumped on every realtime frame and on mark-all-read, so open lists reload;
  - optimistic `markRead` / `markAllRead`;
  - request counters so a stale response can't overwrite a newer one.
- **Realtime:** `ws/index.tsx` gets a stable default-subscription id and `subscribeToDefaultEvents(cb)`. `hooks/useNotificationsRealtime` is mounted in `DashboardLayout`, before the early returns. It loads the unread count and refreshes on `notifications.*` frames; it's keyed by persona and resets on unmount. Switching persona reloads the page, so the socket is always the current persona's.
- **Components** in `components/notifications/`:
  - `describe.ts`: text and link per kind, or null for unknown kinds, which aren't rendered. Content kinds link to `/channels/<scope>?post=<data.post_id>` (plus `&comment=<id>` for comment subjects), or just the channel when `post_id` is missing. Membership kinds link to `/channels/<id>`.
  - `NotificationItem`: avatar, text, relative time and an unread dot. Clicking marks it read and navigates.
  - `NotificationBell`: the popover with the latest 10, "Mark all read" (only rendered when there's something unread) and "See all".
- **Bell placement:** in the fixed top-right container next to `ToggleTheme`. On mobile that container sits over the right end of the sticky header, so one bell serves both and there's no second copy in the header.
- **`/notifications` page:** a "Load more" button (the channel feed's pattern, not scroll-triggered). It keeps fetching through empty pages, up to 5, until something renderable arrives or `next_cursor` is null. It reloads from the top when `version` changes.
- **Deep link:** `channels/[id]/PostDialog.tsx` reads `?post=`. Once the store is on the channel, it fetches the post with `GetPosts(ids: [post])`, adds it to the page store (so likes and comments stay live; it also appears in the feed), and opens it in a dialog with `Post initialShowComments`. A missing post shows "This post is no longer available". Closing the dialog removes `post` and `comment` from the URL. `?comment=` is carried but unused (out of v1).
- **Checked:** `pnpm lint` on the changed files is clean, `pnpm build` passes, and `tsc -b` shows no errors in the changed files (its existing `.ts` errors are elsewhere). Not clicked through in a browser: the dev server needs the LXD dev backend and a login.

### Step 7: Docs

- `CLAUDE.md`:
  - add `notifier/` to the layout table, `go.work` list, deploy commands and the environment section;
  - add an "Architecture notes → Notifications" section covering subject vs scope, grouping, recount-at-read, the replay guard, the visibility filter, and how to add a kind;
  - note that DMs and broadcasts are deliberately not notifications.
- Root `README.md` architecture overview.
- Fix the stale `-- Table: notifications` comment in migration 006. Only the comment changes, the migration SQL doesn't.

## Deploy order

1. Migration 012 (`make migrate-up` in prod).
2. Backend (step 1 + step 5): enriched events + API. Harmless without the notifier.
3. Container + notifier (steps 3 + 4). Starts at new events only.
4. Frontend (step 6).

## Open questions (decide before the step that needs them)

None.

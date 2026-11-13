# WWW-10 — Deleting a post removes every notification in its thread

When a post is deleted, notifications whose thread is that post stop showing: replies to its comments, likes on its comments, and anything deeper. Today only the notifications whose **subject** is the post go (`post_comment`, `post_like`), because `deleteObject` soft-deletes the post alone and its comments live on in Mongo.

## What's wrong today

- `deletePost` → `deleteObject` sets `deletedat` on the post and publishes `post.delete` with `{object_id}`.
- The notifier (`notifier/internal/content.go`) answers it with `removeSubject(POST, id)`. That removes `post_comment` and `post_like` rows. It never reaches `comment_reply` and `comment_like` rows, whose subject is a comment in the thread.
- The comments stay live (`deletedat` nil). `threadPostID` walks parents without looking at `deletedat`, so a reply or a like on one of them still works through the API and creates or revives a notification about a post nobody can open.

## Changes

### 1. Notifier: remove by thread

New query in `queries/notification.sql`:

```sql
-- name: SoftDeleteNotificationsByPost :many
UPDATE notifications
SET deleted_at = NOW(),
    last_event_at = GREATEST(last_event_at, sqlc.arg(event_at)::timestamptz)
WHERE data->>'post_id' = sqlc.arg(post_id)::text
  AND deleted_at IS NULL
RETURNING id, recipient_id;
```

On `post.delete` the notifier runs `removeSubject(POST, id)` (as now), then `removeThread(id)` with this query, publishing `notifications.delete` for each row like the other removals. Moving `last_event_at` forward keeps the replay guard working: a redelivered comment or like event can't revive the rows.

Rows written before `data.post_id` existed have no `post_id` and are left as they are, like their links today. No backfill.

### 2. Migration `045_notifications_post_id_index`

```sql
CREATE INDEX notifications_post_id_idx ON notifications ((data->>'post_id')) WHERE deleted_at IS NULL;
```

Down drops it. Without it, every post delete scans the table. Then `make generate-models` against a database with 045 applied.

### 3. Resolvers: no new activity in a deleted thread

`threadPostID` treats a deleted post or comment anywhere up the chain as not found (it already reads each parent; it also reads `deletedat`). `createComment` and `createLike` currently only log its error. They now look the thread up before anything is written and refuse with `errObjectNotFound` when it's gone (`createLike` only for a like, not an unlike). Unlikes still work, so a persona can take back a like (that removes it from the counts and any notification left over).

Without this, a reply to a comment of a deleted post would write a new `comment_reply` row with a newer `last_event_at` and bring the notification back.

## Out of scope

- Deleting a **comment** leaves notifications about its replies and their likes, the same pattern one level down. Not in this ticket. The thread query above won't cover it (those rows share the post's `post_id`). It would need a `comment_id` path in `data` or a walk over Mongo. Filed as WWW-197.
- Soft-deleting the comments themselves in Mongo when their post goes. Reads already never reach them (the post page 404s, the feed lists posts only), and step 3 stops new activity on them.
- `deleteObject` writes `TargetType`/`Owner` `CHANNEL` on a deleted wall post's event. The notifier only uses `object_id` for posts, so nothing breaks here. Noted, not fixed.

## Deploy

Migration 045, then the backend (step 3) and the notifier (step 1), in any order. Old notifier + new backend: no regression. New notifier + old backend: works the same.

## Checks

- `go build ./...` and `go vet` in `shared`, `backend`, `notifier`.
- On dev: persona A posts, B comments, C replies to B and likes B's comment (B gets `comment_reply` and `comment_like`; A gets `post_comment`). A deletes the post: all three disappear from the lists and the badges live. Replying to or liking B's comment through `/query` then answers not found.
- Redeliver the `post.delete` message (or replay the consumer): nothing changes, nothing is published.

-- -------------------------------
-- 1. Create or revive a notification for new activity
-- -------------------------------
-- Moves the row to the top and marks it unread. An event no newer than the
-- last one applied changes nothing and returns no row (sql.ErrNoRows), so
-- the caller publishes only real changes.
-- name: UpsertNotification :one
INSERT INTO notifications (
    recipient_id,
    kind,
    group_key,
    object_id,
    channel_id,
    actor_id,
    last_event_at,
    updated_at
)
VALUES (
    sqlc.arg(recipient_id)::bigint,
    sqlc.arg(kind)::notification_kind_enum,
    sqlc.arg(group_key)::varchar,
    sqlc.narg(object_id)::varchar,
    sqlc.arg(channel_id)::bigint,
    sqlc.narg(actor_id)::bigint,
    sqlc.arg(event_at)::timestamptz,
    sqlc.arg(event_at)::timestamptz
)
ON CONFLICT (recipient_id, group_key) DO UPDATE
SET actor_id = EXCLUDED.actor_id,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = EXCLUDED.updated_at,
    read_at = NULL,
    deleted_at = NULL
WHERE notifications.last_event_at < EXCLUDED.last_event_at
RETURNING id;

-- -------------------------------
-- 2. Remove a group whose recount reached zero
-- -------------------------------
-- last_event_at moves forward so a redelivered older create cannot revive it.
-- name: SoftDeleteNotificationsByGroup :many
UPDATE notifications
SET deleted_at = NOW(),
    last_event_at = GREATEST(last_event_at, sqlc.arg(event_at)::timestamptz)
WHERE group_key = sqlc.arg(group_key)::varchar
  AND deleted_at IS NULL
RETURNING id, recipient_id;

-- -------------------------------
-- 3. Remove everything about a deleted post or comment
-- -------------------------------
-- name: SoftDeleteNotificationsByObject :many
UPDATE notifications
SET deleted_at = NOW(),
    last_event_at = GREATEST(last_event_at, sqlc.arg(event_at)::timestamptz)
WHERE object_id = sqlc.arg(object_id)::varchar
  AND deleted_at IS NULL
RETURNING id, recipient_id;

-- -------------------------------
-- 4. A persona's notifications, newest first
-- -------------------------------
-- Keyset paged: pass the last row's (updated_at, id) as the cursor, or NULLs
-- for the first page. Content notifications of a private channel are hidden
-- while the persona is not an active member (same rule as access.CanRead);
-- membership kinds always show.
-- name: ListNotifications :many
SELECT n.*
FROM notifications n
JOIN channels c ON c.id = n.channel_id AND c.deleted_at IS NULL
WHERE n.recipient_id = sqlc.arg(recipient_id)::bigint
  AND n.deleted_at IS NULL
  AND (
      sqlc.narg(cursor_updated_at)::timestamptz IS NULL
      OR (n.updated_at, n.id) < (sqlc.narg(cursor_updated_at)::timestamptz, sqlc.narg(cursor_id)::bigint)
  )
  AND (
      n.kind IN ('join_request', 'request_approved', 'removed_from_channel')
      OR c.visibility = 'public'
      OR EXISTS (
          SELECT 1
          FROM channel_members cm
          WHERE cm.channel_id = n.channel_id
            AND cm.persona_id = n.recipient_id
            AND cm.left_at IS NULL AND cm.status = 'active'
      )
  )
ORDER BY n.updated_at DESC, n.id DESC
LIMIT sqlc.arg(page_size)::int;

-- -------------------------------
-- 5. Unread badge
-- -------------------------------
-- Same visibility filter as ListNotifications.
-- name: CountUnreadNotifications :one
SELECT COUNT(*)
FROM notifications n
JOIN channels c ON c.id = n.channel_id AND c.deleted_at IS NULL
WHERE n.recipient_id = sqlc.arg(recipient_id)::bigint
  AND n.deleted_at IS NULL
  AND n.read_at IS NULL
  AND (
      n.kind IN ('join_request', 'request_approved', 'removed_from_channel')
      OR c.visibility = 'public'
      OR EXISTS (
          SELECT 1
          FROM channel_members cm
          WHERE cm.channel_id = n.channel_id
            AND cm.persona_id = n.recipient_id
            AND cm.left_at IS NULL AND cm.status = 'active'
      )
  );

-- -------------------------------
-- 6. Mark some of a persona's notifications read
-- -------------------------------
-- name: MarkNotificationsRead :execrows
UPDATE notifications
SET read_at = NOW()
WHERE recipient_id = sqlc.arg(recipient_id)::bigint
  AND id = ANY(sqlc.arg(ids)::bigint[])
  AND read_at IS NULL;

-- -------------------------------
-- 7. Mark all of a persona's notifications read
-- -------------------------------
-- name: MarkAllNotificationsRead :execrows
UPDATE notifications
SET read_at = NOW()
WHERE recipient_id = sqlc.arg(recipient_id)::bigint
  AND deleted_at IS NULL
  AND read_at IS NULL;

-- -------------------------------
-- 8. Who handles a channel's join requests
-- -------------------------------
-- The owner and channel moderators/Administrators. Global Administrators are
-- left out, or they would be notified about every channel.
-- name: ListChannelModeratorIDs :many
SELECT c.owner_id AS persona_id
FROM channels c
WHERE c.id = sqlc.arg(channel_id)::bigint
  AND c.deleted_at IS NULL
UNION
SELECT cr.persona_id
FROM channel_roles cr
JOIN roles r ON r.id = cr.role_id
JOIN channels c ON c.id = cr.channel_id AND c.deleted_at IS NULL
WHERE cr.channel_id = sqlc.arg(channel_id)::bigint
  AND cr.deleted_at IS NULL
  AND r.name IN ('moderator', 'Administrator');

-- -------------------------------
-- 9. Recounts for aggregated kinds
-- -------------------------------
-- Each returns, per group, how many other personas acted and the latest of
-- them. The recipient's own activity is excluded. A group missing from the
-- result has a count of zero.

-- Commenters on posts or comments (post_comment, comment_reply).
-- name: RecountCommenters :many
SELECT
    target_id,
    COUNT(DISTINCT actor_id)::bigint AS count,
    (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1]::bigint AS latest_actor_id
FROM events
WHERE name = 'comment'
  AND target_id = ANY(sqlc.arg(target_ids)::varchar[])
  AND actor_id <> sqlc.arg(recipient_id)::bigint
  AND deleted_at IS NULL
GROUP BY target_id;

-- Likers of posts or comments (post_like, comment_like).
-- name: RecountLikers :many
SELECT
    object_id,
    COUNT(DISTINCT actor_id)::bigint AS count,
    (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1]::bigint AS latest_actor_id
FROM events
WHERE name = 'like'
  AND object_id = ANY(sqlc.arg(object_ids)::varchar[])
  AND actor_id <> sqlc.arg(recipient_id)::bigint
  AND deleted_at IS NULL
GROUP BY object_id;

-- Pending join requests on channels (join_request).
-- name: RecountPendingJoinRequests :many
SELECT
    channel_id,
    COUNT(*)::bigint AS count,
    (ARRAY_AGG(persona_id ORDER BY joined_at DESC, id DESC))[1]::bigint AS latest_actor_id
FROM channel_members
WHERE channel_id = ANY(sqlc.arg(channel_ids)::bigint[])
  AND persona_id <> sqlc.arg(recipient_id)::bigint
  AND left_at IS NULL
  AND status = 'pending'
GROUP BY channel_id;

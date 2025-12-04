-- -------------------------------
-- 1. Create a new Event
-- -------------------------------
-- name: CreateEvent :one
INSERT INTO events (
    name,
    action,
    target_id,
    target_type,
    owner,
    owner_id,
    actor_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- -------------------------------
-- 2.1 Get events comments and likes per post
-- -------------------------------
-- name: GetMetaFromEvents :many
SELECT
    name,
    target_id,
    COUNT(*) AS count
FROM events
WHERE name IN ('comment', 'like')
  AND target_id = $1
  AND deleted_at IS NULL
GROUP BY name, target_id;


-- -------------------------------
-- 3. Get user activities (events)
-- -------------------------------
-- name: GetUserActivities :many
SELECT
  actor_id,
  ARRAY(
    SELECT target_id
    FROM events e2
    WHERE e2.actor_id = e.actor_id AND e2.name = 'comment'
    ORDER BY e2.created_at DESC
    LIMIT 1000
  ) AS comment_targets,
  ARRAY(
    SELECT target_id
    FROM events e2
    WHERE e2.actor_id = e.actor_id AND e2.name = 'post'
    ORDER BY e2.created_at DESC
    LIMIT 1000
  ) AS post_targets,
  ARRAY(
    SELECT target_id
    FROM events e2
    WHERE e2.actor_id = e.actor_id AND e2.name = 'like'
    ORDER BY e2.created_at DESC
    LIMIT 1000
  ) AS like_targets
FROM events e
WHERE e.actor_id = $1
GROUP BY actor_id;

--------------------------------
-- 5. is user liked a target
--------------------------------
-- name: IsUserLikedTarget :one
SELECT
    COUNT(*) > 0 AS liked
FROM events
WHERE name = 'like'
  AND target_id = $1
  AND actor_id = $2
  AND deleted_at IS NULL;

--------------------------------
-- 6. Unlike (soft delete) a like event
--------------------------------
-- name: UnlikeEvent :exec
UPDATE events
SET deleted_at = NOW(), updated_at = NOW()
WHERE name = 'like'
  AND target_id = $1
  AND actor_id = $2
  AND deleted_at IS NULL;
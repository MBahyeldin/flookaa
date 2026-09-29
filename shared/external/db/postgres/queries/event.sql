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
-- 3. Which of the given targets a persona currently likes
-- -------------------------------
-- name: GetLikedTargets :many
SELECT DISTINCT target_id
FROM events
WHERE actor_id = sqlc.arg(actor_id)::bigint
  AND name = 'like'
  AND deleted_at IS NULL
  AND target_id = ANY(sqlc.arg(target_ids)::varchar[]);

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
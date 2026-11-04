-- name: SavePost :execrows
INSERT INTO saved_posts (persona_id, post_id)
VALUES (sqlc.arg(persona_id)::bigint, sqlc.arg(post_id)::varchar)
ON CONFLICT (persona_id, post_id) DO UPDATE
SET saved_at = now(), unsaved_at = NULL
WHERE saved_posts.unsaved_at IS NOT NULL;

-- name: UnsavePost :execrows
UPDATE saved_posts
SET unsaved_at = now()
WHERE persona_id = sqlc.arg(persona_id)::bigint
  AND post_id = sqlc.arg(post_id)::varchar
  AND unsaved_at IS NULL;

-- name: GetSavedTargets :many
SELECT post_id
FROM saved_posts
WHERE persona_id = sqlc.arg(persona_id)::bigint
  AND unsaved_at IS NULL
  AND post_id = ANY(sqlc.arg(post_ids)::varchar[]);

-- name: ListSavedPosts :many
SELECT post_id, saved_at
FROM saved_posts
WHERE persona_id = sqlc.arg(persona_id)::bigint
  AND unsaved_at IS NULL
  AND (
      sqlc.narg(cursor_saved_at)::timestamptz IS NULL
      OR (saved_at, post_id) < (sqlc.narg(cursor_saved_at)::timestamptz, sqlc.narg(cursor_post_id)::varchar)
  )
ORDER BY saved_at DESC, post_id DESC
LIMIT sqlc.arg(row_limit)::int;

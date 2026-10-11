-- ------------------------------
-- 1.GetDefaultPersonaByUserId
-- ------------------------------
-- name: GetDefaultPersonaByUserId :one
SELECT *
FROM personas
WHERE user_id = $1 AND is_default = TRUE
LIMIT 1;


-- ------------------------------
-- 2. GetUserPersonasByUserId
-- ------------------------------
-- name: GetUserPersonasByUserId :many
SELECT *
FROM personas
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC;

-- ------------------------------
-- 3. CreatePersona
-- ------------------------------
-- name: CreatePersona :one
INSERT INTO personas (user_id, name, description, first_name, last_name, thumbnail, Bio, slug, is_default, privacy, show_on_profile, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10, NOW(), NOW())
RETURNING *;

-- ------------------------------
-- 4. GetPersonaByIdAndUserId
-- ------------------------------
-- name: GetPersonaByIdAndUserId :one
SELECT *
FROM personas
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;


-- -------------------------------
-- 7. Get Persona Basic Info
-- -------------------------------
-- name: GetPersonaBasicInfo :one
SELECT u.id, u.name, u.slug, u.first_name, u.last_name, u.thumbnail, u.created_at, u.updated_at, u.privacy,
      (SELECT COALESCE(json_agg(json_build_object(
               'id', c.id,
               'name', c.name,
               'description', c.description,
               'created_at', c.created_at
           )), '[]'::json)
           FROM channel_members cm
           JOIN channels c ON c.id = cm.channel_id
           WHERE cm.persona_id = u.id AND cm.left_at IS NULL AND cm.status = 'active'
       ) AS joined_channels,
        (SELECT COALESCE(json_agg(json_build_object(
               'id', c.id,
               'name', c.name,
               'description', c.description,
               'created_at', c.created_at
           )), '[]'::json)
           FROM channel_followers cm
           JOIN channels c ON c.id = cm.channel_id
           WHERE cm.persona_id = u.id AND cm.unfollowed_at IS NULL
       ) AS followed_channels
FROM personas u
WHERE u.id = $1
  AND u.deleted_at IS NULL;


-- -------------------------------
-- 8. Get persona stats
-- -------------------------------
-- name: GetPersonaStats :one
SELECT u.id,
       (SELECT COUNT(*) FROM channel_members cm WHERE cm.persona_id = u.id AND cm.left_at IS NULL AND cm.status = 'active') AS channels_joined,
       (SELECT COUNT(*) FROM channel_followers cf WHERE cf.persona_id = u.id AND cf.unfollowed_at IS NULL) AS channels_followed,
       (SELECT COUNT(*) FROM post_references pr WHERE pr.owner_type = 'PERSONA' AND pr.owner_id = u.id) AS posts_count
FROM personas u
WHERE u.id = $1
  AND u.deleted_at IS NULL;

-- -------------------------------
-- 9. Get channels a persona has joined
-- -------------------------------
-- name: GetPersonaJoinedChannels :many
SELECT c.*
FROM channel_members cm
JOIN channels c ON cm.channel_id = c.id
WHERE cm.persona_id = $1
  AND cm.left_at IS NULL AND cm.status = 'active';

-- -------------------------------
-- 10. Get channels a persona follows
-- -------------------------------
-- name: GetPersonaFollowedChannels :many
SELECT c.*
FROM channel_followers cf
JOIN channels c ON cf.channel_id = c.id
WHERE cf.persona_id = $1
  AND cf.unfollowed_at IS NULL;


-- -------------------------------
-- 12. Resolve Persona By ID
-- -------------------------------
-- name: ResolvePersonaByID :one
SELECT id, first_name, last_name, thumbnail, bio, slug, privacy 
FROM personas 
WHERE id = $1 
AND deleted_at IS NULL LIMIT 1;

-- -------------------------------
-- 13. UpdatePersonaByIdAndUserId
-- -------------------------------
-- name: UpdatePersonaByIdAndUserId :one
UPDATE personas
SET name = COALESCE($3, name),
    description = COALESCE($4, description),
    first_name = COALESCE($5, first_name),
    last_name = COALESCE($6, last_name),
    thumbnail = COALESCE($7, thumbnail),
    bio = COALESCE($8, bio),
    slug = COALESCE($9, slug),
    privacy = COALESCE($10, privacy),
    show_on_profile = $11,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
RETURNING *;

-- -------------------------------
-- 14. Resolve personas for a viewer
-- -------------------------------
-- name: ResolvePersonasForViewer :many
SELECT
    t.id,
    t.first_name,
    t.last_name,
    t.thumbnail,
    t.bio,
    t.slug,
    t.privacy,
    (
        t.privacy = 'public'
        OR t.user_id = (SELECT v.user_id FROM personas v WHERE v.id = sqlc.arg(viewer_id)::bigint)
        OR (t.privacy = 'private' AND EXISTS (
            SELECT 1
            FROM persona_followers pf
            WHERE pf.persona_id = t.id
              AND pf.follower_persona_id = sqlc.arg(viewer_id)::bigint
              AND pf.status = 'active'
              AND pf.unfollowed_at IS NULL
        ))
    )::boolean AS visible
FROM personas t
WHERE t.id = ANY(sqlc.arg(ids)::bigint[])
  AND t.deleted_at IS NULL;

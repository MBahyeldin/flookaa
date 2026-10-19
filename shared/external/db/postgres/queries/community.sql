-- name: CreateCommunity :one
INSERT INTO communities (name, slug, description, thumbnail, banner, visibility, owner_id)
VALUES (
    sqlc.arg(name), sqlc.arg(slug), sqlc.arg(description), sqlc.arg(thumbnail),
    sqlc.arg(banner), sqlc.arg(visibility), sqlc.arg(owner_id)
)
RETURNING *;

-- name: UpdateCommunity :one
UPDATE communities
SET name = COALESCE(sqlc.narg(name), name),
    slug = COALESCE(sqlc.narg(slug), slug),
    description = COALESCE(sqlc.narg(description), description),
    thumbnail = COALESCE(sqlc.narg(thumbnail), thumbnail),
    banner = COALESCE(sqlc.narg(banner), banner),
    visibility = COALESCE(sqlc.narg(visibility)::community_visibility_enum, visibility),
    updated_at = now()
WHERE id = sqlc.arg(id) AND deleted_at IS NULL
RETURNING *;

-- name: GetCommunityByID :one
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
WHERE c.id = sqlc.arg(id) AND c.deleted_at IS NULL;

-- name: GetCommunityBySlug :one
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
WHERE c.slug = sqlc.arg(slug) AND c.deleted_at IS NULL;

-- A missing row (sql.ErrNoRows) means the community does not exist or is deleted.
-- can_manage: the owner or a global Administrator.
-- name: GetCommunityAccess :one
SELECT
    c.id,
    c.visibility,
    (c.owner_id = sqlc.arg(persona_id)::bigint) AS is_owner,
    (
        c.owner_id = sqlc.arg(persona_id)::bigint
        OR EXISTS (
            SELECT 1
            FROM personas p
            JOIN user_roles ur ON ur.user_id = p.user_id AND ur.deleted_at IS NULL
            JOIN roles r ON r.id = ur.role_id
            WHERE p.id = sqlc.arg(persona_id)::bigint
              AND r.name = 'Administrator'
        )
    )::boolean AS can_manage
FROM communities c
WHERE c.id = sqlc.arg(community_id)::bigint AND c.deleted_at IS NULL;

-- name: ListCommunities :many
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
WHERE c.deleted_at IS NULL
  AND (sqlc.narg(interest_slug)::text IS NULL OR EXISTS (
      SELECT 1
      FROM community_interests ci
      JOIN interests i ON i.id = ci.interest_id
      WHERE ci.community_id = c.id AND i.slug = sqlc.narg(interest_slug)::text
  ))
ORDER BY c.created_at DESC, c.id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: ListCommunityInterests :many
SELECT ci.community_id, i.id, i.name, i.slug, i.emoji
FROM community_interests ci
JOIN interests i ON i.id = ci.interest_id
WHERE ci.community_id = ANY(sqlc.arg(community_ids)::bigint[])
ORDER BY ci.community_id, ci.created_at, i.id;

-- An id is allowed if it's active or the community already has it.
-- name: CountAllowedCommunityInterests :one
SELECT COUNT(*)::int AS allowed
FROM interests i
WHERE i.id = ANY(sqlc.arg(ids)::bigint[])
  AND (i.retired_at IS NULL OR EXISTS (
      SELECT 1 FROM community_interests ci
      WHERE ci.community_id = sqlc.arg(community_id) AND ci.interest_id = i.id
  ));

-- name: ReplaceCommunityInterests :exec
WITH removed AS (
    DELETE FROM community_interests
    WHERE community_id = sqlc.arg(community_id)
      AND NOT (interest_id = ANY(sqlc.arg(ids)::bigint[]))
)
INSERT INTO community_interests (community_id, interest_id)
SELECT sqlc.arg(community_id), unnest(sqlc.arg(ids)::bigint[])
ON CONFLICT DO NOTHING;

-- name: AddChannelToCommunity :exec
INSERT INTO community_channels (community_id, channel_id)
VALUES (sqlc.arg(community_id), sqlc.arg(channel_id));

-- name: ListChannelCommunities :many
SELECT cc.channel_id, c.id, c.name, c.slug
FROM community_channels cc
JOIN communities c ON c.id = cc.community_id
WHERE cc.channel_id = ANY(sqlc.arg(channel_ids)::bigint[])
  AND c.deleted_at IS NULL;

-- name: GetCommunityChannelIDByName :one
SELECT ch.id
FROM community_channels cc
JOIN channels ch ON ch.id = cc.channel_id
WHERE cc.community_id = sqlc.arg(community_id)
  AND ch.name = sqlc.arg(name)
  AND ch.deleted_at IS NULL
LIMIT 1;

-- Seeder: interest ids by slug, in the order given.
-- name: GetInterestIDsBySlugs :many
SELECT i.id
FROM unnest(sqlc.arg(slugs)::text[]) WITH ORDINALITY AS s(slug, ord)
JOIN interests i ON i.slug = s.slug
ORDER BY s.ord;

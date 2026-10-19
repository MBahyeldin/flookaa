-- The owner is the first active member.
-- name: CreateCommunity :one
WITH created AS (
    INSERT INTO communities (name, slug, description, thumbnail, banner, visibility, owner_id)
    VALUES (
        sqlc.arg(name), sqlc.arg(slug), sqlc.arg(description), sqlc.arg(thumbnail),
        sqlc.arg(banner), sqlc.arg(visibility), sqlc.arg(owner_id)
    )
    RETURNING id, owner_id
), owner_member AS (
    INSERT INTO community_members (community_id, persona_id, status, resolved_at)
    SELECT id, owner_id, 'active', now() FROM created
)
SELECT id FROM created;

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
-- membership_status is the live row's raw status (NULL when none); can_manage: the owner or a global Administrator.
-- name: GetCommunityAccess :one
SELECT
    c.id,
    c.visibility,
    c.owner_id,
    (c.owner_id = sqlc.arg(persona_id)::bigint) AS is_owner,
    m.status AS membership_status,
    (f.persona_id IS NOT NULL)::boolean AS is_following,
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
LEFT JOIN community_members m
    ON m.community_id = c.id AND m.persona_id = sqlc.arg(persona_id)::bigint AND m.left_at IS NULL
LEFT JOIN community_followers f
    ON f.community_id = c.id AND f.persona_id = sqlc.arg(persona_id)::bigint AND f.unfollowed_at IS NULL
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

-- Counts of live members and follows (deleted personas left out), and the
-- viewer's own membership and follow.
-- name: ListCommunityStats :many
SELECT
    c.id,
    (SELECT COUNT(*) FROM community_members cm JOIN personas p ON p.id = cm.persona_id
     WHERE cm.community_id = c.id AND cm.status = 'active' AND cm.left_at IS NULL
       AND p.deleted_at IS NULL)::int AS members_count,
    (SELECT COUNT(*) FROM community_followers cf JOIN personas p ON p.id = cf.persona_id
     WHERE cf.community_id = c.id AND cf.unfollowed_at IS NULL
       AND p.deleted_at IS NULL)::int AS followers_count,
    vm.status AS viewer_status,
    (vf.persona_id IS NOT NULL)::boolean AS viewer_following
FROM communities c
LEFT JOIN community_members vm
    ON vm.community_id = c.id AND vm.persona_id = sqlc.arg(viewer_id)::bigint AND vm.left_at IS NULL
LEFT JOIN community_followers vf
    ON vf.community_id = c.id AND vf.persona_id = sqlc.arg(viewer_id)::bigint AND vf.unfollowed_at IS NULL
WHERE c.id = ANY(sqlc.arg(community_ids)::bigint[]);

-- Revives a left row or a rejection. A rejection inside its 7-day cooldown
-- (cancelled or not) only comes back as it was, so it still reads as pending.
-- No row: an active or pending live row, left alone.
-- name: JoinCommunity :one
INSERT INTO community_members (community_id, persona_id, status, resolved_at)
VALUES (
    sqlc.arg(community_id), sqlc.arg(persona_id), sqlc.arg(status)::community_membership_status_enum,
    CASE WHEN sqlc.arg(status)::community_membership_status_enum = 'active' THEN now() END
)
ON CONFLICT (community_id, persona_id) DO UPDATE
SET status = CASE WHEN community_members.status = 'rejected' AND community_members.resolved_at >= now() - interval '7 days'
                  THEN community_members.status ELSE EXCLUDED.status END,
    joined_at = CASE WHEN community_members.status = 'rejected' AND community_members.resolved_at >= now() - interval '7 days'
                     THEN community_members.joined_at ELSE now() END,
    resolved_at = CASE WHEN community_members.status = 'rejected' AND community_members.resolved_at >= now() - interval '7 days'
                       THEN community_members.resolved_at ELSE EXCLUDED.resolved_at END,
    left_at = NULL
WHERE community_members.left_at IS NOT NULL OR community_members.status = 'rejected'
RETURNING status;

-- Ends a membership or cancels a request; a cancelled rejection keeps its cooldown.
-- name: LeaveCommunity :execrows
UPDATE community_members
SET left_at = now()
WHERE community_id = sqlc.arg(community_id) AND persona_id = sqlc.arg(persona_id)
  AND left_at IS NULL;

-- name: RemoveCommunityMember :execrows
UPDATE community_members
SET left_at = now()
WHERE community_id = sqlc.arg(community_id) AND persona_id = sqlc.arg(persona_id)
  AND left_at IS NULL AND status = 'active';

-- name: FollowCommunity :execrows
INSERT INTO community_followers (community_id, persona_id)
VALUES (sqlc.arg(community_id), sqlc.arg(persona_id))
ON CONFLICT (community_id, persona_id) DO UPDATE
SET followed_at = now(), unfollowed_at = NULL
WHERE community_followers.unfollowed_at IS NOT NULL;

-- name: UnfollowCommunity :execrows
UPDATE community_followers
SET unfollowed_at = now()
WHERE community_id = sqlc.arg(community_id) AND persona_id = sqlc.arg(persona_id)
  AND unfollowed_at IS NULL;

-- A community going private loses its followers.
-- name: EndCommunityFollows :many
UPDATE community_followers
SET unfollowed_at = now()
WHERE community_id = sqlc.arg(community_id) AND unfollowed_at IS NULL
RETURNING persona_id;

-- A community going public admits everyone waiting.
-- name: ApproveAllCommunityJoinRequests :many
UPDATE community_members
SET status = 'active', resolved_at = now()
WHERE community_id = sqlc.arg(community_id) AND left_at IS NULL AND status = 'pending'
RETURNING persona_id;

-- name: ListCommunityJoinRequests :many
SELECT
    cm.persona_id,
    cm.joined_at AS requested_at,
    p.first_name,
    p.last_name,
    p.thumbnail,
    p.privacy
FROM community_members cm
JOIN personas p ON p.id = cm.persona_id
WHERE cm.community_id = sqlc.arg(community_id)
  AND cm.left_at IS NULL AND cm.status = 'pending'
  AND p.deleted_at IS NULL
ORDER BY cm.joined_at, cm.persona_id;

-- name: ResolveCommunityJoinRequest :execrows
UPDATE community_members
SET status = sqlc.arg(status)::community_membership_status_enum, resolved_at = now()
WHERE community_id = sqlc.arg(community_id) AND persona_id = sqlc.arg(persona_id)
  AND left_at IS NULL AND status = 'pending';

-- name: ListCommunityMembers :many
SELECT
    cm.persona_id,
    cm.joined_at,
    p.first_name,
    p.last_name,
    p.thumbnail,
    p.privacy,
    (c.owner_id = cm.persona_id)::boolean AS is_owner
FROM community_members cm
JOIN communities c ON c.id = cm.community_id
JOIN personas p ON p.id = cm.persona_id
WHERE cm.community_id = sqlc.arg(community_id)
  AND cm.left_at IS NULL AND cm.status = 'active'
  AND p.deleted_at IS NULL
ORDER BY (c.owner_id = cm.persona_id) DESC, cm.joined_at, cm.persona_id
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- -------------------------------
-- 1. Create a channel
-- -------------------------------
-- name: CreateChannel :one
INSERT INTO channels (name, description,  owner_id, thumbnail, banner, visibility, min_age, theme, cover_pattern, created_at)
VALUES ($1, $2, $3, $4, $5, $6, sqlc.arg(min_age)::smallint, sqlc.narg(theme)::theme_enum, sqlc.arg(cover_pattern), NOW())
RETURNING *;

-- -------------------------------
-- 2. Update channel
-- -------------------------------
-- name: UpdateChannel :one
-- clear_theme wins over theme: the channel goes back to its community's.
UPDATE channels
SET theme = CASE WHEN sqlc.arg(clear_theme)::bool THEN NULL
                 ELSE COALESCE(sqlc.narg(theme)::theme_enum, theme) END,
    cover_pattern = COALESCE(sqlc.narg(cover_pattern)::cover_pattern_enum, cover_pattern),
    thumbnail = COALESCE(sqlc.narg(thumbnail), thumbnail),
    updated_at = NOW()
WHERE id = sqlc.arg(id) AND deleted_at IS NULL
RETURNING *, channel_theme(theme, id)::theme_enum AS effective_theme;

-- name: SetChannelMinAge :exec
UPDATE channels
SET min_age = sqlc.arg(min_age)::smallint,
    updated_at = NOW()
WHERE id = sqlc.arg(id) AND deleted_at IS NULL;

-- name: PersonaMeetsMinAge :one
SELECT persona_meets_min_age(sqlc.arg(persona_id)::bigint, sqlc.arg(min_age)::smallint)::boolean;

-- -------------------------------
-- 3. Remove a channel (soft delete)
-- -------------------------------
-- name: RemoveChannel :one
UPDATE channels
SET deleted_at = NOW()
WHERE id = $1
RETURNING *;

-- -------------------------------
-- 4. List all channels
-- -------------------------------
-- name: ListChannels :many
SELECT *
FROM channels
WHERE deleted_at IS NULL
ORDER BY name
LIMIT $1 OFFSET $2;

-- -------------------------------
-- 5. Get channels a user is a member of
-- -------------------------------
-- name: GetChannelsForUser :many
SELECT c.*
FROM channel_members cm
JOIN channels c ON cm.channel_id = c.id
WHERE cm.persona_id = $1
  AND cm.left_at IS NULL AND cm.status = 'active';

-- -------------------------------
-- 6. Get channels a user follows
-- -------------------------------
-- name: GetFollowedChannelsForUser :many
SELECT c.*
FROM channel_followers cf
JOIN channels c ON cf.channel_id = c.id
WHERE cf.persona_id = $1
  AND cf.unfollowed_at IS NULL;

-- -------------------------------
-- 7. Add user to channel
-- -------------------------------
-- name: AddUserToChannel :one
INSERT INTO channel_members (channel_id, persona_id, status)
VALUES ($1, $2, $3)
RETURNING *;

-- -------------------------------
-- 8. Remove user from channel (leave)
-- -------------------------------
-- name: RemoveUserFromChannel :one
UPDATE channel_members
SET left_at = NOW()
WHERE channel_id = $1 AND persona_id = $2 AND left_at IS NULL
RETURNING *;

-- -------------------------------
-- 9. Follow a channel
-- -------------------------------
-- Inserts only when there is no active follow, so following twice is a
-- no-op (0 rows) rather than a second row.
-- name: FollowChannel :execrows
INSERT INTO channel_followers (channel_id, persona_id)
SELECT sqlc.arg(channel_id)::bigint, sqlc.arg(persona_id)::bigint
WHERE NOT EXISTS (
    SELECT 1
    FROM channel_followers cf
    WHERE cf.channel_id = sqlc.arg(channel_id)::bigint
      AND cf.persona_id = sqlc.arg(persona_id)::bigint
      AND cf.unfollowed_at IS NULL
);

-- -------------------------------
-- 10. Unfollow a channel
-- -------------------------------
-- Ends the current follow only; earlier follows keep their unfollowed_at.
-- 0 rows means the persona wasn't following.
-- name: UnfollowChannel :execrows
UPDATE channel_followers
SET unfollowed_at = NOW()
WHERE channel_id = $1 AND persona_id = $2 AND unfollowed_at IS NULL;

-- -------------------------------
-- 9. Get All Channels
-- -------------------------------
-- name: GetAllChannels :many
SELECT 
    sqlc.embed(c),
    channel_theme(c.theme, c.id)::theme_enum AS effective_theme,
    (c.owner_id = $1) AS is_owner,
    EXISTS (
        SELECT 1 
        FROM channel_members cm 
        WHERE cm.channel_id = c.id 
          AND cm.persona_id = $1 
          AND cm.left_at IS NULL AND cm.status = 'active'
    ) AS is_member,
    EXISTS (
        SELECT 1 
        FROM channel_members cm 
        WHERE cm.channel_id = c.id 
          AND cm.persona_id = $1 
          AND cm.left_at IS NULL AND cm.status = 'pending'
    ) AS is_pending,
    EXISTS (
        SELECT 1 
        FROM channel_followers cf 
        WHERE cf.channel_id = c.id 
          AND cf.persona_id = $1 
          AND cf.unfollowed_at IS NULL
    ) AS is_follower,
    (
        SELECT COUNT(*)
        FROM channel_members cm
        WHERE cm.channel_id = c.id
          AND cm.left_at IS NULL AND cm.status = 'active'
    )::int AS members_count,
    -- DISTINCT: older rows may hold repeated follows by one persona.
    (
        SELECT COUNT(DISTINCT cf.persona_id)
        FROM channel_followers cf
        WHERE cf.channel_id = c.id
          AND cf.unfollowed_at IS NULL
    )::int AS followers_count
FROM channels c
WHERE c.deleted_at IS NULL
  AND persona_meets_min_age($1, c.min_age)
  AND (sqlc.narg(interest_slug)::text IS NULL OR EXISTS (
      SELECT 1
      FROM channel_interests ci
      JOIN interests i ON i.id = ci.interest_id
      WHERE ci.channel_id = c.id AND i.slug = sqlc.narg(interest_slug)::text
  ))
  AND (sqlc.narg(community_id)::bigint IS NULL OR EXISTS (
      SELECT 1 FROM community_channels cc
      WHERE cc.channel_id = c.id AND cc.community_id = sqlc.narg(community_id)::bigint
        AND cc.status = 'active' AND cc.removed_at IS NULL
  ))
LIMIT $2 OFFSET $3;

-- Public only. From the persona's communities (joined or followed) first, then by shared
-- interests, live members, and members of the persona's user's gender
-- (everyone if unset). Leaves out channels it has any live row in or follows.
-- name: SuggestChannels :many
WITH viewer AS (
    SELECT u.gender
    FROM personas p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = sqlc.arg(persona_id)::bigint
), my_communities AS (
    SELECT cm.community_id
    FROM community_members cm
    WHERE cm.persona_id = sqlc.arg(persona_id)::bigint AND cm.status = 'active' AND cm.left_at IS NULL
    UNION
    SELECT cf.community_id
    FROM community_followers cf
    WHERE cf.persona_id = sqlc.arg(persona_id)::bigint AND cf.unfollowed_at IS NULL
)
SELECT
    sqlc.embed(c),
    channel_theme(c.theme, c.id)::theme_enum AS effective_theme,
    m.members::int AS members_count,
    (
        SELECT COUNT(DISTINCT cf.persona_id)
        FROM channel_followers cf
        WHERE cf.channel_id = c.id
          AND cf.unfollowed_at IS NULL
    )::int AS followers_count,
    (CASE WHEN src.from_community THEN 'community' ELSE 'interest' END)::text AS source
FROM channels c
CROSS JOIN LATERAL (
    SELECT EXISTS (
        SELECT 1
        FROM community_channels cc
        JOIN my_communities mc ON mc.community_id = cc.community_id
        JOIN communities co ON co.id = cc.community_id AND co.deleted_at IS NULL
        WHERE cc.channel_id = c.id AND cc.status = 'active' AND cc.removed_at IS NULL
    ) AS from_community
) src
CROSS JOIN LATERAL (
    SELECT COUNT(*) AS overlap
    FROM channel_interests ci
    JOIN persona_interests pi ON pi.interest_id = ci.interest_id AND pi.persona_id = sqlc.arg(persona_id)::bigint
    WHERE ci.channel_id = c.id
) o
CROSS JOIN LATERAL (
    SELECT
        COUNT(*) AS members,
        COUNT(*) FILTER (
            WHERE (SELECT gender FROM viewer) IS NULL OR u.gender = (SELECT gender FROM viewer)
        ) AS same_gender
    FROM channel_members cm
    JOIN personas p ON p.id = cm.persona_id AND p.deleted_at IS NULL
    JOIN users u ON u.id = p.user_id
    WHERE cm.channel_id = c.id AND cm.left_at IS NULL AND cm.status = 'active'
) m
WHERE c.deleted_at IS NULL
  AND c.visibility = 'public'
  AND (src.from_community OR o.overlap > 0)
  AND persona_meets_min_age(sqlc.arg(persona_id)::bigint, c.min_age)
  AND NOT EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = c.id AND cm.persona_id = sqlc.arg(persona_id)::bigint AND cm.left_at IS NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM channel_followers cf
      WHERE cf.channel_id = c.id AND cf.persona_id = sqlc.arg(persona_id)::bigint AND cf.unfollowed_at IS NULL
  )
ORDER BY src.from_community DESC, o.overlap DESC, m.members DESC, m.same_gender DESC, c.id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- -------------------------------
-- 10. Get Channel by ID with Membership and Follower Status
-- -------------------------------
-- name: GetChannel :one
SELECT 
    c.*,
    channel_theme(c.theme, c.id)::theme_enum AS effective_theme,
    (c.owner_id = $1) AS is_owner,
    EXISTS (
        SELECT 1 
        FROM channel_members cm 
        WHERE cm.channel_id = c.id 
          AND cm.persona_id = $1 
          AND cm.left_at IS NULL AND cm.status = 'active'
    ) AS is_member,
    EXISTS (
        SELECT 1 
        FROM channel_members cm 
        WHERE cm.channel_id = c.id 
          AND cm.persona_id = $1 
          AND cm.left_at IS NULL AND cm.status = 'pending'
    ) AS is_pending,
    EXISTS (
        SELECT 1 
        FROM channel_followers cf 
        WHERE cf.channel_id = c.id 
          AND cf.persona_id = $1 
          AND cf.unfollowed_at IS NULL
    ) AS is_follower,
    (
        SELECT COUNT(*)
        FROM channel_members cm
        WHERE cm.channel_id = c.id
          AND cm.left_at IS NULL AND cm.status = 'active'
    )::int AS members_count,
    -- DISTINCT: FollowChannel inserts a new row on every follow.
    (
        SELECT COUNT(DISTINCT cf.persona_id)
        FROM channel_followers cf
        WHERE cf.channel_id = c.id
          AND cf.unfollowed_at IS NULL
    )::int AS followers_count
FROM channels c
WHERE c.id = $2 AND c.deleted_at IS NULL
  AND persona_meets_min_age($1, c.min_age);
-- -------------------------------
-- 11. What a persona may do in a channel
-- -------------------------------
-- A missing row (sql.ErrNoRows) means the channel does not exist or is deleted.
-- can_moderate: channel owner, a channel moderator/Administrator, or a global Administrator.
-- name: GetChannelAccess :one
SELECT
    c.id,
    c.visibility,
    (c.owner_id = sqlc.arg(persona_id)::bigint) AS is_owner,
    EXISTS (
        SELECT 1
        FROM channel_members cm
        WHERE cm.channel_id = c.id
          AND cm.persona_id = sqlc.arg(persona_id)::bigint
          AND cm.left_at IS NULL AND cm.status = 'active'
    ) AS is_member,
    EXISTS (
        SELECT 1
        FROM channel_members cm
        WHERE cm.channel_id = c.id
          AND cm.persona_id = sqlc.arg(persona_id)::bigint
          AND cm.left_at IS NULL AND cm.status = 'pending'
    ) AS is_pending,
    (
        c.owner_id = sqlc.arg(persona_id)::bigint
        OR EXISTS (
            SELECT 1
            FROM channel_roles cr
            JOIN roles r ON r.id = cr.role_id
            WHERE cr.channel_id = c.id
              AND cr.persona_id = sqlc.arg(persona_id)::bigint
              AND cr.deleted_at IS NULL
              AND r.name IN ('moderator', 'Administrator')
        )
        OR EXISTS (
            SELECT 1
            FROM personas p
            JOIN user_roles ur ON ur.user_id = p.user_id AND ur.deleted_at IS NULL
            JOIN roles r ON r.id = ur.role_id
            WHERE p.id = sqlc.arg(persona_id)::bigint
              AND r.name = 'Administrator'
        )
    )::boolean AS can_moderate,
    persona_meets_min_age(sqlc.arg(persona_id)::bigint, c.min_age)::boolean AS meets_min_age
FROM channels c
WHERE c.id = sqlc.arg(channel_id)::bigint AND c.deleted_at IS NULL;

-- -------------------------------
-- 12. Pending join requests for a channel
-- -------------------------------
-- name: ListPendingJoinRequests :many
SELECT
    cm.persona_id,
    cm.joined_at AS requested_at,
    p.name,
    p.first_name,
    p.last_name,
    p.thumbnail,
    p.privacy
FROM channel_members cm
JOIN personas p ON p.id = cm.persona_id
WHERE cm.channel_id = $1
  AND cm.left_at IS NULL
  AND cm.status = 'pending'
ORDER BY cm.joined_at;

-- -------------------------------
-- 13. Approve or reject a pending join request
-- -------------------------------
-- name: ResolveJoinRequest :one
UPDATE channel_members
SET status = sqlc.arg(status)::channel_membership_status_enum
WHERE channel_id = sqlc.arg(channel_id)::bigint
  AND persona_id = sqlc.arg(persona_id)::bigint
  AND left_at IS NULL
  AND status = 'pending'
RETURNING *;

-- -------------------------------
-- 14. List active members (moderators only)
-- -------------------------------
-- name: ListChannelMembers :many
SELECT
    cm.persona_id,
    cm.joined_at,
    p.name,
    p.first_name,
    p.last_name,
    p.thumbnail,
    p.privacy,
    (c.owner_id = cm.persona_id)::boolean AS is_owner,
    EXISTS (
        SELECT 1
        FROM channel_roles cr
        JOIN roles r ON r.id = cr.role_id
        WHERE cr.channel_id = cm.channel_id
          AND cr.persona_id = cm.persona_id
          AND cr.deleted_at IS NULL
          AND r.name IN ('moderator', 'Administrator')
    )::boolean AS is_moderator
FROM channel_members cm
JOIN channels c ON c.id = cm.channel_id
JOIN personas p ON p.id = cm.persona_id
WHERE cm.channel_id = $1
  AND cm.left_at IS NULL
  AND cm.status = 'active'
ORDER BY (c.owner_id = cm.persona_id) DESC, cm.joined_at;

-- -------------------------------
-- 15. Names and thumbnails of several channels
-- -------------------------------
-- For labelling lists (notifications) at read time. Metadata is visible to
-- every persona, private channels included.
-- name: ListChannelSummaries :many
SELECT id, name, thumbnail
FROM channels
WHERE id = ANY(sqlc.arg(ids)::bigint[])
  AND deleted_at IS NULL;

-- name: DefaultPersonaInChannel :one
SELECT (EXISTS (
    SELECT 1
    FROM personas p
    JOIN channel_members cm ON cm.persona_id = p.id
    JOIN channels c ON c.id = cm.channel_id AND c.deleted_at IS NULL
    WHERE p.user_id = $1 AND p.is_default AND p.deleted_at IS NULL
      AND cm.status IN ('active', 'pending') AND cm.left_at IS NULL
) OR EXISTS (
    SELECT 1
    FROM personas p
    JOIN channel_followers cf ON cf.persona_id = p.id
    JOIN channels c ON c.id = cf.channel_id AND c.deleted_at IS NULL
    WHERE p.user_id = $1 AND p.is_default AND p.deleted_at IS NULL
      AND cf.unfollowed_at IS NULL
))::boolean AS done;

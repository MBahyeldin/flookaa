-- -------------------------------
-- 1. Create a channel
-- -------------------------------
-- name: CreateChannel :one
INSERT INTO channels (name, description,  owner_id, thumbnail, banner, visibility, created_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
RETURNING *;

-- -------------------------------
-- 2. Update channel
-- -------------------------------
-- name: UpdateChannel :one
UPDATE channels
SET name = COALESCE($1, name),
    description = COALESCE($2, description),
    updated_at = NOW()
WHERE id = $3
RETURNING *;

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
-- name: FollowChannel :one
INSERT INTO channel_followers (channel_id, persona_id)
VALUES ($1, $2)
RETURNING *;

-- -------------------------------
-- 10. Unfollow a channel
-- -------------------------------
-- name: UnfollowChannel :one
UPDATE channel_followers
SET unfollowed_at = NOW()
WHERE channel_id = $1 AND persona_id = $2
RETURNING *;

-- -------------------------------
-- 9. Get All Channels
-- -------------------------------
-- name: GetAllChannels :many
SELECT 
    c.*,
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
    ) AS is_follower
FROM channels c
WHERE c.deleted_at IS NULL
LIMIT $2 OFFSET $3;

-- -------------------------------
-- 10. Get Channel by ID with Membership and Follower Status
-- -------------------------------
-- name: GetChannel :one
SELECT 
    c.*,
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
WHERE c.id = $2 AND c.deleted_at IS NULL;
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
    )::boolean AS can_moderate
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
    p.thumbnail
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

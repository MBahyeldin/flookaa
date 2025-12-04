-- -------------------------------
-- 1. Create a channel
-- -------------------------------
-- name: CreateChannel :one
INSERT INTO channels (name, description,  owner_id, thumbnail, banner, created_at)
VALUES ($1, $2, $3, $4, $5, NOW())
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
WHERE cm.user_id = $1
  AND cm.left_at IS NULL;

-- -------------------------------
-- 6. Get channels a user follows
-- -------------------------------
-- name: GetFollowedChannelsForUser :many
SELECT c.*
FROM channel_followers cf
JOIN channels c ON cf.channel_id = c.id
WHERE cf.user_id = $1
  AND cf.unfollowed_at IS NULL;

-- -------------------------------
-- 7. Add user to channel
-- -------------------------------
-- name: AddUserToChannel :one
INSERT INTO channel_members (channel_id, user_id)
VALUES ($1, $2)
RETURNING *;

-- -------------------------------
-- 8. Remove user from channel (leave)
-- -------------------------------
-- name: RemoveUserFromChannel :one
UPDATE channel_members
SET left_at = NOW()
WHERE channel_id = $1 AND user_id = $2
RETURNING *;

-- -------------------------------
-- 9. Follow a channel
-- -------------------------------
-- name: FollowChannel :one
INSERT INTO channel_followers (channel_id, user_id)
VALUES ($1, $2)
RETURNING *;

-- -------------------------------
-- 10. Unfollow a channel
-- -------------------------------
-- name: UnfollowChannel :one
UPDATE channel_followers
SET unfollowed_at = NOW()
WHERE channel_id = $1 AND user_id = $2
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
          AND cm.user_id = $1 
          AND cm.left_at IS NULL
    ) AS is_member,
    EXISTS (
        SELECT 1 
        FROM channel_followers cf 
        WHERE cf.channel_id = c.id 
          AND cf.user_id = $1 
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
          AND cm.user_id = $1 
          AND cm.left_at IS NULL
    ) AS is_member,
    EXISTS (
        SELECT 1 
        FROM channel_followers cf 
        WHERE cf.channel_id = c.id 
          AND cf.user_id = $1 
          AND cf.unfollowed_at IS NULL
    ) AS is_follower
FROM channels c
WHERE c.id = $2 AND c.deleted_at IS NULL;
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
    invite_token = CASE WHEN COALESCE($10, privacy) = 'private' THEN invite_token END,
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
        -- A pending invitation shows the inviter to the invitee.
        OR (t.privacy = 'private' AND EXISTS (
            SELECT 1
            FROM persona_follow_invitations i
            WHERE i.persona_id = t.id
              AND i.invitee_persona_id = sqlc.arg(viewer_id)::bigint
              AND i.status = 'pending'
        ))
        -- Following someone (or asking to) shows you to them.
        OR EXISTS (
            SELECT 1
            FROM persona_followers pf
            WHERE pf.persona_id = sqlc.arg(viewer_id)::bigint
              AND pf.follower_persona_id = t.id
              AND pf.status IN ('pending', 'active')
              AND pf.unfollowed_at IS NULL
        )
    )::boolean AS visible
FROM personas t
WHERE t.id = ANY(sqlc.arg(ids)::bigint[])
  AND t.deleted_at IS NULL;

-- -------------------------------
-- 15. Connected personas of a linked persona
-- -------------------------------
-- name: ListConnectedPersonas :many
SELECT p.id, p.name, p.first_name, p.last_name, p.slug, p.thumbnail, p.bio,
    pf.status AS follow_status
FROM personas s
JOIN personas p ON p.user_id = s.user_id AND p.id <> s.id
LEFT JOIN persona_followers pf
    ON pf.persona_id = p.id
   AND pf.follower_persona_id = sqlc.arg(viewer_id)::bigint
   AND pf.unfollowed_at IS NULL
WHERE s.id = sqlc.arg(persona_id)::bigint
  AND s.deleted_at IS NULL AND s.privacy = 'public' AND s.show_on_profile
  AND p.deleted_at IS NULL AND p.privacy = 'public' AND p.show_on_profile
ORDER BY p.created_at, p.id;

-- -------------------------------
-- 16. Follow decision: target privacy and the live follow, if any
-- -------------------------------
-- name: GetFollowTarget :one
SELECT
    t.privacy,
    pf.status AS follow_status,
    EXISTS (
        SELECT 1 FROM persona_follow_invitations i
        WHERE i.persona_id = t.id
          AND i.invitee_persona_id = sqlc.arg(follower_persona_id)::bigint
          AND i.status = 'pending'
    )::boolean AS invited
FROM personas t
LEFT JOIN persona_followers pf
    ON pf.persona_id = t.id
   AND pf.follower_persona_id = sqlc.arg(follower_persona_id)::bigint
   AND pf.unfollowed_at IS NULL
WHERE t.id = sqlc.arg(persona_id)::bigint
  AND t.deleted_at IS NULL;

-- -------------------------------
-- 17. Follow a persona
-- -------------------------------
-- One row per pair: an earlier unfollow is revived, a live row is left alone.
-- name: FollowPersona :execrows
INSERT INTO persona_followers (persona_id, follower_persona_id, status)
VALUES ($1, $2, $3)
ON CONFLICT (persona_id, follower_persona_id) DO UPDATE
SET status = EXCLUDED.status, followed_at = NOW(), unfollowed_at = NULL
WHERE persona_followers.unfollowed_at IS NOT NULL;

-- -------------------------------
-- 18. Unfollow a persona, or cancel a pending request
-- -------------------------------
-- name: UnfollowPersona :one
UPDATE persona_followers
SET unfollowed_at = NOW()
WHERE persona_id = $1 AND follower_persona_id = $2
  AND unfollowed_at IS NULL AND status IN ('active', 'pending')
RETURNING status;

-- -------------------------------
-- 19. Follow counts of a persona and the viewer's follow
-- -------------------------------
-- name: GetPersonaFollowInfo :one
SELECT
    (SELECT COUNT(*)
     FROM persona_followers pf
     JOIN personas f ON f.id = pf.follower_persona_id AND f.deleted_at IS NULL
     WHERE pf.persona_id = t.id AND pf.status = 'active' AND pf.unfollowed_at IS NULL
    )::bigint AS followers_count,
    (SELECT COUNT(*)
     FROM persona_followers pf
     JOIN personas f ON f.id = pf.persona_id AND f.deleted_at IS NULL
     WHERE pf.follower_persona_id = t.id AND pf.status = 'active' AND pf.unfollowed_at IS NULL
    )::bigint AS following_count,
    v.status AS follow_status,
    (t.privacy = 'private')::boolean AS requires_approval,
    EXISTS (
        SELECT 1 FROM persona_follow_invitations i
        WHERE i.persona_id = sqlc.arg(viewer_id)::bigint AND i.invitee_persona_id = t.id
          AND (i.status = 'pending'
               OR (i.status = 'rejected' AND i.responded_at >= NOW() - INTERVAL '30 days'))
    )::boolean AS invited,
    EXISTS (
        SELECT 1 FROM persona_follow_invitations i
        WHERE i.persona_id = t.id AND i.invitee_persona_id = sqlc.arg(viewer_id)::bigint
          AND i.status = 'pending'
    )::boolean AS invited_you,
    COALESCE(
        vp.privacy = 'private'
        AND vp.user_id <> t.user_id
        AND NOT EXISTS (
            SELECT 1 FROM persona_followers f
            WHERE f.persona_id = vp.id AND f.follower_persona_id = t.id
              AND f.status = 'active' AND f.unfollowed_at IS NULL
        ),
        false
    )::boolean AS can_invite
FROM personas t
LEFT JOIN personas vp ON vp.id = sqlc.arg(viewer_id)::bigint AND vp.deleted_at IS NULL
LEFT JOIN persona_followers v
    ON v.persona_id = t.id
   AND v.follower_persona_id = sqlc.arg(viewer_id)::bigint
   AND v.unfollowed_at IS NULL
WHERE t.id = sqlc.arg(persona_id)::bigint;

-- -------------------------------
-- 20. Pending follow requests to a persona
-- -------------------------------
-- name: ListPendingFollowRequests :many
SELECT f.id AS persona_id, f.first_name, f.last_name, f.thumbnail, f.privacy,
    pf.followed_at AS requested_at
FROM persona_followers pf
JOIN personas f ON f.id = pf.follower_persona_id AND f.deleted_at IS NULL
WHERE pf.persona_id = $1 AND pf.status = 'pending' AND pf.unfollowed_at IS NULL
ORDER BY pf.followed_at DESC, f.id DESC;

-- -------------------------------
-- 21. Active followers of a persona
-- -------------------------------
-- name: ListFollowers :many
SELECT f.id AS persona_id, f.first_name, f.last_name, f.thumbnail, f.privacy,
    pf.followed_at
FROM persona_followers pf
JOIN personas f ON f.id = pf.follower_persona_id AND f.deleted_at IS NULL
WHERE pf.persona_id = $1 AND pf.status = 'active' AND pf.unfollowed_at IS NULL
ORDER BY pf.followed_at DESC, f.id DESC;

-- -------------------------------
-- 22. Approve or reject a pending follow request
-- -------------------------------
-- name: ResolveFollowRequest :one
UPDATE persona_followers
SET status = sqlc.arg(status)::persona_follow_status_enum,
    followed_at = CASE WHEN sqlc.arg(status)::persona_follow_status_enum = 'active' THEN NOW() ELSE followed_at END
WHERE persona_id = sqlc.arg(persona_id)::bigint
  AND follower_persona_id = sqlc.arg(follower_persona_id)::bigint
  AND status = 'pending' AND unfollowed_at IS NULL
RETURNING status;

-- -------------------------------
-- 23. Remove an active follower
-- -------------------------------
-- name: RemoveFollower :execrows
UPDATE persona_followers
SET unfollowed_at = NOW()
WHERE persona_id = $1 AND follower_persona_id = $2
  AND status = 'active' AND unfollowed_at IS NULL;

-- -------------------------------
-- Follow-request link of a private persona
-- -------------------------------
-- name: EnsurePersonaInviteToken :one
UPDATE personas
SET invite_token = COALESCE(invite_token, sqlc.arg(token)::text)
WHERE id = sqlc.arg(persona_id)::bigint AND privacy = 'private' AND deleted_at IS NULL
RETURNING invite_token::text;

-- name: ResetPersonaInviteToken :one
UPDATE personas
SET invite_token = sqlc.arg(token)::text
WHERE id = sqlc.arg(persona_id)::bigint AND privacy = 'private' AND deleted_at IS NULL
RETURNING invite_token::text;

-- name: GetPersonaByInviteToken :one
SELECT t.id
FROM personas t
WHERE t.invite_token = sqlc.arg(token)::text
  AND t.privacy = 'private'
  AND t.deleted_at IS NULL;

-- -------------------------------
-- Follow invitations
-- -------------------------------
-- name: GetInviteTarget :one
SELECT
    a.privacy AS inviter_privacy,
    (a.user_id = b.user_id)::boolean AS same_user,
    pf.status AS follow_status
FROM personas a
JOIN personas b ON b.id = sqlc.arg(invitee_persona_id)::bigint AND b.deleted_at IS NULL
LEFT JOIN persona_followers pf
    ON pf.persona_id = a.id
   AND pf.follower_persona_id = b.id
   AND pf.unfollowed_at IS NULL
WHERE a.id = sqlc.arg(persona_id)::bigint
  AND a.deleted_at IS NULL;

-- A live invitation, or a rejection still in its 30-day cooldown, is left alone.
-- name: InvitePersona :execrows
INSERT INTO persona_follow_invitations (persona_id, invitee_persona_id, status)
VALUES ($1, $2, 'pending')
ON CONFLICT (persona_id, invitee_persona_id) DO UPDATE
SET status = 'pending', invited_at = NOW(), responded_at = NULL
WHERE persona_follow_invitations.status IN ('accepted', 'cancelled')
   OR (persona_follow_invitations.status = 'rejected'
       AND persona_follow_invitations.responded_at < NOW() - INTERVAL '30 days');

-- name: CancelInvitation :execrows
UPDATE persona_follow_invitations
SET status = 'cancelled', responded_at = NOW()
WHERE persona_id = $1 AND invitee_persona_id = $2 AND status = 'pending';

-- name: CancelInvitationsFrom :many
UPDATE persona_follow_invitations
SET status = 'cancelled', responded_at = NOW()
WHERE persona_id = $1 AND status = 'pending'
RETURNING invitee_persona_id;

-- name: RejectInvitation :execrows
UPDATE persona_follow_invitations
SET status = 'rejected', responded_at = NOW()
WHERE persona_id = $1 AND invitee_persona_id = $2 AND status = 'pending';

-- Accepting makes the invitee an active follower from any earlier state.
-- name: AcceptInvitation :one
WITH accepted AS (
    UPDATE persona_follow_invitations i
    SET status = 'accepted', responded_at = NOW()
    FROM personas p
    WHERE i.persona_id = sqlc.arg(persona_id)::bigint
      AND i.invitee_persona_id = sqlc.arg(invitee_persona_id)::bigint
      AND i.status = 'pending'
      AND p.id = i.persona_id AND p.deleted_at IS NULL AND p.privacy = 'private'
    RETURNING i.persona_id, i.invitee_persona_id
)
INSERT INTO persona_followers (persona_id, follower_persona_id, status)
SELECT persona_id, invitee_persona_id, 'active' FROM accepted
ON CONFLICT (persona_id, follower_persona_id) DO UPDATE
SET status = 'active',
    followed_at = CASE
        WHEN persona_followers.status = 'active' AND persona_followers.unfollowed_at IS NULL
        THEN persona_followers.followed_at ELSE NOW() END,
    unfollowed_at = NULL
RETURNING persona_id;

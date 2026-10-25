-- The owner is the first active member.
-- name: CreateCommunity :one
WITH created AS (
    INSERT INTO communities (name, slug, description, rules, thumbnail, banner, visibility, owner_id, min_age, theme, cover_pattern)
    VALUES (
        sqlc.arg(name), sqlc.arg(slug), sqlc.arg(description), sqlc.arg(rules), sqlc.arg(thumbnail),
        sqlc.arg(banner), sqlc.arg(visibility), sqlc.arg(owner_id), sqlc.arg(min_age)::smallint,
        sqlc.arg(theme)::theme_enum, sqlc.arg(cover_pattern)::cover_pattern_enum
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
    rules = COALESCE(sqlc.narg(rules), rules),
    thumbnail = COALESCE(sqlc.narg(thumbnail), thumbnail),
    banner = COALESCE(sqlc.narg(banner), banner),
    visibility = COALESCE(sqlc.narg(visibility)::community_visibility_enum, visibility),
    min_age = COALESCE(sqlc.narg(min_age)::smallint, min_age),
    theme = COALESCE(sqlc.narg(theme)::theme_enum, theme),
    cover_pattern = COALESCE(sqlc.narg(cover_pattern)::cover_pattern_enum, cover_pattern),
    updated_at = now()
WHERE id = sqlc.arg(id) AND deleted_at IS NULL
RETURNING *;

-- name: GetCommunityByID :one
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND cc.status = 'active' AND cc.removed_at IS NULL
       AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
WHERE c.id = sqlc.arg(id) AND c.deleted_at IS NULL;

-- name: GetCommunityBySlug :one
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND cc.status = 'active' AND cc.removed_at IS NULL
       AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
WHERE c.slug = sqlc.arg(slug) AND c.deleted_at IS NULL;

-- A missing row (sql.ErrNoRows) means the community does not exist or is deleted.
-- membership_status is the live row's raw status (NULL when none).
-- A moderator is one only while it's an active member.
-- name: GetCommunityAccess :one
SELECT
    c.id,
    c.visibility,
    c.owner_id,
    (c.owner_id = sqlc.arg(persona_id)::bigint) AS is_owner,
    m.status AS membership_status,
    m.resolved_at AS membership_resolved_at,
    (f.persona_id IS NOT NULL)::boolean AS is_following,
    COALESCE(
        m.status = 'active' AND EXISTS (
            SELECT 1
            FROM community_roles cr
            JOIN roles r ON r.id = cr.role_id
            WHERE cr.community_id = c.id
              AND cr.persona_id = sqlc.arg(persona_id)::bigint
              AND cr.deleted_at IS NULL
              AND r.name = 'moderator'
        ),
        false
    )::boolean AS is_moderator,
    EXISTS (
        SELECT 1
        FROM personas p
        JOIN user_roles ur ON ur.user_id = p.user_id AND ur.deleted_at IS NULL
        JOIN roles r ON r.id = ur.role_id
        WHERE p.id = sqlc.arg(persona_id)::bigint
          AND r.name = 'Administrator'
    )::boolean AS is_admin,
    persona_meets_min_age(sqlc.arg(persona_id)::bigint, c.min_age)::boolean AS meets_min_age
FROM communities c
LEFT JOIN community_members m
    ON m.community_id = c.id AND m.persona_id = sqlc.arg(persona_id)::bigint AND m.left_at IS NULL
LEFT JOIN community_followers f
    ON f.community_id = c.id AND f.persona_id = sqlc.arg(persona_id)::bigint AND f.unfollowed_at IS NULL
WHERE c.id = sqlc.arg(community_id)::bigint AND c.deleted_at IS NULL;

-- name: ListCommunities :many
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND cc.status = 'active' AND cc.removed_at IS NULL
       AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
WHERE c.deleted_at IS NULL
  AND persona_meets_min_age(sqlc.arg(viewer_id)::bigint, c.min_age)
  AND (coalesce(cardinality(sqlc.arg(interest_slugs)::text[]), 0) = 0 OR EXISTS (
      SELECT 1
      FROM community_interests ci
      JOIN interests i ON i.id = ci.interest_id
      WHERE ci.community_id = c.id AND i.slug = ANY(sqlc.arg(interest_slugs)::text[])
  ))
ORDER BY c.created_at DESC, c.id DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- Public only. By shared interests (at least one), then live members, then members of the
-- persona's user's gender (everyone if unset). Leaves out communities the
-- persona has any live membership row in (active, pending or rejected) or follows.
-- name: SuggestCommunities :many
WITH viewer AS (
    SELECT u.gender
    FROM personas p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = sqlc.arg(persona_id)::bigint
)
SELECT sqlc.embed(c),
    (SELECT COUNT(*) FROM community_channels cc JOIN channels ch ON ch.id = cc.channel_id
     WHERE cc.community_id = c.id AND cc.status = 'active' AND cc.removed_at IS NULL
       AND ch.deleted_at IS NULL)::int AS channels_count
FROM communities c
CROSS JOIN LATERAL (
    SELECT COUNT(*) AS overlap
    FROM community_interests ci
    JOIN persona_interests pi ON pi.interest_id = ci.interest_id AND pi.persona_id = sqlc.arg(persona_id)::bigint
    WHERE ci.community_id = c.id
) o
CROSS JOIN LATERAL (
    SELECT
        COUNT(*) AS members,
        COUNT(*) FILTER (
            WHERE (SELECT gender FROM viewer) IS NULL OR u.gender = (SELECT gender FROM viewer)
        ) AS same_gender
    FROM community_members cm
    JOIN personas p ON p.id = cm.persona_id AND p.deleted_at IS NULL
    JOIN users u ON u.id = p.user_id
    WHERE cm.community_id = c.id AND cm.status = 'active' AND cm.left_at IS NULL
) m
WHERE c.deleted_at IS NULL
  AND c.visibility = 'public'
  AND o.overlap > 0
  AND persona_meets_min_age(sqlc.arg(persona_id)::bigint, c.min_age)
  AND NOT EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = c.id AND cm.persona_id = sqlc.arg(persona_id)::bigint AND cm.left_at IS NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM community_followers cf
      WHERE cf.community_id = c.id AND cf.persona_id = sqlc.arg(persona_id)::bigint AND cf.unfollowed_at IS NULL
  )
ORDER BY o.overlap DESC, m.members DESC, m.same_gender DESC, c.id DESC
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
INSERT INTO community_channels (community_id, channel_id, status, resolved_at)
VALUES (sqlc.arg(community_id), sqlc.arg(channel_id), 'active', now());

-- name: ListChannelCommunities :many
SELECT cc.channel_id, c.id, c.name, c.slug
FROM community_channels cc
JOIN communities c ON c.id = cc.community_id
WHERE cc.channel_id = ANY(sqlc.arg(channel_ids)::bigint[])
  AND cc.status = 'active' AND cc.removed_at IS NULL
  AND c.deleted_at IS NULL
  AND persona_meets_min_age(sqlc.arg(viewer_id)::bigint, c.min_age);

-- name: GetCommunityChannelIDByName :one
SELECT ch.id
FROM community_channels cc
JOIN channels ch ON ch.id = cc.channel_id
WHERE cc.community_id = sqlc.arg(community_id)
  AND cc.status = 'active' AND cc.removed_at IS NULL
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
    vm.resolved_at AS viewer_resolved_at,
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
    (c.owner_id = cm.persona_id)::boolean AS is_owner,
    (mr.persona_id IS NOT NULL)::boolean AS is_moderator
FROM community_members cm
JOIN communities c ON c.id = cm.community_id
JOIN personas p ON p.id = cm.persona_id
LEFT JOIN (
    SELECT DISTINCT cr.persona_id
    FROM community_roles cr
    JOIN roles r ON r.id = cr.role_id
    WHERE cr.community_id = sqlc.arg(community_id) AND cr.deleted_at IS NULL AND r.name = 'moderator'
) mr ON mr.persona_id = cm.persona_id
WHERE cm.community_id = sqlc.arg(community_id)
  AND cm.left_at IS NULL AND cm.status = 'active'
  AND p.deleted_at IS NULL
ORDER BY (c.owner_id = cm.persona_id) DESC, (mr.persona_id IS NOT NULL) DESC, cm.joined_at, cm.persona_id
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- Only a live active member can be appointed; no row changed means it isn't one or already moderates.
-- name: AssignCommunityModerator :execrows
INSERT INTO community_roles (community_id, persona_id, role_id)
SELECT cm.community_id, cm.persona_id, r.id
FROM community_members cm
JOIN roles r ON r.name = 'moderator' AND r.deleted_at IS NULL
WHERE cm.community_id = sqlc.arg(community_id) AND cm.persona_id = sqlc.arg(persona_id)
  AND cm.left_at IS NULL AND cm.status = 'active'
ON CONFLICT (community_id, persona_id, role_id) DO UPDATE
SET deleted_at = NULL, updated_at = now()
WHERE community_roles.deleted_at IS NOT NULL;

-- name: RemoveCommunityModerator :execrows
UPDATE community_roles cr
SET deleted_at = now(), updated_at = now()
FROM roles r
WHERE r.id = cr.role_id AND r.name = 'moderator'
  AND cr.community_id = sqlc.arg(community_id) AND cr.persona_id = sqlc.arg(persona_id)
  AND cr.deleted_at IS NULL;

-- name: RevokeCommunityRolesForPersona :execrows
UPDATE community_roles
SET deleted_at = now(), updated_at = now()
WHERE community_id = sqlc.arg(community_id) AND persona_id = sqlc.arg(persona_id)
  AND deleted_at IS NULL;

-- The channel's live row: in a community, or a pending request to one.
-- name: GetLiveChannelCommunity :one
SELECT cc.community_id, cc.status
FROM community_channels cc
JOIN communities c ON c.id = cc.community_id AND c.deleted_at IS NULL
WHERE cc.channel_id = sqlc.arg(channel_id)
  AND cc.status IN ('pending', 'active') AND cc.removed_at IS NULL;

-- For the channel's manage sheet: its live row, else its latest rejection inside the cooldown.
-- name: GetChannelCommunityState :one
SELECT cc.community_id, c.name, c.slug, cc.status, cc.resolved_at
FROM community_channels cc
JOIN communities c ON c.id = cc.community_id AND c.deleted_at IS NULL
WHERE cc.channel_id = sqlc.arg(channel_id)
  AND (
      (cc.status IN ('pending', 'active') AND cc.removed_at IS NULL)
      OR (cc.status = 'rejected' AND cc.resolved_at >= now() - interval '30 days')
  )
ORDER BY (cc.status <> 'rejected') DESC, cc.resolved_at DESC NULLS LAST
LIMIT 1;

-- Revives a cancelled or removed row, or a rejection past its 30-day cooldown.
-- No row: a live row for this pair, or a rejection inside the cooldown.
-- name: RequestCommunityChannel :one
INSERT INTO community_channels (community_id, channel_id, status, requested_by)
VALUES (sqlc.arg(community_id), sqlc.arg(channel_id), 'pending', sqlc.arg(requested_by))
ON CONFLICT (community_id, channel_id) DO UPDATE
SET status = 'pending', requested_by = EXCLUDED.requested_by, created_at = now(),
    resolved_at = NULL, removed_at = NULL
WHERE community_channels.removed_at IS NOT NULL
   OR (community_channels.status = 'rejected' AND community_channels.resolved_at < now() - interval '30 days')
RETURNING status;

-- name: CancelCommunityChannelRequest :execrows
UPDATE community_channels
SET removed_at = now()
WHERE community_id = sqlc.arg(community_id) AND channel_id = sqlc.arg(channel_id)
  AND status = 'pending' AND removed_at IS NULL;

-- name: ResolveCommunityChannelRequest :one
UPDATE community_channels
SET status = sqlc.arg(status)::community_channel_status_enum, resolved_at = now()
WHERE community_id = sqlc.arg(community_id) AND channel_id = sqlc.arg(channel_id)
  AND status = 'pending' AND removed_at IS NULL
RETURNING requested_by;

-- name: RemoveCommunityChannel :execrows
UPDATE community_channels
SET removed_at = now()
WHERE community_id = sqlc.arg(community_id) AND channel_id = sqlc.arg(channel_id)
  AND status = 'active' AND removed_at IS NULL;

-- name: ListCommunityChannelRequests :many
SELECT
    ch.id AS channel_id,
    ch.name,
    ch.description,
    ch.thumbnail,
    ch.visibility,
    cc.created_at AS requested_at
FROM community_channels cc
JOIN channels ch ON ch.id = cc.channel_id AND ch.deleted_at IS NULL
WHERE cc.community_id = sqlc.arg(community_id)
  AND cc.status = 'pending' AND cc.removed_at IS NULL
ORDER BY cc.created_at, ch.id;

-- Channels the persona owns or moderates, with their live community row.
-- name: ListModeratedChannels :many
SELECT
    ch.id,
    ch.name,
    ch.thumbnail,
    channel_theme(ch.theme, ch.id)::theme_enum AS effective_theme,
    ch.visibility,
    COALESCE(lc.community_id, 0)::bigint AS community_id,
    COALESCE(lc.name, '')::text AS community_name,
    COALESCE(lc.slug, '')::text AS community_slug,
    COALESCE(lc.status::text, '')::text AS community_status
FROM channels ch
LEFT JOIN LATERAL (
    SELECT cc.community_id, c.name, c.slug, cc.status
    FROM community_channels cc
    JOIN communities c ON c.id = cc.community_id AND c.deleted_at IS NULL
    WHERE cc.channel_id = ch.id
      AND cc.status IN ('pending', 'active') AND cc.removed_at IS NULL
) lc ON true
WHERE ch.deleted_at IS NULL
  AND (
      ch.owner_id = sqlc.arg(persona_id)
      OR EXISTS (
          SELECT 1
          FROM channel_roles cr
          JOIN roles r ON r.id = cr.role_id
          WHERE cr.channel_id = ch.id
            AND cr.persona_id = sqlc.arg(persona_id)
            AND cr.deleted_at IS NULL
            AND r.name IN ('moderator', 'Administrator')
      )
  )
  AND persona_meets_min_age(sqlc.arg(persona_id)::bigint, ch.min_age)
ORDER BY ch.name, ch.id;

-- name: ListCommunitySummaries :many
SELECT id, name, slug, thumbnail
FROM communities
WHERE id = ANY(sqlc.arg(ids)::bigint[])
  AND deleted_at IS NULL;

-- name: DefaultPersonaInCommunity :one
SELECT (EXISTS (
    SELECT 1
    FROM personas p
    JOIN community_members cm ON cm.persona_id = p.id
    JOIN communities c ON c.id = cm.community_id AND c.deleted_at IS NULL
    WHERE p.user_id = $1 AND p.is_default AND p.deleted_at IS NULL
      AND cm.status IN ('active', 'pending') AND cm.left_at IS NULL
) OR EXISTS (
    SELECT 1
    FROM personas p
    JOIN community_followers cf ON cf.persona_id = p.id
    JOIN communities c ON c.id = cf.community_id AND c.deleted_at IS NULL
    WHERE p.user_id = $1 AND p.is_default AND p.deleted_at IS NULL
      AND cf.unfollowed_at IS NULL
))::boolean AS done;

-- Channels whose theme follows the community's.
-- name: ListCommunityInheritingChannelIDs :many
SELECT ch.id
FROM community_channels cc
JOIN channels ch ON ch.id = cc.channel_id
WHERE cc.community_id = sqlc.arg(community_id)
  AND cc.status = 'active' AND cc.removed_at IS NULL
  AND ch.deleted_at IS NULL AND ch.theme IS NULL;

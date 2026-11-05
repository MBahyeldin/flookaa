-- name: ListActiveInterests :many
SELECT i.id, i.name_en, i.name_ar, i.slug, i.emoji, g.id AS group_id, g.name_en AS group_name_en, g.name_ar AS group_name_ar, g.slug AS group_slug
FROM interests i
JOIN interest_groups g ON g.id = i.group_id
WHERE i.retired_at IS NULL
ORDER BY g.sort_order, g.name_en, i.sort_order, i.name_en;

-- name: ListAllInterests :many
SELECT id, name_en, name_ar, slug, emoji, group_id, sort_order, (retired_at IS NOT NULL)::boolean AS retired
FROM interests
ORDER BY (retired_at IS NOT NULL), sort_order, name_en;

-- name: GetInterest :one
SELECT id, name_en, name_ar, slug, emoji, group_id, sort_order, (retired_at IS NOT NULL)::boolean AS retired
FROM interests
WHERE id = $1;

-- name: CreateInterest :one
INSERT INTO interests (name_en, name_ar, slug, emoji, group_id, sort_order)
VALUES (
    sqlc.arg(name_en),
    sqlc.narg(name_ar),
    sqlc.arg(slug),
    sqlc.arg(emoji),
    sqlc.arg(group_id)::bigint,
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM interests)
)
RETURNING id, name_en, name_ar, slug, emoji, group_id, sort_order, (retired_at IS NOT NULL)::boolean AS retired;

-- Moving to another group puts the interest last.
-- name: UpdateInterest :one
UPDATE interests
SET name_en = sqlc.arg(name_en)::text,
    name_ar = sqlc.narg(name_ar),
    slug = sqlc.arg(slug)::text,
    emoji = sqlc.arg(emoji)::text,
    sort_order = CASE
        WHEN group_id IS DISTINCT FROM sqlc.arg(group_id)::bigint
        THEN (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM interests)
        ELSE sort_order
    END,
    group_id = sqlc.arg(group_id)::bigint,
    updated_at = now()
WHERE id = sqlc.arg(id)::bigint
RETURNING id, name_en, name_ar, slug, emoji, group_id, sort_order, (retired_at IS NOT NULL)::boolean AS retired;

-- name: SetInterestOrders :exec
UPDATE interests i
SET sort_order = o.sort_order,
    updated_at = now()
FROM unnest(sqlc.arg(ids)::bigint[], sqlc.arg(orders)::int[]) AS o(id, sort_order)
WHERE i.id = o.id AND i.sort_order <> o.sort_order;

-- name: SetInterestRetired :one
UPDATE interests
SET retired_at = CASE WHEN sqlc.arg(retired)::boolean THEN COALESCE(retired_at, now()) END,
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id, name_en, name_ar, slug, emoji, group_id, sort_order, (retired_at IS NOT NULL)::boolean AS retired;

-- name: ListInterestGroups :many
SELECT id, name_en, name_ar, slug
FROM interest_groups
ORDER BY sort_order, name_en;

-- name: GetInterestGroup :one
SELECT id, name_en, name_ar, slug
FROM interest_groups
WHERE id = $1;

-- name: CreateInterestGroup :one
INSERT INTO interest_groups (name_en, name_ar, slug, sort_order)
VALUES (
    sqlc.arg(name_en),
    sqlc.narg(name_ar),
    sqlc.arg(slug),
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM interest_groups)
)
RETURNING id, name_en, name_ar, slug;

-- name: UpdateInterestGroup :one
UPDATE interest_groups
SET name_en = sqlc.arg(name_en),
    name_ar = sqlc.narg(name_ar),
    slug = sqlc.arg(slug),
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id, name_en, name_ar, slug;

-- name: SetInterestGroupOrders :exec
UPDATE interest_groups g
SET sort_order = o.sort_order,
    updated_at = now()
FROM unnest(sqlc.arg(ids)::bigint[], sqlc.arg(orders)::int[]) AS o(id, sort_order)
WHERE g.id = o.id AND g.sort_order <> o.sort_order;

-- name: InterestGroupExists :one
SELECT EXISTS (SELECT 1 FROM interest_groups WHERE id = $1)::boolean AS exists;

-- Seeding skips a group whose name or slug already exists.
-- name: SeedInterestGroup :exec
INSERT INTO interest_groups (name_en, name_ar, slug, sort_order)
VALUES (
    sqlc.arg(name_en),
    sqlc.arg(name_ar),
    sqlc.arg(slug),
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM interest_groups)
)
ON CONFLICT DO NOTHING;

-- Seeding skips an interest whose name or slug already exists.
-- name: SeedInterest :exec
INSERT INTO interests (name_en, name_ar, slug, emoji, group_id, sort_order)
SELECT
    sqlc.arg(name_en),
    sqlc.arg(name_ar),
    sqlc.arg(slug),
    sqlc.arg(emoji),
    g.id,
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM interests)
FROM interest_groups g
WHERE g.slug = sqlc.arg(group_slug)
ON CONFLICT DO NOTHING;

-- Gives an existing interest its seeded group, only if it has none.
-- name: FillInterestGroup :exec
UPDATE interests i
SET group_id = g.id,
    updated_at = now()
FROM interest_groups g
WHERE i.slug = sqlc.arg(slug)
  AND i.group_id IS NULL
  AND g.slug = sqlc.arg(group_slug);

-- Gives an existing interest its seeded Arabic name, only if it has none.
-- name: FillInterestNameAr :exec
UPDATE interests
SET name_ar = sqlc.arg(name_ar),
    updated_at = now()
WHERE slug = sqlc.arg(slug) AND name_ar IS NULL;

-- name: FillInterestGroupNameAr :exec
UPDATE interest_groups
SET name_ar = sqlc.arg(name_ar),
    updated_at = now()
WHERE slug = sqlc.arg(slug) AND name_ar IS NULL;

-- Within a group, by popularity among personas of users with the viewer's gender (everyone if unset).
-- name: RankedActiveInterests :many
WITH viewer AS (
    SELECT gender FROM users WHERE id = sqlc.arg(user_id)::bigint
), popularity AS (
    SELECT pi.interest_id, COUNT(*) AS n
    FROM persona_interests pi
    JOIN personas p ON p.id = pi.persona_id AND p.deleted_at IS NULL
    JOIN users u ON u.id = p.user_id
    WHERE (SELECT gender FROM viewer) IS NULL OR u.gender = (SELECT gender FROM viewer)
    GROUP BY pi.interest_id
)
SELECT i.id, i.name_en, i.name_ar, i.slug, i.emoji, g.id AS group_id, g.name_en AS group_name_en, g.name_ar AS group_name_ar, g.slug AS group_slug
FROM interests i
JOIN interest_groups g ON g.id = i.group_id
LEFT JOIN popularity pop ON pop.interest_id = i.id
WHERE i.retired_at IS NULL
ORDER BY g.sort_order, g.name_en, COALESCE(pop.n, 0) DESC, i.sort_order, i.name_en;

-- name: ListPersonaInterests :many
SELECT i.id, i.name_en, i.name_ar, i.slug, i.emoji, (i.retired_at IS NOT NULL)::boolean AS retired
FROM persona_interests pi
JOIN interests i ON i.id = pi.interest_id
WHERE pi.persona_id = $1
ORDER BY pi.created_at, i.id;

-- An id is allowed if it's active or the persona already has it.
-- name: CountAllowedPersonaInterests :one
SELECT COUNT(*)::int AS allowed
FROM interests i
WHERE i.id = ANY(sqlc.arg(ids)::bigint[])
  AND (i.retired_at IS NULL OR EXISTS (
      SELECT 1 FROM persona_interests pi
      WHERE pi.persona_id = sqlc.arg(persona_id) AND pi.interest_id = i.id
  ));

-- name: ReplacePersonaInterests :exec
WITH removed AS (
    DELETE FROM persona_interests
    WHERE persona_id = sqlc.arg(persona_id)
      AND NOT (interest_id = ANY(sqlc.arg(ids)::bigint[]))
)
INSERT INTO persona_interests (persona_id, interest_id)
SELECT sqlc.arg(persona_id), unnest(sqlc.arg(ids)::bigint[])
ON CONFLICT DO NOTHING;

-- name: DefaultPersonaHasInterests :one
SELECT EXISTS (
    SELECT 1
    FROM persona_interests pi
    JOIN personas p ON p.id = pi.persona_id
    WHERE p.user_id = $1 AND p.is_default AND p.deleted_at IS NULL
)::boolean AS done;

-- name: ListChannelInterests :many
SELECT ci.channel_id, i.id, i.name_en, i.name_ar, i.slug, i.emoji
FROM channel_interests ci
JOIN interests i ON i.id = ci.interest_id
WHERE ci.channel_id = ANY(sqlc.arg(channel_ids)::bigint[])
ORDER BY ci.channel_id, ci.created_at, i.id;

-- An id is allowed if it's active or the channel already has it.
-- name: CountAllowedChannelInterests :one
SELECT COUNT(*)::int AS allowed
FROM interests i
WHERE i.id = ANY(sqlc.arg(ids)::bigint[])
  AND (i.retired_at IS NULL OR EXISTS (
      SELECT 1 FROM channel_interests ci
      WHERE ci.channel_id = sqlc.arg(channel_id) AND ci.interest_id = i.id
  ));

-- name: ReplaceChannelInterests :exec
WITH removed AS (
    DELETE FROM channel_interests
    WHERE channel_id = sqlc.arg(channel_id)
      AND NOT (interest_id = ANY(sqlc.arg(ids)::bigint[]))
)
INSERT INTO channel_interests (channel_id, interest_id)
SELECT sqlc.arg(channel_id), unnest(sqlc.arg(ids)::bigint[])
ON CONFLICT DO NOTHING;

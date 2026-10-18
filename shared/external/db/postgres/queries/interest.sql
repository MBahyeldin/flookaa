-- name: ListActiveInterests :many
SELECT id, name, slug, emoji
FROM interests
WHERE retired_at IS NULL
ORDER BY sort_order, name;

-- name: ListAllInterests :many
SELECT id, name, slug, emoji, sort_order, (retired_at IS NOT NULL)::boolean AS retired
FROM interests
ORDER BY (retired_at IS NOT NULL), sort_order, name;

-- name: GetInterest :one
SELECT id, name, slug, emoji, sort_order, (retired_at IS NOT NULL)::boolean AS retired
FROM interests
WHERE id = $1;

-- name: CreateInterest :one
INSERT INTO interests (name, slug, emoji, sort_order)
VALUES (
    sqlc.arg(name),
    sqlc.arg(slug),
    sqlc.arg(emoji),
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM interests)
)
RETURNING id, name, slug, emoji, sort_order, (retired_at IS NOT NULL)::boolean AS retired;

-- name: UpdateInterest :one
UPDATE interests
SET name = sqlc.arg(name),
    slug = sqlc.arg(slug),
    emoji = sqlc.arg(emoji),
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id, name, slug, emoji, sort_order, (retired_at IS NOT NULL)::boolean AS retired;

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
RETURNING id, name, slug, emoji, sort_order, (retired_at IS NOT NULL)::boolean AS retired;

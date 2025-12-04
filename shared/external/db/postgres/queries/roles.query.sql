-- -------------------------------
-- 1. Create a role
-- -------------------------------
-- name: CreateRole :one
INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *;

-- -------------------------------
-- 2. Get role by name
-- -------------------------------
-- name: GetRoleByName :one
SELECT * FROM roles WHERE name = $1;

-- -------------------------------
-- 3. List all roles
-- -------------------------------
-- name: ListRoles :many
SELECT * FROM roles ORDER BY name;

-- -------------------------------
-- 4. Update role
-- -------------------------------
-- name: UpdateRole :one
UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *;

-- -------------------------------
-- 5. Delete role
-- -------------------------------
-- name: DeleteRole :exec
DELETE FROM roles WHERE id = $1 RETURNING *;

-- -------------------------------
-- 6. Get all global roles for a user
-- -------------------------------
-- name: GetUserRoles :many
SELECT r.*
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = $1
  AND ur.deleted_at IS NULL
  AND r.deleted_at IS NULL;

-- -------------------------------
-- 7. Assign global role to a user
-- -------------------------------
-- name: AssignUserRole :one
INSERT INTO user_roles (user_id, role_id)
VALUES ($1, $2)
RETURNING *;

-- -------------------------------
-- 8. Remove global role from user (soft delete)
-- -------------------------------
-- name: RemoveUserRole :one
UPDATE user_roles
SET deleted_at = NOW()
WHERE user_id = $1 AND role_id = $2
RETURNING *;

-- -------------------------------
-- 9. Assign role to user in a channel
-- -------------------------------
-- name: AssignUserRoleInChannel :one
INSERT INTO channel_roles (channel_id, user_id, role_id)
VALUES ($1, $2, $3)
RETURNING *;

-- -------------------------------
-- 10. Remove role from user in a channel (soft delete)
-- -------------------------------
-- name: RemoveUserRoleInChannel :one
UPDATE channel_roles
SET deleted_at = NOW()
WHERE channel_id = $1 AND user_id = $2 AND role_id = $3
RETURNING *;

-- -------------------------------
-- 11. Get user's role in a channel
-- -------------------------------
-- name: GetChannelRolesForUser :many
SELECT r.*
FROM channel_roles cr
JOIN roles r ON cr.role_id = r.id
JOIN channel_members cm ON cm.channel_id = cr.channel_id AND cm.user_id = $2
WHERE cr.channel_id = $1
  AND cr.deleted_at IS NULL;

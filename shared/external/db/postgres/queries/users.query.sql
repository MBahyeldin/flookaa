-- -------------------------------
-- 1. Create a new user
-- -------------------------------
-- name: CreateUser :one
INSERT INTO users (first_name, last_name, email_address, hashed_password, oauth_provider, thumbnail, is_verified, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
RETURNING *;

-- -------------------------------
-- 2.0 Get User HashedPassword by email for authentication
-- -------------------------------
-- name: GetUserHashedPasswordByEmail :one
SELECT id, email_address, hashed_password FROM users WHERE email_address = $1 LIMIT 1;

-- -------------------------------
-- 2.1 Get User by email and provider
-- -------------------------------
-- name: GetUserByEmailAddress :one
SELECT * FROM users WHERE email_address = $1 AND deleted_at IS NULL LIMIT 1;

-- -------------------------------
-- 3. Update user details
-- -------------------------------
-- name: UpdateUser :one
UPDATE users
SET 
    first_name = COALESCE($1, first_name),
    last_name = COALESCE($2, last_name),
    email_address = COALESCE($3, email_address),
    hashed_password = COALESCE($4, hashed_password),
    thumbnail = COALESCE($5, thumbnail),
    is_verified = COALESCE($6, is_verified),
    city_id = COALESCE($7, city_id),
    country_id = COALESCE($8, country_id),
    state_id = COALESCE($9, state_id),
    postal_code = COALESCE($10, postal_code),
    other_platforms_accounts = COALESCE($11, other_platforms_accounts),
    onboarding_completed = COALESCE($12, onboarding_completed),
    onboarding_step = COALESCE($13, onboarding_step),
    updated_at = now()
WHERE id = $14
RETURNING 
    id,
    first_name,
    last_name,
    email_address,
    updated_at,
    thumbnail,
    is_verified,
    city_id,
    state_id,
    country_id,
    postal_code,
    other_platforms_accounts,
    onboarding_completed,
    onboarding_step;

-- -------------------------------
-- 4. Verify user email
-- -------------------------------
-- name: VerifyUserEmail :one
UPDATE users
SET is_verified = TRUE,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- -------------------------------
-- 5. Reset user password
-- -------------------------------
-- name: ResetUserPassword :one
UPDATE users
SET hashed_password = $1,
    updated_at = NOW()
WHERE id = $2
RETURNING *;

-- -------------------------------
-- 6. Search users by name
-- -------------------------------
-- name: SearchUsersByName :many
SELECT *
FROM users
WHERE (first_name ILIKE '%' || $1 || '%'
       OR last_name ILIKE '%' || $1 || '%')
  AND deleted_at IS NULL
ORDER BY first_name, last_name
LIMIT $2 OFFSET $3;


-- -------------------------------
-- 7. Get user profile
-- -------------------------------
-- name: GetUserProfile :one
SELECT u.*
FROM users u
WHERE u.id = $1
  AND u.deleted_at IS NULL;


-- -------------------------------
-- 7. Get User Basic Info
-- -------------------------------
-- name: GetUserBasicInfo :one
SELECT u.id, u.first_name, u.last_name, u.email_address, u.is_verified, u.thumbnail, u.created_at, u.updated_at
FROM users u
WHERE u.id = $1
  AND u.deleted_at IS NULL;

-- -------------------------------
-- 12. Resolve User By ID
-- -------------------------------
-- name: ResolveUserByID :one
SELECT id, first_name, last_name, email_address, thumbnail 
FROM users 
WHERE id = $1 
AND deleted_at IS NULL LIMIT 1;

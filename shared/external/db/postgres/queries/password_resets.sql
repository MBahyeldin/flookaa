-- name: GetUserForPasswordReset :one
SELECT id, email_address, hashed_password
FROM users
WHERE email_address = $1
  AND deleted_at IS NULL
LIMIT 1;

-- name: LockUserForPasswordReset :one
SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;

-- name: GetPasswordResetWait :one
SELECT GREATEST(
         COALESCE(CEIL(EXTRACT(EPOCH FROM (MAX(created_at) + interval '1 minute' - now()))), 0),
         0
       )::int AS wait_seconds
FROM password_resets
WHERE user_id = $1;

-- name: UseOpenPasswordResets :exec
UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL;

-- name: InsertPasswordReset :exec
INSERT INTO password_resets (user_id, token_hash) VALUES ($1, $2);

-- name: GetLivePasswordReset :one
SELECT id, user_id
FROM password_resets
WHERE token_hash = $1
  AND used_at IS NULL
  AND expires_at > now();

-- name: LockLivePasswordReset :one
SELECT id, user_id
FROM password_resets
WHERE token_hash = $1
  AND used_at IS NULL
  AND expires_at > now()
FOR UPDATE;

-- name: SetUserPassword :exec
UPDATE users SET hashed_password = $2, updated_at = now() WHERE id = $1;

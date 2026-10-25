-- name: LockUserForEmailChange :one
SELECT id, email_address, hashed_password FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;

-- name: EmailTakenByOtherUser :one
SELECT EXISTS (
    SELECT 1 FROM users
    WHERE lower(email_address) = lower(sqlc.arg(email_address)::text)
      AND id <> sqlc.arg(user_id)
      AND deleted_at IS NULL
) AS taken;

-- name: GetEmailChangeResendWait :one
SELECT GREATEST(
         COALESCE(CEIL(EXTRACT(EPOCH FROM (MAX(created_at) + interval '1 minute' - now()))), 0),
         0
       )::int AS wait_seconds
FROM email_changes
WHERE user_id = $1;

-- name: ExpireOpenEmailChanges :exec
UPDATE email_changes
SET is_expired = TRUE
WHERE user_id = $1
  AND confirmed_at IS NULL
  AND is_expired = FALSE;

-- name: InsertEmailChange :one
INSERT INTO email_changes (user_id, new_email, code)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetLiveEmailChange :one
SELECT *
FROM email_changes
WHERE user_id = $1
  AND confirmed_at IS NULL
  AND is_expired = FALSE
  AND expires_at > now()
ORDER BY id DESC
LIMIT 1;

-- name: FailEmailChangeAttempt :one
UPDATE email_changes
SET failed_attempts = failed_attempts + 1,
    is_expired = (failed_attempts + 1 >= max_attempts)
WHERE id = $1
RETURNING failed_attempts, max_attempts, is_expired;

-- name: ConfirmEmailChange :exec
UPDATE email_changes SET confirmed_at = now() WHERE id = $1;

-- name: SetUserEmail :exec
UPDATE users SET email_address = $2, updated_at = now() WHERE id = $1;

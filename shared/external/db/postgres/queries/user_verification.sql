----------------------------------------------------------
-- SQL queries for user verification management
----------------------------------------------------------

-- -------------------------------
-- 1. Insert a new user verification record
-- -------------------------------
-- name: InsertUserVerification :one
INSERT INTO user_verifications (user_id, verification_code, last_sent_at)
VALUES ($1, $2, now())
RETURNING *;

-- -------------------------------
-- 2. Get active user verification by user ID
-- -------------------------------
-- name: GetActiveUserVerificationByUserID :one
SELECT *
FROM user_verifications
WHERE user_id = $1
  AND verified_at IS NULL
  AND is_expired = FALSE
  AND expires_at > now()
ORDER BY id DESC
LIMIT 1;

-- -------------------------------
-- 2a. Seconds left before the user can get a new code (0 = now)
-- -------------------------------
-- name: GetVerificationResendWait :one
SELECT GREATEST(
         COALESCE(CEIL(EXTRACT(EPOCH FROM (MAX(last_sent_at) + interval '1 minute' - now()))), 0),
         0
       )::int AS wait_seconds
FROM user_verifications
WHERE user_id = $1;

-- -------------------------------
-- 2b. Serialize code issuing per user
-- -------------------------------
-- name: LockUserForVerification :one
SELECT id, is_verified FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;

-- -------------------------------
-- 4. Increment failed attempts and expire if max attempts reached
-- -------------------------------
-- name: IncrementFailedAttemptsAndExpireIfMaxReached :one
UPDATE user_verifications
SET failed_attempts = failed_attempts + 1,
    is_expired = CASE
                   WHEN failed_attempts + 1 >= max_attempts THEN TRUE
                   ELSE is_expired
                 END
WHERE id = $1
RETURNING *;

-- -------------------------------
-- 5. Mark verification as verified
-- -------------------------------
-- name: MarkVerificationAsVerified :one
UPDATE user_verifications
SET verified_at = now()
WHERE id = $1
  AND verified_at IS NULL
RETURNING *;

-- -------------------------------
-- 6. Expire every open code of a user
-- -------------------------------
-- name: ExpireOpenUserVerifications :exec
UPDATE user_verifications
SET is_expired = TRUE
WHERE user_id = $1
  AND verified_at IS NULL
  AND is_expired = FALSE;

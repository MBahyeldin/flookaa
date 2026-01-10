----------------------------------------------------------
-- SQL queries for user verification management
----------------------------------------------------------

-- -------------------------------
-- 1. Insert a new user verification record
-- -------------------------------
-- name: InsertUserVerification :one
INSERT INTO user_verifications (user_id, verification_code)
VALUES ($1, $2)
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
  AND expires_at > now();

-- -------------------------------
-- 2a. Check if user can get a new verification code
-- -------------------------------
-- name: CanResendVerificationCode :one
SELECT CASE
         WHEN last_sent_at IS NULL THEN TRUE
         WHEN now() - last_sent_at >= interval '1 minute' THEN TRUE
         ELSE FALSE
       END AS can_resend
FROM user_verifications
WHERE user_id = $1
  AND verified_at IS NULL
  AND is_expired = FALSE
  AND expires_at > now();

-- -------------------------------
-- 3. Update verification code and reset failed attempts
-- -------------------------------
-- name: UpdateUserVerificationCode :one
UPDATE user_verifications
SET verification_code = $2,
    expires_at = (now() + interval '24 hours'),
    last_sent_at = now(),
    failed_attempts = 0,
    is_expired = FALSE
WHERE user_id = $1
  AND verified_at IS NULL
RETURNING *;

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
WHERE user_id = $1
  AND verified_at IS NULL
  AND is_expired = FALSE
  AND expires_at > now()
RETURNING *;

-- -------------------------------
-- 5. Mark verification as verified
-- -------------------------------
-- name: MarkVerificationAsVerified :one
UPDATE user_verifications
SET verified_at = now()
WHERE user_id = $1
  AND verification_code = $2
  AND verified_at IS NULL
  AND is_expired = FALSE
  AND expires_at > now()
RETURNING *;

-- -------------------------------
-- 6. Expire previous user verification
-- -------------------------------
-- name: ExpirePreviousUserVerification :one
UPDATE user_verifications
SET is_expired = TRUE
WHERE user_id = $1
  AND verified_at IS NULL
  AND is_expired = FALSE
RETURNING *;



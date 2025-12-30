-- ------------------------------
-- 1.GetDefaultPersonaByUserId
-- ------------------------------
-- name: GetDefaultPersonaByUserId :one
SELECT *
FROM personas
WHERE user_id = $1 AND is_default = TRUE
LIMIT 1;


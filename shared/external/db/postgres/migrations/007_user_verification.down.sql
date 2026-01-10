
BEGIN;
DROP INDEX IF EXISTS idx_user_verifications_user_id;
DROP INDEX IF EXISTS idx_user_verifications_active;
END;

BEGIN;
DROP TABLE IF EXISTS user_verifications;
END;

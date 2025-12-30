BEGIN;

-- =========================
-- 1. FOLLOWERS
-- =========================

DROP TABLE IF EXISTS persona_followers;

-- =========================
-- 2. FRIEND GROUPS
-- =========================

DROP TABLE IF EXISTS persona_friend_group_members;
DROP TABLE IF EXISTS persona_friend_groups;

-- =========================
-- 3. RELATIONSHIPS
-- =========================

DROP TABLE IF EXISTS persona_relationships;

-- =========================
-- 4. INTERESTS
-- =========================

DROP TABLE IF EXISTS persona_interests;
DROP TABLE IF EXISTS interests;

-- =========================
-- 5. PERSONAS
-- =========================

DROP TABLE IF EXISTS personas;

-- =========================
-- 6. ENUM TYPES
-- =========================

DROP TYPE IF EXISTS relationship_enum;
DROP TYPE IF EXISTS persona_privacy_enum;
-- =========================
-- 7. UNIQUE DEFAULT PERSONA PER USER
-- =========================
DROP INDEX IF EXISTS uniq_default_persona_per_user;

COMMIT;

BEGIN;
DROP FUNCTION IF EXISTS create_default_persona();
DROP TRIGGER IF EXISTS trg_create_default_persona ON users;
END;


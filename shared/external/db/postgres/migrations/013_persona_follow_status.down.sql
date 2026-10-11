-- Reverse 013_persona_follow_status --

ALTER TABLE persona_followers DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS persona_follow_status_enum;

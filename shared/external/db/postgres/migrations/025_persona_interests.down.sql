DROP INDEX IF EXISTS persona_interests_interest_id_idx;

ALTER TABLE persona_interests DROP COLUMN IF EXISTS created_at;

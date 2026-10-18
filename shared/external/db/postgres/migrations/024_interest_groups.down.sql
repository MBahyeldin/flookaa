-- Interest groups --

DROP INDEX IF EXISTS interests_group_id_idx;
ALTER TABLE interests DROP COLUMN IF EXISTS group_id;
DROP TABLE IF EXISTS interest_groups;

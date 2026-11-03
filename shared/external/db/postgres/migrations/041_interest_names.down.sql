DROP INDEX IF EXISTS interest_groups_name_ar_key;
ALTER TABLE interest_groups DROP COLUMN IF EXISTS name_ar;
ALTER INDEX interest_groups_name_en_lower_key RENAME TO interest_groups_name_lower_key;
ALTER TABLE interest_groups RENAME COLUMN name_en TO name;

DROP INDEX IF EXISTS interests_name_ar_key;
ALTER TABLE interests DROP COLUMN IF EXISTS name_ar;
ALTER INDEX interests_name_en_lower_key RENAME TO interests_name_lower_key;
ALTER TABLE interests RENAME COLUMN name_en TO name;

-- Display names per language; slug stays the id --

ALTER TABLE interests RENAME COLUMN name TO name_en;
ALTER INDEX interests_name_lower_key RENAME TO interests_name_en_lower_key;
ALTER TABLE interests ADD COLUMN name_ar VARCHAR(100);
CREATE UNIQUE INDEX interests_name_ar_key ON interests (name_ar) WHERE name_ar IS NOT NULL;

ALTER TABLE interest_groups RENAME COLUMN name TO name_en;
ALTER INDEX interest_groups_name_lower_key RENAME TO interest_groups_name_en_lower_key;
ALTER TABLE interest_groups ADD COLUMN name_ar VARCHAR(100);
CREATE UNIQUE INDEX interest_groups_name_ar_key ON interest_groups (name_ar) WHERE name_ar IS NOT NULL;

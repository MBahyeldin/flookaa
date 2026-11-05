DROP FUNCTION IF EXISTS channel_theme(theme_enum, BIGINT);
ALTER TABLE channels DROP COLUMN IF EXISTS theme, DROP COLUMN IF EXISTS cover_pattern;
ALTER TABLE communities DROP COLUMN IF EXISTS theme, DROP COLUMN IF EXISTS cover_pattern;
DROP TYPE IF EXISTS cover_pattern_enum;
ALTER TYPE theme_enum RENAME TO persona_theme_enum;

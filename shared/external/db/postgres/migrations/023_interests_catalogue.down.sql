-- Interests catalogue --

DROP INDEX IF EXISTS interests_name_lower_key;

ALTER TABLE interests
    DROP CONSTRAINT IF EXISTS interests_slug_key,
    DROP COLUMN IF EXISTS slug,
    DROP COLUMN IF EXISTS emoji,
    DROP COLUMN IF EXISTS sort_order,
    DROP COLUMN IF EXISTS retired_at,
    ALTER COLUMN created_at DROP NOT NULL,
    ALTER COLUMN updated_at DROP NOT NULL,
    ADD COLUMN pic_url VARCHAR(255),
    ADD COLUMN deleted_at TIMESTAMP WITHOUT TIME ZONE,
    ADD CONSTRAINT interests_name_key UNIQUE (name);

-- Interests become the admin-managed catalogue --

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM interests) THEN
        RAISE EXCEPTION 'interests is not empty; give existing rows a slug and emoji first';
    END IF;
END $$;

ALTER TABLE interests
    DROP CONSTRAINT IF EXISTS interests_name_key,
    DROP COLUMN pic_url,
    DROP COLUMN deleted_at,
    ADD COLUMN slug VARCHAR(50) NOT NULL,
    ADD COLUMN emoji VARCHAR(32) NOT NULL,
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
    ADD COLUMN retired_at TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL,
    ADD CONSTRAINT interests_slug_key UNIQUE (slug);

CREATE UNIQUE INDEX interests_name_lower_key ON interests (lower(name));

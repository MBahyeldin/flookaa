-- Reverse 014_persona_show_on_profile --

ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_show_on_profile_public;
ALTER TABLE personas DROP COLUMN IF EXISTS show_on_profile;

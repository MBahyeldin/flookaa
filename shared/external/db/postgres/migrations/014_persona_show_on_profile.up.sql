-- Persona show on profile --

ALTER TABLE personas
    ADD COLUMN show_on_profile BOOLEAN NOT NULL DEFAULT false;

-- Only a public persona may be linked to its user's profile.
ALTER TABLE personas
    ADD CONSTRAINT personas_show_on_profile_public CHECK (NOT show_on_profile OR privacy = 'public');

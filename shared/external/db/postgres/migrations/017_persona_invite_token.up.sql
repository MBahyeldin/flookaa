-- Persona invite token --

ALTER TABLE personas ADD COLUMN invite_token TEXT;

CREATE UNIQUE INDEX personas_invite_token_key ON personas (invite_token) WHERE invite_token IS NOT NULL;

-- Only a private persona shares a follow-request link.
ALTER TABLE personas
    ADD CONSTRAINT personas_invite_token_private CHECK (invite_token IS NULL OR privacy = 'private');

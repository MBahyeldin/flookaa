ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_invite_token_private;
DROP INDEX IF EXISTS personas_invite_token_key;
ALTER TABLE personas DROP COLUMN IF EXISTS invite_token;

-- Channel visibility, membership requests, and multiple moderators per channel --

-- Public channels are readable by every persona; private ones by active members only.
CREATE TYPE channel_visibility_enum AS ENUM ('public', 'private');
ALTER TABLE channels
    ADD COLUMN visibility channel_visibility_enum NOT NULL DEFAULT 'public';

-- Joining a private channel creates a pending row that a moderator approves or rejects.
-- Only 'active' rows count as membership. Existing rows are memberships already.
CREATE TYPE channel_membership_status_enum AS ENUM ('pending', 'active', 'rejected');
ALTER TABLE channel_members
    ADD COLUMN status channel_membership_status_enum NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_channel_members_channel_persona
    ON channel_members (channel_id, persona_id)
    WHERE left_at IS NULL;

-- The old key (channel_id, role_id) allowed only one persona per role per channel.
ALTER TABLE channel_roles DROP CONSTRAINT channel_roles_pkey;
ALTER TABLE channel_roles ADD PRIMARY KEY (channel_id, persona_id, role_id);

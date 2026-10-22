-- Persona follow status --

CREATE TYPE persona_follow_status_enum AS ENUM ('pending', 'active', 'rejected');

-- No default: a forgotten status must fail, not approve a follower.
ALTER TABLE persona_followers
    ADD COLUMN status persona_follow_status_enum NOT NULL;

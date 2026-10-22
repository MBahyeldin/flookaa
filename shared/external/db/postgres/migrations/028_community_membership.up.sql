-- Community membership and following --

CREATE TYPE community_membership_status_enum AS ENUM ('pending', 'active', 'rejected');

-- One row per pair: leaving sets left_at, joining again revives the row.
CREATE TABLE community_members (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    status community_membership_status_enum NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    left_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (community_id, persona_id)
);

CREATE INDEX community_members_persona_id_idx ON community_members (persona_id);

CREATE TABLE community_followers (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    unfollowed_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (community_id, persona_id)
);

CREATE INDEX community_followers_persona_id_idx ON community_followers (persona_id);

INSERT INTO community_members (community_id, persona_id, status, joined_at, resolved_at)
SELECT id, owner_id, 'active', created_at, created_at
FROM communities
ON CONFLICT DO NOTHING;

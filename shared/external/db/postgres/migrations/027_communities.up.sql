-- Communities --

CREATE TYPE community_visibility_enum AS ENUM ('public', 'private');

CREATE TABLE communities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    -- Unique across deleted rows too, so an old link never points at another community.
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    thumbnail VARCHAR(255) NOT NULL DEFAULT '',
    banner VARCHAR(255) NOT NULL DEFAULT '',
    visibility community_visibility_enum NOT NULL DEFAULT 'public',
    owner_id BIGINT NOT NULL REFERENCES personas(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE community_interests (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    interest_id BIGINT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (community_id, interest_id)
);

CREATE INDEX community_interests_interest_id_idx ON community_interests (interest_id);

CREATE TABLE community_channels (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL UNIQUE REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX community_channels_community_id_idx ON community_channels (community_id);

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
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    rules TEXT NOT NULL DEFAULT '',
    min_age SMALLINT NOT NULL CHECK (min_age IN (13, 16, 18, 21)),
    theme theme_enum NOT NULL DEFAULT 'tide',
    cover_pattern cover_pattern_enum NOT NULL DEFAULT 'horizon'
);

CREATE TABLE community_interests (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    interest_id BIGINT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (community_id, interest_id)
);

CREATE INDEX community_interests_interest_id_idx ON community_interests (interest_id);

CREATE TYPE community_channel_status_enum AS ENUM ('pending', 'active', 'rejected');

-- One row per pair: a channel's history with each community.
CREATE TABLE community_channels (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    status community_channel_status_enum NOT NULL,
    requested_by BIGINT REFERENCES personas(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    removed_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (community_id, channel_id)
);

CREATE INDEX community_channels_community_id_idx ON community_channels (community_id);

-- A channel is in one community or has one pending request, never both.
CREATE UNIQUE INDEX community_channels_live_channel_idx ON community_channels (channel_id)
    WHERE status IN ('pending', 'active') AND removed_at IS NULL;

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

-- The owner has no row here: ownership is communities.owner_id.
CREATE TABLE community_roles (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (community_id, persona_id, role_id)
);

CREATE INDEX community_roles_persona_id_idx ON community_roles (persona_id);

CREATE FUNCTION channel_theme(p_theme theme_enum, p_channel_id BIGINT) RETURNS theme_enum
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        p_theme,
        (
            SELECT co.theme
            FROM community_channels cc
            JOIN communities co ON co.id = cc.community_id
            WHERE cc.channel_id = p_channel_id
              AND cc.status = 'active' AND cc.removed_at IS NULL
              AND co.deleted_at IS NULL
        ),
        'tide'::theme_enum
    )
$$;

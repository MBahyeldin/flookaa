
CREATE TYPE theme_enum AS ENUM ('tide', 'forest', 'ember', 'plum', 'rose', 'slate');

CREATE TYPE cover_pattern_enum AS ENUM ('horizon', 'waves', 'hills', 'stripes');

CREATE TYPE channel_visibility_enum AS ENUM ('public', 'private');

CREATE TYPE channel_membership_status_enum AS ENUM ('pending', 'active', 'rejected');

-- -------------------------------
-- 4. Channels Table
-- -------------------------------
CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    thumbnail VARCHAR(255) NOT NULL,
    banner VARCHAR(255) NOT NULL,
    owner_id BIGINT REFERENCES personas(id) ON DELETE SET NULL NOT NULL,
    visibility channel_visibility_enum NOT NULL DEFAULT 'public',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP,
    min_age SMALLINT NOT NULL CHECK (min_age IN (13, 16, 18, 21)),
    -- NULL: the channel takes its community's.
    theme theme_enum,
    cover_pattern cover_pattern_enum NOT NULL DEFAULT 'horizon'
);

-- -------------------------------
-- 5. Join Table: channel_roles
-- -------------------------------
CREATE TABLE channel_roles (
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (channel_id, persona_id, role_id),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- -------------------------------
-- 6. Join Channel Members Table
-- -------------------------------
CREATE TABLE channel_members (
    id SERIAL PRIMARY KEY,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    left_at TIMESTAMP WITHOUT TIME ZONE,
    status channel_membership_status_enum NOT NULL DEFAULT 'active'
);

-- -------------------------------
-- 7. Join Channel Followers Table
-- -------------------------------
CREATE TABLE channel_followers (
    id SERIAL PRIMARY KEY,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE NOT NULL,
    followed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    unfollowed_at TIMESTAMP WITHOUT TIME ZONE
);

-- -------------------------------
-- 8. Post References Table
-- -------------------------------
CREATE TABLE post_references (
    id SERIAL PRIMARY KEY,
    mongo_id CHAR(24) NOT NULL,   -- Mongo ObjectId as string
    owner_type VARCHAR(10) NOT NULL CHECK (owner_type IN ('PERSONA','CHANNEL')),
    owner_id BIGINT NOT NULL,         -- references Persona.id, channels.id
    created_at TIMESTAMP DEFAULT now()
);
-- -------------------------------
-- Channel interests
-- -------------------------------
CREATE TABLE channel_interests (
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    interest_id BIGINT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (channel_id, interest_id)
);

CREATE INDEX channel_interests_interest_id_idx ON channel_interests (interest_id);

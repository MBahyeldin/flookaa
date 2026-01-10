
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
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

-- -------------------------------
-- 5. Join Table: channel_roles
-- -------------------------------
CREATE TABLE channel_roles (
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (channel_id, role_id),
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
    left_at TIMESTAMP WITHOUT TIME ZONE
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
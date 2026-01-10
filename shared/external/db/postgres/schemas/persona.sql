
CREATE TYPE persona_privacy_enum AS ENUM (
    'public',
    'private',
    'only_me'
);
   

CREATE TYPE relationship_enum AS ENUM (
    'follower',
    'blocked',
    'muted'
);
   
-- =========================
-- 2. PERSONAS
-- =========================
CREATE TABLE personas (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL Default 'Default',
    description TEXT NOT NULL DEFAULT '',

    slug VARCHAR(50) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(255),
    bio TEXT,

    privacy persona_privacy_enum NOT NULL DEFAULT 'public',
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,

    UNIQUE (user_id, slug)
);


-- =========================
-- 3. INTERESTS
-- =========================

CREATE TABLE interests (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    pic_url VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE persona_interests (
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,
    interest_id BIGINT REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (persona_id, interest_id)
);

-- =========================
-- 4. PERSONA RELATIONSHIPS
-- =========================

CREATE TABLE persona_relationships (
    source_persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,
    target_persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,

    relationship relationship_enum NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,

    PRIMARY KEY (source_persona_id, target_persona_id)
);

-- =========================
-- 5. FRIEND GROUPS
-- =========================

CREATE TABLE persona_friend_groups (
    id BIGSERIAL PRIMARY KEY,
    owner_persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE 
);

CREATE TABLE persona_friend_group_members (
    group_id BIGINT REFERENCES persona_friend_groups(id) ON DELETE CASCADE,
    member_persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, member_persona_id)
);

-- =========================
-- 6. FOLLOWERS
-- =========================

CREATE TABLE persona_followers (
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,
    follower_persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,

    followed_at TIMESTAMPTZ DEFAULT now(),
    unfollowed_at TIMESTAMPTZ,

    PRIMARY KEY (persona_id, follower_persona_id)
);

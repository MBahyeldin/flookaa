BEGIN;

-- =========================
-- 1. ENUM TYPES
-- =========================

CREATE TYPE persona_privacy_enum AS ENUM (
    'public',
    'friends_only',
    'group_of_friends',
    'only_me'
);

CREATE TYPE relationship_enum AS ENUM (
    'friend',
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

CREATE INDEX idx_personas_user_id ON personas(user_id);

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

CREATE INDEX idx_persona_relationships_target
ON persona_relationships(target_persona_id, relationship);

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

CREATE INDEX idx_persona_followers_persona_id
ON persona_followers(persona_id);



-- =========================
-- 7. Trigger: Auto-create Default Persona on User Insertion
-- =========================
CREATE OR REPLACE FUNCTION create_default_persona()
RETURNS trigger AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    slug_counter INT := 0;
BEGIN
    -- Build base slug: firstname-lastname
    base_slug := lower(
        regexp_replace(
            trim(NEW.first_name || '-' || NEW.last_name),
            '[^a-zA-Z0-9\-]+',
            '-',
            'g'
        )
    );

    final_slug := base_slug;

    -- Ensure slug uniqueness per user (extra safe)
    WHILE EXISTS (
        SELECT 1
        FROM personas
        WHERE user_id = NEW.id
          AND slug = final_slug
    ) LOOP
        slug_counter := slug_counter + 1;
        final_slug := base_slug || '-' || slug_counter;
    END LOOP;

    INSERT INTO personas (
        user_id,
        slug,
        first_name,
        last_name,
        bio,
        thumbnail,
        privacy,
        is_default,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        final_slug,
        NEW.first_name,
        NEW.last_name,
        '',
        NEW.thumbnail,
        'public',
        TRUE,
        now(),
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_persona
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_persona();


-- =========================
-- 8. UNIQUE DEFAULT PERSONA PER USER
-- =========================
CREATE UNIQUE INDEX uniq_default_persona_per_user
ON personas(user_id)
WHERE is_default = TRUE;

COMMIT;
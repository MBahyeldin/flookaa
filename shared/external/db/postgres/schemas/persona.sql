
CREATE TYPE persona_privacy_enum AS ENUM (
    'public',
    'private',
    'only_me'
);

   

CREATE TYPE persona_follow_status_enum AS ENUM (
    'pending',
    'active',
    'rejected'
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
    is_default BOOLEAN DEFAULT false,
    show_on_profile BOOLEAN NOT NULL DEFAULT false,
    theme theme_enum NOT NULL DEFAULT 'tide',
    cover_pattern cover_pattern_enum NOT NULL DEFAULT 'waves',

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    invite_token TEXT,

    UNIQUE (user_id, slug),
    CONSTRAINT personas_show_on_profile_public CHECK (NOT show_on_profile OR privacy = 'public'),
    CONSTRAINT personas_invite_token_private CHECK (invite_token IS NULL OR privacy = 'private')
);

CREATE UNIQUE INDEX personas_invite_token_key ON personas (invite_token) WHERE invite_token IS NOT NULL;


-- =========================
-- 3. INTERESTS
-- =========================

CREATE TABLE interest_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT interest_groups_slug_key UNIQUE (slug)
);

CREATE UNIQUE INDEX interest_groups_name_lower_key ON interest_groups (lower(name));

CREATE TABLE interests (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    emoji VARCHAR(32) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    retired_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    group_id BIGINT REFERENCES interest_groups(id)
);

CREATE UNIQUE INDEX interests_name_lower_key ON interests (lower(name));
CREATE INDEX interests_group_id_idx ON interests (group_id);

CREATE TABLE persona_interests (
    persona_id BIGINT REFERENCES personas(id) ON DELETE CASCADE,
    interest_id BIGINT REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (persona_id, interest_id)
);

CREATE INDEX persona_interests_interest_id_idx ON persona_interests (interest_id);

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

    status persona_follow_status_enum NOT NULL,

    followed_at TIMESTAMPTZ DEFAULT now(),
    unfollowed_at TIMESTAMPTZ,

    PRIMARY KEY (persona_id, follower_persona_id)
);

CREATE TYPE persona_invitation_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

CREATE TABLE persona_follow_invitations (
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    invitee_persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    status persona_invitation_status_enum NOT NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (persona_id, invitee_persona_id),
    CHECK (persona_id <> invitee_persona_id)
);

CREATE INDEX persona_follow_invitations_invitee
    ON persona_follow_invitations (invitee_persona_id) WHERE status = 'pending';

-- Whether a viewer sees the real persona; missing or deleted personas never are.
CREATE FUNCTION persona_visible_to(p_target BIGINT, p_viewer BIGINT) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT COALESCE((
        SELECT
            t.privacy = 'public'
            OR t.user_id = (SELECT v.user_id FROM personas v WHERE v.id = p_viewer)
            OR (t.privacy = 'private' AND EXISTS (
                SELECT 1
                FROM persona_followers pf
                WHERE pf.persona_id = t.id
                  AND pf.follower_persona_id = p_viewer
                  AND pf.status = 'active'
                  AND pf.unfollowed_at IS NULL
            ))
            -- A pending invitation shows the inviter to the invitee.
            OR (t.privacy = 'private' AND EXISTS (
                SELECT 1
                FROM persona_follow_invitations i
                WHERE i.persona_id = t.id
                  AND i.invitee_persona_id = p_viewer
                  AND i.status = 'pending'
            ))
            -- Following someone (or asking to) shows you to them.
            OR EXISTS (
                SELECT 1
                FROM persona_followers pf
                WHERE pf.persona_id = p_viewer
                  AND pf.follower_persona_id = t.id
                  AND pf.status IN ('pending', 'active')
                  AND pf.unfollowed_at IS NULL
            )
        FROM personas t
        WHERE t.id = p_target AND t.deleted_at IS NULL
    ), false)
$$;

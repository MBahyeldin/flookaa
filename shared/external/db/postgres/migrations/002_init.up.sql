-- -------------------------------
-- 1. Roles Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITHOUT TIME ZONE
);


CREATE TYPE oauth_provider AS ENUM ('google', 'github', 'linkedin');
-- -------------------------------
-- 2. Users Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    email_address VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    hashed_password VARCHAR(255),
    thumbnail VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    bio TEXT,
    postal_code VARCHAR(50),
    other_platforms_accounts TEXT[],
    country_id BIGINT REFERENCES countries(id),
    state_id BIGINT REFERENCES states(id),
    city_id BIGINT REFERENCES cities(id),
    oauth_provider oauth_provider
);

-- Ensure that either hashed_password or oauth_provider is set, but not both
ALTER TABLE users
ADD CONSTRAINT users_auth_method_check CHECK (
    (hashed_password IS NOT NULL AND oauth_provider IS NULL)
 OR (hashed_password IS NULL AND oauth_provider IS NOT NULL)
);

-- -------------------------------
-- 3. Join Table: user_roles
-- -------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- -------------------------------
-- 4. Channels Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS channels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    thumbnail VARCHAR(255) NOT NULL,
    banner VARCHAR(255) NOT NULL,
    owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

-- -------------------------------
-- 5. Join Table: channel_roles
-- -------------------------------
CREATE TABLE IF NOT EXISTS channel_roles (
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (channel_id, role_id),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- -------------------------------
-- 6. Join Channel Members Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS channel_members (
    id SERIAL PRIMARY KEY,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    left_at TIMESTAMP WITHOUT TIME ZONE
);

-- -------------------------------
-- 7. Join Channel Followers Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS channel_followers (
    id SERIAL PRIMARY KEY,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    followed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    unfollowed_at TIMESTAMP WITHOUT TIME ZONE
);

-- -------------------------------
-- 8. Post References Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS post_references (
    id SERIAL PRIMARY KEY,
    mongo_id CHAR(24) NOT NULL,   -- Mongo ObjectId as string
    owner_type VARCHAR(10) NOT NULL CHECK (owner_type IN ('user','channel','page')),
    owner_id BIGINT NOT NULL,         -- references users.id, channels.id, or pages.id
    created_at TIMESTAMP DEFAULT now()
);


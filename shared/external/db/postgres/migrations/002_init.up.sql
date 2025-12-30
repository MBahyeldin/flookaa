CREATE TYPE oauth_provider AS ENUM ('google', 'github', 'linkedin');
-- -------------------------------
-- 2. Users Table
-- -------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email_address VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    hashed_password VARCHAR(255),
    thumbnail VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
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





CREATE TYPE oauth_provider
AS ENUM ('google', 'github', 'linkedin');

CREATE TYPE gender_enum
AS ENUM ('male', 'female');


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
    is_verified BOOLEAN DEFAULT false,
    postal_code VARCHAR(50),
    other_platforms_accounts TEXT[],
    country_id BIGINT REFERENCES countries(id),
    state_id BIGINT REFERENCES states(id),
    city_id BIGINT REFERENCES cities(id),
    oauth_provider oauth_provider,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    onboarding_step INTEGER NOT NULL DEFAULT 0,
    date_of_birth DATE CHECK (date_of_birth >= DATE '1900-01-01'),
    gender gender_enum
);

-- A user without a date of birth never meets a limit.
CREATE FUNCTION persona_meets_min_age(p_persona_id BIGINT, p_min_age SMALLINT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM personas p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = p_persona_id
          AND u.date_of_birth <= ((now() AT TIME ZONE 'UTC')::date - make_interval(years => p_min_age))::date
    )
$$;

-- Age-restricted communities and channels --

ALTER TABLE communities ADD COLUMN min_age SMALLINT;
ALTER TABLE channels ADD COLUMN min_age SMALLINT;

UPDATE communities SET min_age = 13;
UPDATE channels SET min_age = 13;

-- No default: every insert states it.
ALTER TABLE communities
    ALTER COLUMN min_age SET NOT NULL,
    ADD CONSTRAINT communities_min_age_check CHECK (min_age IN (13, 16, 18, 21));
ALTER TABLE channels
    ALTER COLUMN min_age SET NOT NULL,
    ADD CONSTRAINT channels_min_age_check CHECK (min_age IN (13, 16, 18, 21));

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

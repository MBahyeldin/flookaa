
CREATE TABLE IF NOT EXISTS user_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    verification_code VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    failed_attempts INT DEFAULT 0 NOT NULL,
    max_attempts INT DEFAULT 5 NOT NULL,
    last_sent_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    is_expired BOOLEAN DEFAULT false
);

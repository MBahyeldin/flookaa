
CREATE TABLE IF NOT EXISTS user_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    verification_code VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    failed_attempts INT DEFAULT 0 NOT NULL,
    max_attempts INT DEFAULT 5 NOT NULL,
    last_sent_at TIMESTAMP WITHOUT TIME ZONE,
    verified_at TIMESTAMP WITHOUT TIME ZONE,
    is_expired BOOLEAN DEFAULT FALSE
);

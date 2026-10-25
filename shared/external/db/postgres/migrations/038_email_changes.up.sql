-- A pending change of a user's email, confirmed by a code sent to the new address.
CREATE TABLE email_changes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_email VARCHAR(255) NOT NULL,
    code VARCHAR(16) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
    confirmed_at TIMESTAMPTZ,
    is_expired BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX email_changes_user ON email_changes (user_id);

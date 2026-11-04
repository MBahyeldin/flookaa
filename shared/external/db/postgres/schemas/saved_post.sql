CREATE TABLE saved_posts (
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    post_id VARCHAR(255) NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsaved_at TIMESTAMPTZ,
    PRIMARY KEY (persona_id, post_id)
);

CREATE INDEX saved_posts_list ON saved_posts (persona_id, saved_at DESC, post_id DESC) WHERE unsaved_at IS NULL;

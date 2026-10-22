-- Channel interests --

CREATE TABLE channel_interests (
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    interest_id BIGINT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (channel_id, interest_id)
);

CREATE INDEX channel_interests_interest_id_idx ON channel_interests (interest_id);

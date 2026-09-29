
CREATE TYPE notification_kind_enum AS ENUM (
    'post_comment',
    'comment_reply',
    'post_like',
    'comment_like',
    'join_request',
    'request_approved',
    'removed_from_channel'
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    kind notification_kind_enum NOT NULL,
    group_key varchar(255) NOT NULL,
    object_id varchar(255) NULL,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    actor_id BIGINT NULL REFERENCES personas(id) ON DELETE SET NULL,
    last_event_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL,
    UNIQUE (recipient_id, group_key)
);

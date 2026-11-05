
CREATE TYPE notification_kind_enum AS ENUM (
    'post_comment',
    'comment_reply',
    'post_like',
    'comment_like',
    'join_request',
    'request_approved',
    'removed_from_channel',
    'new_follower',
    'follow_request',
    'follow_request_approved',
    'follow_invitation',
    'follow_invitation_accepted',
    'channel_request',
    'channel_request_approved',
    'channel_request_rejected',
    'community_join_request',
    'community_request_approved',
    'community_request_rejected'
);

CREATE TYPE notification_subject_enum AS ENUM ('POST', 'COMMENT', 'CHANNEL', 'PERSONA', 'COMMUNITY');

CREATE TYPE notification_scope_enum AS ENUM ('CHANNEL', 'PERSONA');

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    kind notification_kind_enum NOT NULL,
    group_key varchar(255) NOT NULL,
    subject_type notification_subject_enum NOT NULL,
    subject_id varchar(255) NOT NULL,
    scope_type notification_scope_enum NULL,
    scope_id BIGINT NULL,
    actor_id BIGINT NULL REFERENCES personas(id) ON DELETE SET NULL,
    data JSONB NULL,
    last_event_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL,
    UNIQUE (recipient_id, group_key),
    CHECK ((scope_type IS NULL) = (scope_id IS NULL))
);

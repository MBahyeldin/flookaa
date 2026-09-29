-- Notifications, one row per recipient and thing --

-- group_key identifies the thing ("post_like:<post_id>", "join_request:<channel_id>"),
-- so repeated activity on it updates one row instead of adding rows. Counts
-- and latest actors of aggregated kinds are recounted from events and
-- channel_members at read time, never stored.
CREATE TYPE notification_kind_enum AS ENUM (
    'post_comment',
    'comment_reply',
    'post_like',
    'comment_like',
    'join_request',
    'request_approved',
    'removed_from_channel'
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    kind notification_kind_enum NOT NULL,
    group_key varchar(255) NOT NULL,
    -- The post or comment it is about; NULL for channel membership kinds.
    object_id varchar(255) NULL,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    -- Who acted, for single-actor kinds (request_approved, removed_from_channel).
    actor_id BIGINT NULL REFERENCES personas(id) ON DELETE SET NULL,
    -- Timestamp of the newest event applied. Older (replayed or redelivered)
    -- events are ignored, so they cannot mark a read row unread again.
    last_event_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL,
    UNIQUE (recipient_id, group_key)
);

-- A persona's list, newest first, paged by (updated_at, id).
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_feed
    ON notifications (recipient_id, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL;

-- Unread badge.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON notifications (recipient_id)
    WHERE deleted_at IS NULL AND read_at IS NULL;

-- Removing a group (join requests fan out to several recipients).
CREATE INDEX IF NOT EXISTS idx_notifications_group_active
    ON notifications (group_key)
    WHERE deleted_at IS NULL;

-- Removing everything about a deleted post or comment.
CREATE INDEX IF NOT EXISTS idx_notifications_object_active
    ON notifications (object_id)
    WHERE deleted_at IS NULL;

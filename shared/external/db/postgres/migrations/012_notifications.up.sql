-- Notifications, one row per recipient and thing --

-- A notification says what it is about (subject) and, separately, whose
-- access rule decides whether the recipient may see it (scope; NULL means
-- personal, always visible). Nothing here is tied to channels: channels are
-- one scope among future ones (persona walls, pages, ...).
--
-- group_key identifies the thing ("post_like:<post_id>", "join_request:<channel_id>"),
-- so repeated activity on it updates one row instead of adding rows. Counts
-- and latest actors of aggregated kinds are recounted from their source
-- tables at read time, never stored.
--
-- Adding a kind or type: ALTER TYPE ... ADD VALUE in its own migration (a new
-- value can't be used in the transaction that adds it).
CREATE TYPE notification_kind_enum AS ENUM (
    'post_comment',
    'comment_reply',
    'post_like',
    'comment_like',
    'join_request',
    'request_approved',
    'removed_from_channel'
);

-- What a notification is about.
CREATE TYPE notification_subject_enum AS ENUM ('POST', 'COMMENT', 'CHANNEL', 'PERSONA');

-- Whose access rule decides visibility. Only channels have rules today.
CREATE TYPE notification_scope_enum AS ENUM ('CHANNEL');

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    kind notification_kind_enum NOT NULL,
    group_key varchar(255) NOT NULL,
    subject_type notification_subject_enum NOT NULL,
    subject_id varchar(255) NOT NULL,
    scope_type notification_scope_enum NULL,
    scope_id BIGINT NULL,
    actor_id BIGINT NULL REFERENCES personas(id) ON DELETE SET NULL,
    -- Only for kinds with no source to recount or look up.
    data JSONB NULL,
    last_event_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL,
    UNIQUE (recipient_id, group_key),
    CHECK ((scope_type IS NULL) = (scope_id IS NULL))
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

-- Removing everything about a deleted post, comment, channel, ...
CREATE INDEX IF NOT EXISTS idx_notifications_subject_active
    ON notifications (subject_type, subject_id)
    WHERE deleted_at IS NULL;

-- Removing everything inside a deleted channel.
CREATE INDEX IF NOT EXISTS idx_notifications_scope_active
    ON notifications (scope_type, scope_id)
    WHERE deleted_at IS NULL AND scope_type IS NOT NULL;

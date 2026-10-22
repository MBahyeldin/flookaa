-- Reverse 015_follow_notification_kinds --

-- Postgres can't drop an enum value, so the type is rebuilt without them.
DELETE FROM notifications WHERE kind IN ('new_follower', 'follow_request');

ALTER TYPE notification_kind_enum RENAME TO notification_kind_enum_old;

CREATE TYPE notification_kind_enum AS ENUM (
    'post_comment',
    'comment_reply',
    'post_like',
    'comment_like',
    'join_request',
    'request_approved',
    'removed_from_channel'
);

ALTER TABLE notifications
    ALTER COLUMN kind TYPE notification_kind_enum USING kind::text::notification_kind_enum;

DROP TYPE notification_kind_enum_old;

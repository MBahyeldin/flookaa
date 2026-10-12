-- Reverse 019_follow_invitation_kinds --

-- Postgres can't drop an enum value, so the type is rebuilt without them.
DELETE FROM notifications WHERE kind IN ('follow_invitation', 'follow_invitation_accepted');

ALTER TYPE notification_kind_enum RENAME TO notification_kind_enum_old;

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
    'follow_request_approved'
);

ALTER TABLE notifications
    ALTER COLUMN kind TYPE notification_kind_enum USING kind::text::notification_kind_enum;

DROP TYPE notification_kind_enum_old;

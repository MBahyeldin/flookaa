-- Reverse 032_community_join_notification_kinds --

-- Postgres can't drop an enum value, so the type is rebuilt without them.
DELETE FROM notifications
WHERE kind IN ('community_join_request', 'community_request_approved', 'community_request_rejected');

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
    'follow_request_approved',
    'follow_invitation',
    'follow_invitation_accepted',
    'channel_request',
    'channel_request_approved',
    'channel_request_rejected'
);

ALTER TABLE notifications
    ALTER COLUMN kind TYPE notification_kind_enum USING kind::text::notification_kind_enum;

DROP TYPE notification_kind_enum_old;

-- Reverse 031_channel_request_kinds --

-- Postgres can't drop an enum value, so the types are rebuilt without them.
DELETE FROM notifications
WHERE kind IN ('channel_request', 'channel_request_approved', 'channel_request_rejected')
   OR subject_type = 'COMMUNITY';

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
    'follow_invitation_accepted'
);

ALTER TABLE notifications
    ALTER COLUMN kind TYPE notification_kind_enum USING kind::text::notification_kind_enum;

DROP TYPE notification_kind_enum_old;

ALTER TYPE notification_subject_enum RENAME TO notification_subject_enum_old;

CREATE TYPE notification_subject_enum AS ENUM ('POST', 'COMMENT', 'CHANNEL', 'PERSONA');

ALTER TABLE notifications
    ALTER COLUMN subject_type TYPE notification_subject_enum USING subject_type::text::notification_subject_enum;

DROP TYPE notification_subject_enum_old;

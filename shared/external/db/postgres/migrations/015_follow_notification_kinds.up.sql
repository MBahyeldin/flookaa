-- Follow notification kinds --

ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'new_follower';
ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'follow_request';

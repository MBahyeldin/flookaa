-- Community join request notification kinds --

ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'community_join_request';
ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'community_request_approved';
ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'community_request_rejected';

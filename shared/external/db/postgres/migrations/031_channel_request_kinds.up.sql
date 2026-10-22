-- Channel request notification kinds --

ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'channel_request';
ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'channel_request_approved';
ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'channel_request_rejected';
ALTER TYPE notification_subject_enum ADD VALUE IF NOT EXISTS 'COMMUNITY';

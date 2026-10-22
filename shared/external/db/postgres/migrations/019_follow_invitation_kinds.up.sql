-- Follow invitation notification kinds --

ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'follow_invitation';
ALTER TYPE notification_kind_enum ADD VALUE IF NOT EXISTS 'follow_invitation_accepted';

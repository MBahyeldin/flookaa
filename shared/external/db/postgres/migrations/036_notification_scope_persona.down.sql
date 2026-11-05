-- Reverse 036_notification_scope_persona --

-- Postgres can't drop an enum value, so the type is rebuilt without it.
DELETE FROM notifications WHERE scope_type = 'PERSONA';

ALTER TYPE notification_scope_enum RENAME TO notification_scope_enum_old;

CREATE TYPE notification_scope_enum AS ENUM ('CHANNEL');

DROP INDEX IF EXISTS idx_notifications_scope_active;

ALTER TABLE notifications
    ALTER COLUMN scope_type TYPE notification_scope_enum USING scope_type::text::notification_scope_enum;

CREATE INDEX IF NOT EXISTS idx_notifications_scope_active
    ON notifications (scope_type, scope_id)
    WHERE deleted_at IS NULL AND scope_type IS NOT NULL;

DROP TYPE notification_scope_enum_old;

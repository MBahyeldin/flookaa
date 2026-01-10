BEGIN;
-- ============================================
-- Table: notifications
-- Description: Stores all user notification events
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'event_enum'
    ) THEN
    CREATE TYPE event_enum AS ENUM ('post', 'comment', 'like');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'event_action_enum'
    ) THEN
    CREATE TYPE event_action_enum AS ENUM ('create', 'update', 'delete');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'event_target_type_enum'
    ) THEN
    CREATE TYPE event_target_type_enum AS ENUM ('PERSONA', 'CHANNEL', 'POST', 'COMMENT');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'owner_enum'
    ) THEN
    CREATE TYPE owner_enum AS ENUM ('PERSONA', 'CHANNEL');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    name event_enum NOT NULL,
    action event_action_enum NOT NULL,
    target_id varchar(255) NOT NULL,
    target_type event_target_type_enum NOT NULL,
    owner owner_enum NOT NULL,
    owner_id BIGINT NOT NULL,
    actor_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_events_actor_event_created_at ON events (actor_id, name, created_at DESC);
COMMIT;
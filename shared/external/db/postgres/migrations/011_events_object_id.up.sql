-- Link every event to the post or comment it is about --

-- A comment event's target_id is its parent, so a persona's two comments on
-- one post were indistinguishable. object_id is the created post or comment
-- (for likes, the liked one), so a delete can soft-delete exactly that
-- object's events. NOT NULL: the events table was emptied before this
-- migration, and it fails on purpose if rows remain.
ALTER TABLE events
    ADD COLUMN object_id varchar(255) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_object_active
    ON events (object_id)
    WHERE deleted_at IS NULL;

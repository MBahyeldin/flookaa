-- Reverse 011_events_object_id --

DROP INDEX IF EXISTS idx_events_object_active;
ALTER TABLE events DROP COLUMN IF EXISTS object_id;

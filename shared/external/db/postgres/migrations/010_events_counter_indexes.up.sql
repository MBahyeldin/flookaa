-- Indexes for counters and "liked by me" --

-- Recounting likes/comments for one target (redis worker and cache misses).
CREATE INDEX IF NOT EXISTS idx_events_target_name_active
    ON events (target_id, name)
    WHERE deleted_at IS NULL;

-- "Which of these targets has this persona liked" for a page of posts/comments.
CREATE INDEX IF NOT EXISTS idx_events_actor_name_target_active
    ON events (actor_id, name, target_id)
    WHERE deleted_at IS NULL;

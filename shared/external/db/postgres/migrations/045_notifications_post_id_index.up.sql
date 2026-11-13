CREATE INDEX IF NOT EXISTS notifications_post_id_idx
    ON notifications ((data->>'post_id'))
    WHERE deleted_at IS NULL;

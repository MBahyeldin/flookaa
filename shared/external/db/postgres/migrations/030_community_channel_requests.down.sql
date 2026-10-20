-- Reverse 030_community_channel_requests --

DELETE FROM community_channels WHERE status <> 'active' OR removed_at IS NOT NULL;

DROP INDEX community_channels_live_channel_idx;

ALTER TABLE community_channels
    DROP CONSTRAINT community_channels_pkey,
    ADD CONSTRAINT community_channels_channel_id_key UNIQUE (channel_id),
    DROP COLUMN status,
    DROP COLUMN requested_by,
    DROP COLUMN resolved_at,
    DROP COLUMN removed_at;

DROP TYPE community_channel_status_enum;

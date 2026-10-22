-- Channels request to join a community --

CREATE TYPE community_channel_status_enum AS ENUM ('pending', 'active', 'rejected');

-- One row per pair: a channel's history with each community.
ALTER TABLE community_channels
    ADD COLUMN status community_channel_status_enum,
    ADD COLUMN requested_by BIGINT REFERENCES personas(id) ON DELETE SET NULL,
    ADD COLUMN resolved_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN removed_at TIMESTAMP WITHOUT TIME ZONE;

UPDATE community_channels SET status = 'active', resolved_at = created_at;

ALTER TABLE community_channels
    ALTER COLUMN status SET NOT NULL,
    DROP CONSTRAINT community_channels_channel_id_key,
    ADD PRIMARY KEY (community_id, channel_id);

-- A channel is in one community or has one pending request, never both.
CREATE UNIQUE INDEX community_channels_live_channel_idx ON community_channels (channel_id)
    WHERE status IN ('pending', 'active') AND removed_at IS NULL;

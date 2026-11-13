ALTER TABLE channel_followers
    ALTER COLUMN followed_at TYPE timestamp,
    ALTER COLUMN unfollowed_at TYPE timestamp;

ALTER TABLE channel_interests
    ALTER COLUMN created_at TYPE timestamp;

ALTER TABLE channel_members
    ALTER COLUMN joined_at TYPE timestamp,
    ALTER COLUMN left_at TYPE timestamp;

ALTER TABLE channel_roles
    ALTER COLUMN deleted_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE channels
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE cities
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE communities
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE community_channels
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN resolved_at TYPE timestamp,
    ALTER COLUMN removed_at TYPE timestamp;

ALTER TABLE community_followers
    ALTER COLUMN followed_at TYPE timestamp,
    ALTER COLUMN unfollowed_at TYPE timestamp;

ALTER TABLE community_interests
    ALTER COLUMN created_at TYPE timestamp;

ALTER TABLE community_members
    ALTER COLUMN joined_at TYPE timestamp,
    ALTER COLUMN resolved_at TYPE timestamp,
    ALTER COLUMN left_at TYPE timestamp;

ALTER TABLE community_roles
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE countries
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE interest_groups
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE interests
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN retired_at TYPE timestamp;

ALTER TABLE persona_friend_groups
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE persona_interests
    ALTER COLUMN created_at TYPE timestamp;

ALTER TABLE persona_relationships
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE personas
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE post_references
    ALTER COLUMN created_at TYPE timestamp;

ALTER TABLE regions
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE roles
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE states
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE subregions
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE user_roles
    ALTER COLUMN deleted_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp;

ALTER TABLE user_verifications
    ALTER COLUMN expires_at TYPE timestamp,
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN last_sent_at TYPE timestamp,
    ALTER COLUMN verified_at TYPE timestamp;

ALTER TABLE users
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp;

ALTER TABLE cities ALTER COLUMN created_at SET DEFAULT '2014-01-01 12:01:01'::timestamp;

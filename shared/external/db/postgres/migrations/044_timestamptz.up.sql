-- Old values are read in the session's TimeZone, the zone now() wrote them in.

ALTER TABLE channel_followers
    ALTER COLUMN followed_at TYPE timestamptz,
    ALTER COLUMN unfollowed_at TYPE timestamptz;

ALTER TABLE channel_interests
    ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE channel_members
    ALTER COLUMN joined_at TYPE timestamptz,
    ALTER COLUMN left_at TYPE timestamptz;

ALTER TABLE channel_roles
    ALTER COLUMN deleted_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE channels
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE cities
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE communities
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE community_channels
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN resolved_at TYPE timestamptz,
    ALTER COLUMN removed_at TYPE timestamptz;

ALTER TABLE community_followers
    ALTER COLUMN followed_at TYPE timestamptz,
    ALTER COLUMN unfollowed_at TYPE timestamptz;

ALTER TABLE community_interests
    ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE community_members
    ALTER COLUMN joined_at TYPE timestamptz,
    ALTER COLUMN resolved_at TYPE timestamptz,
    ALTER COLUMN left_at TYPE timestamptz;

ALTER TABLE community_roles
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE countries
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE interest_groups
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE interests
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN retired_at TYPE timestamptz;

ALTER TABLE persona_friend_groups
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE persona_interests
    ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE persona_relationships
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE personas
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE post_references
    ALTER COLUMN created_at TYPE timestamptz;

ALTER TABLE regions
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE roles
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE states
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE subregions
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE user_roles
    ALTER COLUMN deleted_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz;

ALTER TABLE user_verifications
    ALTER COLUMN expires_at TYPE timestamptz,
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN last_sent_at TYPE timestamptz,
    ALTER COLUMN verified_at TYPE timestamptz;

ALTER TABLE users
    ALTER COLUMN created_at TYPE timestamptz,
    ALTER COLUMN updated_at TYPE timestamptz,
    ALTER COLUMN deleted_at TYPE timestamptz;

ALTER TABLE cities ALTER COLUMN created_at SET DEFAULT '2014-01-01 12:01:01+00'::timestamptz;

-- Reverse 009_channel_access --

-- Fails if a channel has several personas with the same role; remove the extras first.
ALTER TABLE channel_roles DROP CONSTRAINT channel_roles_pkey;
ALTER TABLE channel_roles ADD PRIMARY KEY (channel_id, role_id);

DROP INDEX IF EXISTS idx_channel_members_channel_persona;

-- Pending and rejected requests would become memberships without a status column.
DELETE FROM channel_members WHERE status <> 'active';
ALTER TABLE channel_members DROP COLUMN status;
DROP TYPE channel_membership_status_enum;

ALTER TABLE channels DROP COLUMN visibility;
DROP TYPE channel_visibility_enum;

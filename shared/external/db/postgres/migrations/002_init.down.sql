-- Migration Down: 0001_init_down.sql
-- This script reverts the initial database schema setup.
-- order of dropping tables is important due to foreign key constraints.
-- start with tables that have foreign keys referencing other tables.
BEGIN;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS channel_roles;
DROP TABLE IF EXISTS channel_members;
DROP TABLE IF EXISTS channel_followers;
DROP TABLE IF EXISTS post_references;
END;

BEGIN;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS roles;
END;

BEGIN;
DROP TABLE IF EXISTS users;
END;


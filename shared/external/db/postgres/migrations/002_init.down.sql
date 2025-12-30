-- Migration Down: 0001_init_down.sql
-- This script reverts the initial database schema setup.
-- order of dropping tables is important due to foreign key constraints.
-- start with tables that have foreign keys referencing other tables.

BEGIN;
DROP TABLE IF EXISTS users;
END;

BEGIN;
DROP TYPE IF EXISTS oauth_provider;
END;
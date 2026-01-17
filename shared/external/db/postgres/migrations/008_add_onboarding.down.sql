-- Add onboarding columns to users table --

ALTER TABLE users DROP COLUMN onboarding_completed;
ALTER TABLE users DROP COLUMN onboarding_step;
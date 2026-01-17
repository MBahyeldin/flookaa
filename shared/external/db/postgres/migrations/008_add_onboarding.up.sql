-- Add onboarding columns to users table --

ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN onboarding_step INTEGER DEFAULT 0;
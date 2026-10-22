-- Onboarding state: existing users have finished onboarding --

UPDATE users SET onboarding_completed = TRUE;
UPDATE users SET onboarding_step = 0 WHERE onboarding_step IS NULL;

ALTER TABLE users ALTER COLUMN onboarding_completed SET NOT NULL;
ALTER TABLE users ALTER COLUMN onboarding_step SET NOT NULL;

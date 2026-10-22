-- Onboarding state --

ALTER TABLE users ALTER COLUMN onboarding_completed DROP NOT NULL;
ALTER TABLE users ALTER COLUMN onboarding_step DROP NOT NULL;

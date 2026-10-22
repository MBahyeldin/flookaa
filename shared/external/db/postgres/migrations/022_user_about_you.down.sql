-- Date of birth and gender --

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_date_of_birth_min,
    DROP COLUMN IF EXISTS date_of_birth,
    DROP COLUMN IF EXISTS gender;

DROP TYPE IF EXISTS gender_enum;

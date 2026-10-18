-- Date of birth and gender: account data, asked in onboarding --

CREATE TYPE gender_enum AS ENUM ('male', 'female');

ALTER TABLE users
    ADD COLUMN date_of_birth DATE,
    ADD COLUMN gender gender_enum,
    ADD CONSTRAINT users_date_of_birth_min CHECK (date_of_birth >= DATE '1900-01-01');

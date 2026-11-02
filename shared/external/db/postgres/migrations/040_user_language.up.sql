-- UI language: NULL = never chosen, the app follows the browser --

CREATE TYPE language_enum AS ENUM ('en', 'ar');

ALTER TABLE users ADD COLUMN language language_enum;

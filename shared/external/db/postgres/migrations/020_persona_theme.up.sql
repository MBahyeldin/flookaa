-- Persona theme --

CREATE TYPE persona_theme_enum AS ENUM ('tide', 'forest', 'ember', 'plum', 'rose', 'slate');

ALTER TABLE personas ADD COLUMN theme persona_theme_enum NOT NULL DEFAULT 'tide';

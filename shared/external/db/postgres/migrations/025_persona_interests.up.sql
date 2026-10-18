-- Persona interests --

ALTER TABLE persona_interests
    ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX persona_interests_interest_id_idx ON persona_interests (interest_id);

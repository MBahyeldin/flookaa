-- Community moderators and rules --

ALTER TABLE communities ADD COLUMN rules TEXT NOT NULL DEFAULT '';

-- The owner has no row here: ownership is communities.owner_id.
CREATE TABLE community_roles (
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (community_id, persona_id, role_id)
);

CREATE INDEX community_roles_persona_id_idx ON community_roles (persona_id);

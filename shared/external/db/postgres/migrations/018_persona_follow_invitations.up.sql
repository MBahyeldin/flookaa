-- Persona follow invitations --

CREATE TYPE persona_invitation_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- persona_id invites invitee_persona_id to follow it. One row per pair.
CREATE TABLE persona_follow_invitations (
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    invitee_persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    status persona_invitation_status_enum NOT NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (persona_id, invitee_persona_id),
    CHECK (persona_id <> invitee_persona_id)
);

CREATE INDEX persona_follow_invitations_invitee
    ON persona_follow_invitations (invitee_persona_id) WHERE status = 'pending';


CREATE TYPE event_enum AS ENUM ('post', 'comment', 'like');

CREATE TYPE event_action_enum AS ENUM ('create', 'update', 'delete');

CREATE TYPE event_target_type_enum AS ENUM ('PERSONA', 'CHANNEL', 'POST', 'COMMENT');

CREATE TYPE owner_enum AS ENUM ('PERSONA', 'CHANNEL');
   

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    name event_enum NOT NULL,
    action event_action_enum NOT NULL,
    target_id varchar(255) NOT NULL,
    target_type event_target_type_enum NOT NULL,
    owner owner_enum NOT NULL,
    owner_id BIGINT NOT NULL,
    actor_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Interest groups: the headings interests are picked under --

CREATE TABLE interest_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT interest_groups_slug_key UNIQUE (slug)
);

CREATE UNIQUE INDEX interest_groups_name_lower_key ON interest_groups (lower(name));

-- Nullable only so existing interests survive; the API requires a group.
ALTER TABLE interests ADD COLUMN group_id BIGINT REFERENCES interest_groups(id);

CREATE INDEX interests_group_id_idx ON interests (group_id);

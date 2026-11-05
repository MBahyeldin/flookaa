-- Channel and community theme, cover pattern --

ALTER TYPE persona_theme_enum RENAME TO theme_enum;

CREATE TYPE cover_pattern_enum AS ENUM ('horizon', 'waves', 'hills', 'stripes');

ALTER TABLE communities
    ADD COLUMN theme theme_enum NOT NULL DEFAULT 'tide',
    ADD COLUMN cover_pattern cover_pattern_enum NOT NULL DEFAULT 'horizon';

-- NULL theme: the channel takes its community's.
ALTER TABLE channels
    ADD COLUMN theme theme_enum,
    ADD COLUMN cover_pattern cover_pattern_enum NOT NULL DEFAULT 'horizon';

CREATE FUNCTION channel_theme(p_theme theme_enum, p_channel_id BIGINT) RETURNS theme_enum
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        p_theme,
        (
            SELECT co.theme
            FROM community_channels cc
            JOIN communities co ON co.id = cc.community_id
            WHERE cc.channel_id = p_channel_id
              AND cc.status = 'active' AND cc.removed_at IS NULL
              AND co.deleted_at IS NULL
        ),
        'tide'::theme_enum
    )
$$;

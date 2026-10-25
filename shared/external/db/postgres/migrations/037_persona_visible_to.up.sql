-- Whether a viewer sees the real persona, in one place --

-- Missing or deleted personas are never visible.
CREATE FUNCTION persona_visible_to(p_target BIGINT, p_viewer BIGINT) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT COALESCE((
        SELECT
            t.privacy = 'public'
            OR t.user_id = (SELECT v.user_id FROM personas v WHERE v.id = p_viewer)
            OR (t.privacy = 'private' AND EXISTS (
                SELECT 1
                FROM persona_followers pf
                WHERE pf.persona_id = t.id
                  AND pf.follower_persona_id = p_viewer
                  AND pf.status = 'active'
                  AND pf.unfollowed_at IS NULL
            ))
            -- A pending invitation shows the inviter to the invitee.
            OR (t.privacy = 'private' AND EXISTS (
                SELECT 1
                FROM persona_follow_invitations i
                WHERE i.persona_id = t.id
                  AND i.invitee_persona_id = p_viewer
                  AND i.status = 'pending'
            ))
            -- Following someone (or asking to) shows you to them.
            OR EXISTS (
                SELECT 1
                FROM persona_followers pf
                WHERE pf.persona_id = p_viewer
                  AND pf.follower_persona_id = t.id
                  AND pf.status IN ('pending', 'active')
                  AND pf.unfollowed_at IS NULL
            )
        FROM personas t
        WHERE t.id = p_target AND t.deleted_at IS NULL
    ), false)
$$;

import type { PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";
export type Persona = {
    id: string;
    userId: string;

    slug: string;
    name: string;
    description?: string;

    first_name: string;
    last_name: string;
    thumbnail?: string;
    bio?: string;

    created_at: string;

    privacy: "public" | "private" | "only_me";
    show_on_profile: boolean;
    is_default?: boolean;
    theme: PaletteId;
    cover_pattern?: CoverPattern;

    joined_channels: Array<{
        id: string;
        name: string;
    }>;
}

/** Another persona as any viewer may see it: no account fields. */
export type PublicPersona = {
    id: number;
    first_name: string;
    last_name: string;
    slug: string;
    thumbnail?: string;
    bio?: string;
    /** The viewer's follow; a rejected request reads as pending. */
    follow_status?: FollowStatus;
    /** On connected personas: the persona name and followers. */
    name?: string;
    followers_count?: number;
}

export type FollowStatus = "active" | "pending" | null;

export type PersonaProfile = PublicPersona & {
    locked: false;
    followers_count: number;
    following_count: number;
    requires_approval: boolean;
    followable: boolean;
    /** Your invitation to this persona to follow you. */
    invite_status: InviteStatus;
    /** This persona invited you to follow it. */
    invited_you: boolean;
    can_invite: boolean;
    privacy: "public" | "private" | "only_me";
    theme: PaletteId;
    cover_pattern: CoverPattern;
}

export type InviteStatus = "pending" | null;

/** A private persona the viewer can't see: only its id and the viewer's own follow. */
export type LockedPersona = {
    id: number;
    locked: true;
    anonymous_name: string;
    follow_status: FollowStatus;
}

/** Someone following, or asking to follow, your own persona. */
export type Follower = {
    persona_id: number;
    first_name: string;
    last_name: string;
    thumbnail: string;
    anonymous: boolean;
}

export type FollowRequest = Follower & { requested_at: string };

export type ActiveFollower = Follower & { followed_at: string };

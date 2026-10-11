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
}

export type FollowStatus = "active" | "pending" | null;

export type PersonaProfile = PublicPersona & {
    followers_count: number;
    following_count: number;
    requires_approval: boolean;
}

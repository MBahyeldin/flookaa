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

    joined_channels: Array<{
        id: string;
        name: string;
    }>;
}
export type Persona = {
    id: string;
    user_id: string;

    slug: string;
    name: string;
    description?: string;

    first_name: string;
    last_name: string;
    thumbnail?: string;
    bio?: string;
}
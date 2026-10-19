import type { Interest } from "./interest";

export type CommunityOwner = {
  id: number;
  first_name: string;
  last_name: string;
  thumbnail: string;
  anonymous: boolean;
};

export type Community = {
  id: number;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  banner: string;
  visibility: "public" | "private";
  /** Null when the owner persona is gone. */
  owner: CommunityOwner | null;
  interests: Interest[];
  channels_count: number;
  /** Only on a single community: owner or global Administrator. */
  can_manage?: boolean;
};

export type CommunityRef = Pick<Community, "id" | "name" | "slug">;

export const MAX_COMMUNITY_INTERESTS = 5;

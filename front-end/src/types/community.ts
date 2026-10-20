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
  /** Plain text; empty when the community has none. */
  rules: string;
  thumbnail: string;
  banner: string;
  visibility: "public" | "private";
  /** Null when the owner persona is gone. */
  owner: CommunityOwner | null;
  interests: Interest[];
  channels_count: number;
  members_count: number;
  followers_count: number;
  /** The viewer's own; a rejected request reads as pending. */
  membership_status: "none" | "pending" | "active";
  following: boolean;
  /** Only on a single community: owner, moderator or global Administrator. */
  can_manage?: boolean;
  /** Only on a single community: owner or global Administrator (moderators, visibility). */
  can_own?: boolean;
  /** Only on a single community: the viewer owns it (and can't leave). */
  is_owner?: boolean;
  is_moderator?: boolean;
};

/** Another persona as the viewer sees it; anonymous ones have only first_name. */
export type CommunityPersona = {
  persona_id: number;
  first_name: string;
  last_name: string;
  thumbnail: string;
  anonymous: boolean;
};

export type CommunityMember = CommunityPersona & { is_owner: boolean; is_moderator: boolean; joined_at: string };

export type CommunityJoinRequest = CommunityPersona & { requested_at: string };

export type CommunityRef = Pick<Community, "id" | "name" | "slug">;

/** A channel asking to join a community, as its managers see it. */
export type CommunityChannelRequest = {
  channel_id: number;
  name: string;
  description: string;
  thumbnail: string;
  visibility: "public" | "private";
  requested_at: string;
};

/** A channel the viewer moderates, with where it stands with communities. */
export type ModeratedChannel = {
  id: number;
  name: string;
  thumbnail: string;
  visibility: "public" | "private";
  community_status: "none" | "pending" | "active";
  community: CommunityRef | null;
};

/** A channel's community row, for its moderators. */
export type ChannelCommunityState = {
  status: "none" | "pending" | "active" | "rejected";
  community: CommunityRef | null;
  /** Only when rejected: when the same community may be asked again. */
  rejected_until?: string;
};

export const MAX_COMMUNITY_INTERESTS = 5;

export const MAX_COMMUNITY_RULES = 5000;

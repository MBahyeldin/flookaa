import type { CommunityRef } from "./community";
import type { Interest } from "./interest";

type Channel = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  banner: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  is_member: boolean;
  /** A join request for this private channel is waiting for a moderator. */
  is_pending: boolean;
  is_follower: boolean;
  visibility: "public" | "private";
  members_count: number;
  followers_count: number;
  interests: Interest[];
  community: CommunityRef | null;
  /** 13, 16, 18 or 21. */
  min_age: number;
};

type ChannelInterests = { interests: Interest[]; can_edit: boolean };

/** A pending request to join a private channel (moderators only). */
type JoinRequest = {
  persona_id: number;
  name: string;
  first_name: string;
  last_name: string;
  thumbnail: string;
  anonymous: boolean;
  requested_at: string;
};

/** An active channel member (moderators only). */
type ChannelMember = {
  persona_id: number;
  name: string;
  first_name: string;
  last_name: string;
  thumbnail: string;
  anonymous: boolean;
  joined_at: string;
  is_owner: boolean;
  is_moderator: boolean;
};

export type { Channel, ChannelInterests, JoinRequest, ChannelMember };

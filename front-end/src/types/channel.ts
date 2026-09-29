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
};

/** A pending request to join a private channel (moderators only). */
type JoinRequest = {
  persona_id: number;
  name: string;
  first_name: string;
  last_name: string;
  thumbnail: string;
  requested_at: string;
};

/** An active channel member (moderators only). */
type ChannelMember = {
  persona_id: number;
  name: string;
  first_name: string;
  last_name: string;
  thumbnail: string;
  joined_at: string;
  is_owner: boolean;
  is_moderator: boolean;
};

export type { Channel, JoinRequest, ChannelMember };

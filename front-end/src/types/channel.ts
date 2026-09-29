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

export type { Channel };

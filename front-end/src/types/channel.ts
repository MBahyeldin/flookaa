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
  is_follower: boolean;
};

export type { Channel };

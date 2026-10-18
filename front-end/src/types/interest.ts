export type Interest = {
  id: number;
  name: string;
  slug: string;
  emoji: string;
};

export type InterestGroup = {
  id: number;
  name: string;
  slug: string;
  interests: Interest[];
};

export type AdminInterest = Interest & { group_id: number | null; retired: boolean };

export type AdminInterestGroup = Omit<InterestGroup, "interests">;

export type AdminCatalogue = { groups: AdminInterestGroup[]; interests: AdminInterest[] };

export type InterestInput = Pick<Interest, "name" | "slug" | "emoji"> & { group_id: number | null };

export type InterestGroupInput = Pick<InterestGroup, "name" | "slug">;

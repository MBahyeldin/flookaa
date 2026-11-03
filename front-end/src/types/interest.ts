export type InterestNames = { name_en: string; name_ar: string | null };

export type Interest = InterestNames & {
  id: number;
  slug: string;
  emoji: string;
};

export type InterestGroup = InterestNames & {
  id: number;
  slug: string;
  interests: Interest[];
};

export type AdminInterest = Interest & { group_id: number | null; retired: boolean };

export type AdminInterestGroup = Omit<InterestGroup, "interests">;

export type AdminCatalogue = { groups: AdminInterestGroup[]; interests: AdminInterest[] };

export type InterestInput = Pick<Interest, "name_en" | "name_ar" | "slug" | "emoji"> & { group_id: number | null };

export type InterestGroupInput = Pick<InterestGroup, "name_en" | "name_ar" | "slug">;

export type PersonaInterests = { groups: InterestGroup[]; selected: number[]; retired: Interest[] };

export const MAX_PERSONA_INTERESTS = 20;

export const MAX_CHANNEL_INTERESTS = 5;

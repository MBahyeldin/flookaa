export type Interest = {
  id: number;
  name: string;
  slug: string;
  emoji: string;
};

export type AdminInterest = Interest & { retired: boolean };

export type InterestInput = Pick<Interest, "name" | "slug" | "emoji">;

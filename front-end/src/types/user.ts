import zod from "zod";
import { t } from "@/i18n";

export type Profile = {
  email?: string;
  thumbnail?: string;
  first_name: string;
  last_name: string;
  street?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  other_platform_accounts?: string[];
  email_address: string;
  is_verified?: boolean;
  has_password: boolean;
  date_of_birth?: string | null;
  gender?: Gender | null;
  /** 0 when not set. */
  country_id?: number;
  state_id?: number;
  city_id?: number;
};

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];
export const genderLabel = (g: Gender) => t(`settings:gender.${g}`);
export const MIN_DATE_OF_BIRTH = "1900-01-01";
// The backend compares with today's UTC date.
export const maxDateOfBirth = () => new Date().toISOString().slice(0, 10);

function isRealDate(v: string) {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export const dateOfBirthSchema = zod
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => t("settings:dob.invalid") })
  .refine(isRealDate, { error: () => t("settings:dob.invalid") })
  .refine((v) => v >= MIN_DATE_OF_BIRTH && v <= maxDateOfBirth(), { error: () => t("settings:dob.range") });

export const genderSchema = zod.enum(GENDERS, { error: () => t("settings:gender.choose") });

export const aboutYouSchema = zod.object({
  date_of_birth: dateOfBirthSchema,
  gender: genderSchema,
});

export type AboutYou = zod.infer<typeof aboutYouSchema>;

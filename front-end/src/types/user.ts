import zod from "zod";

export const profileSchema = zod.object({
  email: zod.string().email("Invalid email").nonempty("Required"),
  thumbnail: zod.string().optional(),
  first_name: zod.string().min(2, "Minimum 2 characters").nonempty("Required"),
  last_name: zod.string().min(2, "Minimum 2 characters").nonempty("Required"),
  street: zod.string().max(200, "Maximum 200 characters").optional(),
  city: zod.string().max(100, "Maximum 100 characters").optional(),
  country: zod.string().max(100, "Maximum 100 characters").optional(),
  postal_code: zod.string().max(20, "Maximum 20 characters").optional(),
  other_platform_accounts: zod.array(zod.string()).optional(),
});

export type Profile = zod.infer<typeof profileSchema> & {
  date_of_birth?: string | null;
  gender?: Gender | null;
};

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];
export const MIN_DATE_OF_BIRTH = "1900-01-01";
// The backend compares with today's UTC date.
export const maxDateOfBirth = () => new Date().toISOString().slice(0, 10);

function isRealDate(v: string) {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export const dateOfBirthSchema = zod
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine(isRealDate, "Enter a valid date")
  .refine((v) => v >= MIN_DATE_OF_BIRTH && v <= maxDateOfBirth(), "Enter a date between 1900 and today");

export const genderSchema = zod.enum(GENDERS, { message: "Choose one" });

export const aboutYouSchema = zod.object({
  date_of_birth: dateOfBirthSchema,
  gender: genderSchema,
});

export type AboutYou = zod.infer<typeof aboutYouSchema>;

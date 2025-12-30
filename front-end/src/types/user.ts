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

export type Profile = zod.infer<typeof profileSchema>;

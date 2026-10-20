import { useEffect, useState } from "react";
import TextInput from "@/components/inputs/text";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionLoader from "@/components/section-loader";
import { dateOfBirthField } from "@/lib/formFields/profile";
import { getUserData, updateProfile } from "@/services/user";
import {
  GENDERS,
  dateOfBirthSchema,
  genderSchema,
  type Gender,
} from "@/types/user";
import OnboardingFooter from "../OnboardingFooter";

const GENDER_LABELS: Record<Gender, string> = { male: "Male", female: "Female" };

export default function AboutYou() {
  const [loading, setLoading] = useState(true);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [dobTouched, setDobTouched] = useState(false);
  const [serverError, setServerError] = useState<{ field: "date_of_birth" | "gender"; message: string } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getUserData().then((profile) => {
      if (!alive) return;
      if (profile?.date_of_birth) setDateOfBirth(profile.date_of_birth);
      if (profile?.gender) setGender(profile.gender);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <SectionLoader />;

  const dob = dateOfBirthSchema.safeParse(dateOfBirth);
  const gen = genderSchema.safeParse(gender);
  const dobError =
    serverError?.field === "date_of_birth"
      ? serverError.message
      : dobTouched && dateOfBirth && !dob.success
        ? dob.error.issues[0]?.message
        : null;
  const genderError = serverError?.field === "gender" ? serverError.message : null;

  const save = async () => {
    if (!dob.success || !gen.success) return false;
    setSaveFailed(false);
    const result = await updateProfile({ date_of_birth: dob.data, gender: gen.data });
    if (result.ok) return true;
    if (result.error === "invalid_date_of_birth") {
      setServerError({ field: "date_of_birth", message: "Enter a date between 1900 and today" });
    } else if (result.error === "invalid_gender") {
      setServerError({ field: "gender", message: "Choose one" });
    } else {
      setSaveFailed(true);
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto w-full max-w-sm flex flex-col gap-6">
        <TextInput
          field={dateOfBirthField}
          initValue={dateOfBirth}
          error={dobError ?? undefined}
          touched
          className="w-full"
          setFieldValue={async (_field, value) => {
            setDateOfBirth(String(value ?? ""));
            setServerError(null);
          }}
          handleBlur={() => setDobTouched(true)}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={gender}
            onValueChange={(v) => {
              setGender(v as Gender);
              setServerError(null);
            }}
          >
            <SelectTrigger id="gender" className="w-full" aria-invalid={genderError ? true : undefined}>
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {GENDER_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {genderError && <p className="text-sm text-destructive">{genderError}</p>}
        </div>
      </div>
      {saveFailed && (
        <p role="alert" className="text-sm text-destructive text-right">
          Couldn't save. Please try again.
        </p>
      )}
      <OnboardingFooter onContinue={save} continueDisabled={!dob.success || !gen.success} />
    </div>
  );
}

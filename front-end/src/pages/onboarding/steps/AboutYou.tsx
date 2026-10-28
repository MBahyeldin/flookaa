import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import SectionLoader from "@/components/section-loader";
import { getUserData, updateProfile } from "@/services/user";
import {
  GENDERS,
  GENDER_LABELS,
  dateOfBirthSchema,
  genderSchema,
  type Gender,
} from "@/types/user";
import OnboardingFooter from "../OnboardingFooter";

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
    <div className="flex flex-col gap-6">
      <FormField
        label="Date of birth"
        helper="Used only for age limits. Never shown on a persona."
        error={dobError}
      >
        <Input
          type="date"
          value={dateOfBirth}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => {
            setDateOfBirth(e.target.value);
            setServerError(null);
          }}
          onBlur={() => setDobTouched(true)}
        />
      </FormField>
      <div className="flex flex-col gap-1.5">
        <p id="gender-label" className="text-sm font-medium">
          Gender
        </p>
        <div role="radiogroup" aria-labelledby="gender-label" className="flex gap-2">
          {GENDERS.map((g) => (
            <Chip
              key={g}
              kind="filter"
              role="radio"
              aria-checked={gender === g}
              aria-pressed={undefined}
              selected={gender === g}
              onClick={() => {
                setGender(g);
                setServerError(null);
              }}
            >
              {GENDER_LABELS[g]}
            </Chip>
          ))}
        </div>
        {genderError && (
          <p role="alert" className="text-xs text-destructive">
            {genderError}
          </p>
        )}
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

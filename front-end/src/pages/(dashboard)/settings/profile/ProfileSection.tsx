import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/Auth.context";
import { updateProfile, type ProfilePatch } from "@/services/user";
import { GENDERS, GENDER_LABELS, dateOfBirthSchema, maxDateOfBirth, type Gender, type Profile } from "@/types/user";
import { LocationFields } from "./LocationFields";

type Values = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender | "";
  country_id: string;
  state_id: string;
  city_id: string;
};

const id = (n?: number) => (n ? String(n) : "");

const valuesOf = (p: Profile): Values => ({
  first_name: p.first_name ?? "",
  last_name: p.last_name ?? "",
  date_of_birth: p.date_of_birth ?? "",
  gender: p.gender ?? "",
  country_id: id(p.country_id),
  state_id: id(p.state_id),
  city_id: id(p.city_id),
});

const SERVER_ERRORS: Record<string, { field: "date_of_birth" | "gender"; message: string }> = {
  invalid_date_of_birth: { field: "date_of_birth", message: "Enter a date between 1900 and today" },
  invalid_gender: { field: "gender", message: "Choose one" },
};

export function ProfileSection({ profile }: { profile: Profile }) {
  const { revalidateUser } = useAuth();
  const [saved, setSaved] = useState(() => valuesOf(profile));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<(typeof SERVER_ERRORS)[string] | null>(null);
  const [dobTouched, setDobTouched] = useState(false);

  const set = (patch: Partial<Values>) => {
    setServerError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const changed = (Object.keys(draft) as (keyof Values)[]).filter((k) => draft[k] !== saved[k]);
  const dob = dateOfBirthSchema.safeParse(draft.date_of_birth);
  // The backend can't clear a stored date or place, so a changed parent needs its stored children picked again.
  const dobMissing = !!saved.date_of_birth && !draft.date_of_birth;
  const locationIncomplete =
    (draft.country_id !== saved.country_id && !!saved.state_id && !draft.state_id) ||
    (draft.state_id !== saved.state_id && !!saved.city_id && !draft.city_id);
  const namesOk = draft.first_name.trim() !== "" && draft.last_name.trim() !== "";
  const dobOk = draft.date_of_birth === "" ? !dobMissing : dob.success;

  const dobError =
    serverError?.field === "date_of_birth"
      ? serverError.message
      : dobTouched && !dobOk
        ? dob.error?.issues[0]?.message ?? "Enter a valid date"
        : null;

  const save = async () => {
    const patch: ProfilePatch = {};
    for (const k of changed) {
      const v = k === "first_name" || k === "last_name" ? draft[k].trim() : draft[k];
      if (v !== "") Object.assign(patch, { [k]: v });
    }
    setSaving(true);
    const r = await updateProfile(patch);
    setSaving(false);
    if (!r.ok) {
      const known = SERVER_ERRORS[r.error];
      if (known) setServerError(known);
      else toast.error("Couldn't save your profile. Please try again.");
      return;
    }
    setSaved(draft);
    toast.success("Profile saved");
    if (changed.includes("first_name") || changed.includes("last_name")) revalidateUser();
  };

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      lead="Only you see your date of birth and gender. Your age decides which channels and communities you can see."
      onSave={save}
      dirty={changed.length > 0}
      canSave={namesOk && dobOk && !locationIncomplete}
      saving={saving}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="First name" error={draft.first_name.trim() === "" ? "Enter your first name" : null}>
          <Input autoComplete="given-name" value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} />
        </FormField>
        <FormField label="Last name" error={draft.last_name.trim() === "" ? "Enter your last name" : null}>
          <Input autoComplete="family-name" value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} />
        </FormField>
      </div>

      <FormField label="Date of birth" helper="Used only for age limits. Never shown on a persona." error={dobError}>
        <Input
          type="date"
          value={draft.date_of_birth}
          max={maxDateOfBirth()}
          onChange={(e) => set({ date_of_birth: e.target.value })}
          onBlur={() => setDobTouched(true)}
        />
      </FormField>

      <div className="flex flex-col gap-1.5">
        <p id="settings-gender" className="text-sm font-medium">
          Gender
        </p>
        <div role="radiogroup" aria-labelledby="settings-gender" className="flex gap-2">
          {GENDERS.map((g) => (
            <Chip
              key={g}
              kind="filter"
              role="radio"
              aria-checked={draft.gender === g}
              aria-pressed={undefined}
              selected={draft.gender === g}
              onClick={() => set({ gender: g })}
            >
              {GENDER_LABELS[g]}
            </Chip>
          ))}
        </div>
        {serverError?.field === "gender" && (
          <p role="alert" className="text-xs text-destructive">
            {serverError.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <LocationFields
          value={{ country_id: draft.country_id, state_id: draft.state_id, city_id: draft.city_id }}
          onChange={(loc) => set(loc)}
        />
        {locationIncomplete && (
          <p className="text-xs text-muted-foreground">Choose the state and city again.</p>
        )}
      </div>
    </SettingsSection>
  );
}

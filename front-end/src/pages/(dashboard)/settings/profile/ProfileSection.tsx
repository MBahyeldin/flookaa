import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/Auth.context";
import { updateProfile, type ProfilePatch } from "@/services/user";
import { GENDERS, genderLabel, dateOfBirthSchema, maxDateOfBirth, type Gender, type Profile } from "@/types/user";
import { useTranslation } from "react-i18next";
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

const SERVER_ERRORS: Record<string, "date_of_birth" | "gender"> = {
  invalid_date_of_birth: "date_of_birth",
  invalid_gender: "gender",
};

export function ProfileSection({ profile }: { profile: Profile }) {
  const { t } = useTranslation(["settings", "common", "auth"]);
  const { revalidateUser } = useAuth();
  const [saved, setSaved] = useState(() => valuesOf(profile));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<"date_of_birth" | "gender" | null>(null);
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
    serverError === "date_of_birth"
      ? t("dob.range")
      : dobTouched && !dobOk
        ? dob.error?.issues[0]?.message ?? t("dob.invalid")
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
      else toast.error(t("profile.saveFailed"));
      return;
    }
    setSaved(draft);
    toast.success(t("profile.saved"));
    if (changed.includes("first_name") || changed.includes("last_name")) revalidateUser();
  };

  return (
    <SettingsSection
      id="profile"
      title={t("profile.title")}
      lead={t("profile.lead")}
      onSave={save}
      dirty={changed.length > 0}
      canSave={namesOk && dobOk && !locationIncomplete}
      saving={saving}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("auth:fields.firstName")} error={draft.first_name.trim() === "" ? t("profile.firstNameMissing") : null}>
          <Input autoComplete="given-name" value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} />
        </FormField>
        <FormField label={t("auth:fields.lastName")} error={draft.last_name.trim() === "" ? t("profile.lastNameMissing") : null}>
          <Input autoComplete="family-name" value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} />
        </FormField>
      </div>

      <FormField label={t("dob.label")} helper={t("dob.helper")} error={dobError}>
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
          {t("gender.label")}
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
              {genderLabel(g)}
            </Chip>
          ))}
        </div>
        {serverError === "gender" && (
          <p role="alert" className="text-xs text-destructive">
            {t("gender.choose")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <LocationFields
          value={{ country_id: draft.country_id, state_id: draft.state_id, city_id: draft.city_id }}
          onChange={(loc) => set(loc)}
        />
        {locationIncomplete && (
          <p className="text-xs text-muted-foreground">{t("location.pickAgain")}</p>
        )}
      </div>
    </SettingsSection>
  );
}

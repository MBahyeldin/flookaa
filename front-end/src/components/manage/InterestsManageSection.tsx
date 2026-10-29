import { useEffect, useState } from "react";
import InterestPicker from "@/components/interests/InterestPicker";
import { useInterestGroups } from "@/components/create-form/useInterestGroups";
import { FieldError } from "@/components/create-form/fields";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";
import type { Interest } from "@/types/interest";

const MAX = 5;

/** onSave answers an error code or null. */
export function InterestsManageSection({
  lead,
  current,
  onSave,
}: {
  lead: string;
  current: Interest[];
  onSave: (ids: number[]) => Promise<string | null>;
}) {
  const interests = useInterestGroups();
  const [value, setValue] = useState<number[]>(() => current.map((i) => i.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setValue(current.map((i) => i.id)), [current]);

  const groups = interests.groups;
  const active = new Set(Array.isArray(groups) ? groups.flatMap((g) => g.interests.map((i) => i.id)) : []);
  const retired = current.filter((i) => !active.has(i.id));
  const dirty = value.length !== current.length || value.some((id) => !current.some((i) => i.id === id));

  const save = async () => {
    setSaving(true);
    setError(undefined);
    const code = await onSave(value);
    setSaving(false);
    if (code === "invalid_interests") setError(`Pick 1 to ${MAX} interests.`);
    else if (code === "invalid_interest") setError("One of these interests is no longer offered.");
  };

  return (
    <SettingsSection
      id="interests"
      title="Interests"
      lead={lead}
      dirty={dirty}
      canSave={value.length > 0}
      saving={saving}
      onSave={save}
      note={value.length === 0 ? "Pick at least one." : `${value.length} / ${MAX}`}
    >
      {groups === null && <SkeletonList count={2} />}
      {groups === "error" && <ErrorState compact title="Couldn't load the interests" onRetry={interests.retry} />}
      {Array.isArray(groups) && (
        <InterestPicker groups={groups} retired={retired} value={value} onChange={setValue} max={MAX} />
      )}
      <FieldError>{error}</FieldError>
    </SettingsSection>
  );
}

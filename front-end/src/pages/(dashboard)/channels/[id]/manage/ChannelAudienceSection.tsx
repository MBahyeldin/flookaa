import { useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { AgeField } from "@/components/create-form/fields";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { MIN_AGE_ERROR } from "@/lib/minAge";
import { setChannelMinAge } from "@/services/channels";

export function ChannelAudienceSection({
  channelId,
  minAge,
  isPrivate,
  onSaved,
}: {
  channelId: string;
  minAge: number;
  isPrivate: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(minAge);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setValue(minAge), [minAge]);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    const r = await setChannelMinAge(channelId, value);
    setSaving(false);
    if (!r.ok) {
      if (r.error === "invalid_min_age") setError(MIN_AGE_ERROR);
      else toast.error("Couldn't save the age limit. Try again.");
      return;
    }
    toast.success(`Only people ${r.minAge} and over can see this channel`);
    onSaved();
  };

  const Icon = isPrivate ? Lock : Globe;
  return (
    <SettingsSection
      id="audience"
      title="Audience"
      lead="Who reads it, and how old they must be."
      dirty={value !== minAge}
      saving={saving}
      onSave={save}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Visibility</span>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            <Icon />
            {isPrivate ? "Private" : "Public"}
          </Badge>
          {isPrivate ? "Only members read. Joins need approval." : "Anyone can read. Members post, comment and like."}
        </div>
      </div>
      <AgeField
        value={value}
        error={error}
        helper="Younger people won't see it at all, members included."
        onChange={(age) => {
          setValue(age);
          setError(undefined);
        }}
      />
    </SettingsSection>
  );
}

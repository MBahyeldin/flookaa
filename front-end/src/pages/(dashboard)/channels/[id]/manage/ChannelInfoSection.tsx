import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateChannel } from "@/services/channels";

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

export function ChannelInfoSection({
  channelId,
  name,
  description,
  onSaved,
}: {
  channelId: string;
  name: string;
  description: string;
  onSaved: () => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  useEffect(() => setDraftName(name), [name]);
  useEffect(() => setDraftDescription(description), [description]);

  const nameChanged = draftName.trim() !== name;
  const descriptionChanged = draftDescription.trim() !== description;

  const save = async () => {
    if (!draftName.trim()) {
      setErrors({ name: "Give the channel a name." });
      return;
    }
    setSaving(true);
    setErrors({});
    const r = await updateChannel(channelId, {
      ...(nameChanged && { name: draftName.trim() }),
      ...(descriptionChanged && { description: draftDescription.trim() }),
    });
    setSaving(false);
    if (!r.ok) {
      if (r.error === "invalid_name") setErrors({ name: `Enter a name of at most ${MAX_NAME} characters.` });
      else if (r.error === "invalid_description") setErrors({ description: `Keep it to ${MAX_DESCRIPTION} characters.` });
      else toast.error("Couldn't save the channel info. Try again.");
      return;
    }
    toast.success("Channel info saved");
    onSaved();
  };

  return (
    <SettingsSection
      id="info"
      title="Info"
      lead="The name and line people see on the channel."
      dirty={nameChanged || descriptionChanged}
      saving={saving}
      onSave={save}
    >
      <FormField label="Channel name" error={errors.name} helper={`${draftName.length} / ${MAX_NAME}`}>
        <Input
          value={draftName}
          maxLength={MAX_NAME}
          onChange={(e) => {
            setDraftName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
        />
      </FormField>
      <FormField label="Description" error={errors.description} helper={`${draftDescription.length} / ${MAX_DESCRIPTION}`}>
        <Textarea
          value={draftDescription}
          maxLength={MAX_DESCRIPTION}
          rows={3}
          onChange={(e) => {
            setDraftDescription(e.target.value);
            setErrors((x) => ({ ...x, description: undefined }));
          }}
        />
      </FormField>
    </SettingsSection>
  );
}

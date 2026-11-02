import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateChannel } from "@/services/channels";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation(["channels", "common"]);
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
      setErrors({ name: t("create.nameMissing") });
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
      if (r.error === "invalid_name") setErrors({ name: t("manage.nameTooLong", { max: MAX_NAME }) });
      else if (r.error === "invalid_description") setErrors({ description: t("manage.descriptionTooLong", { max: MAX_DESCRIPTION }) });
      else toast.error(t("manage.infoFailed"));
      return;
    }
    toast.success(t("manage.infoSaved"));
    onSaved();
  };

  return (
    <SettingsSection
      id="info"
      title={t("manage.info")}
      lead={t("manage.infoLead")}
      dirty={nameChanged || descriptionChanged}
      saving={saving}
      onSave={save}
    >
      <FormField label={t("fields.name")} error={errors.name} helper={t("common:interests.count", { n: draftName.length, max: MAX_NAME })}>
        <Input
          value={draftName}
          maxLength={MAX_NAME}
          onChange={(e) => {
            setDraftName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
        />
      </FormField>
      <FormField label={t("common:create.description")} error={errors.description} helper={t("common:interests.count", { n: draftDescription.length, max: MAX_DESCRIPTION })}>
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

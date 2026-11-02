import { useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { AgeField } from "@/components/create-form/fields";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { errorMessage } from "@/lib/errors";
import { setChannelMinAge } from "@/services/channels";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation(["channels", "common"]);
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
      if (r.error === "invalid_min_age") setError(errorMessage(r.error));
      else toast.error(t("manage.ageFailed"));
      return;
    }
    toast.success(t("manage.ageSaved", { age: r.minAge }));
    onSaved();
  };

  const Icon = isPrivate ? Lock : Globe;
  return (
    <SettingsSection
      id="audience"
      title={t("common:create.audience")}
      lead={t("create.audienceLead")}
      dirty={value !== minAge}
      saving={saving}
      onSave={save}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("common:create.visibility")}</span>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            <Icon />
            {isPrivate ? t("common:visibility.private") : t("common:visibility.public")}
          </Badge>
          {isPrivate ? t("manage.privateNote") : t("common:create.publicBody")}
        </div>
      </div>
      <AgeField
        value={value}
        error={error}
        helper={t("common:age.manageHelper")}
        onChange={(age) => {
          setValue(age);
          setError(undefined);
        }}
      />
    </SettingsSection>
  );
}

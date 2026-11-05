import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_COMMUNITY_RULES } from "@/types/community";
import type { SaveCommunity } from "./CommunityManageSheet";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/format";

export function CommunityRulesSection({ rules, save }: { rules: string; save: SaveCommunity }) {
  const { t } = useTranslation("communities");
  const [value, setValue] = useState(rules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setValue(rules), [rules]);

  const submit = async () => {
    setSaving(true);
    setError(undefined);
    const code = await save({ rules: value.trim() }, t("rules.saved"));
    setSaving(false);
    if (code === "invalid_rules") setError(t("rules.tooLong", { max: formatNumber(MAX_COMMUNITY_RULES) }));
  };

  return (
    <SettingsSection
      id="rules"
      title={t("rules.title")}
      lead={t("rules.manageLead")}
      dirty={value.trim() !== rules}
      saving={saving}
      onSave={submit}
    >
      <FormField
        label={t("rules.title")}
        error={error}
        helper={t("rules.helper", { n: formatNumber(value.length), max: formatNumber(MAX_COMMUNITY_RULES) })}
      >
        <Textarea
          value={value}
          maxLength={MAX_COMMUNITY_RULES}
          rows={6}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
        />
      </FormField>
    </SettingsSection>
  );
}

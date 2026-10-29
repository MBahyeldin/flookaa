import { useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { MAX_COMMUNITY_RULES } from "@/types/community";
import type { SaveCommunity } from "./CommunityManageSheet";

export function CommunityRulesSection({ rules, save }: { rules: string; save: SaveCommunity }) {
  const [value, setValue] = useState(rules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setValue(rules), [rules]);

  const submit = async () => {
    setSaving(true);
    setError(undefined);
    const code = await save({ rules: value.trim() }, "Rules saved");
    setSaving(false);
    if (code === "invalid_rules") setError(`Keep the rules to ${MAX_COMMUNITY_RULES.toLocaleString()} characters.`);
  };

  return (
    <SettingsSection
      id="rules"
      title="Rules"
      lead="Shown before anyone joins."
      dirty={value.trim() !== rules}
      saving={saving}
      onSave={submit}
    >
      <FormField
        label="Rules"
        error={error}
        helper={`One rule per line. ${value.length.toLocaleString()} / ${MAX_COMMUNITY_RULES.toLocaleString()}`}
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

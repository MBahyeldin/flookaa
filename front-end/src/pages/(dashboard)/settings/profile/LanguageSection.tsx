import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { LANGUAGE_NAMES, LOCALES, currentLanguage, isLanguage, setLanguage, type Language } from "@/i18n";
import { saveLanguage } from "@/services/user";

export function LanguageSection() {
  const { t } = useTranslation("settings");
  const [busy, setBusy] = useState(false);

  const change = async (lang: Language) => {
    setBusy(true);
    const ok = await saveLanguage(lang);
    setBusy(false);
    if (!ok) {
      toast.error(t("language.saveFailed"));
      return;
    }
    await setLanguage(lang);
  };

  return (
    <SettingsSection
      id="language"
      title={t("language.title")}
      lead={t("language.lead")}
      action={
        <SegmentedControl
          aria-label={t("language.title")}
          value={currentLanguage()}
          onValueChange={(v) => isLanguage(v) && !busy && void change(v)}
        >
          {LOCALES.map((lang) => (
            <SegmentedControlItem key={lang} value={lang} lang={lang}>
              {LANGUAGE_NAMES[lang]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      }
    />
  );
}

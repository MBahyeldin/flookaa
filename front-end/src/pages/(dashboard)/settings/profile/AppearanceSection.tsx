import { SettingsSection } from "@/components/settings/SettingsSection";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useTheme } from "@/Theme.context";
import { useTranslation } from "react-i18next";

export function AppearanceSection() {
  const { t } = useTranslation("settings");
  const { isDarkMode, setDarkMode } = useTheme();

  return (
    <SettingsSection
      id="appearance"
      title={t("appearance.title")}
      lead={t("appearance.lead")}
      action={
        <SegmentedControl
          aria-label={t("appearance.title")}
          value={isDarkMode ? "dark" : "light"}
          onValueChange={(v) => setDarkMode(v === "dark")}
        >
          <SegmentedControlItem value="light">{t("appearance.light")}</SegmentedControlItem>
          <SegmentedControlItem value="dark">{t("appearance.dark")}</SegmentedControlItem>
        </SegmentedControl>
      }
    />
  );
}

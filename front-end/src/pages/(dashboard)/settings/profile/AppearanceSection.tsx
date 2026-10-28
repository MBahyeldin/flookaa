import { SettingsSection } from "@/components/settings/SettingsSection";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useTheme } from "@/Theme.context";

export function AppearanceSection() {
  const { isDarkMode, setDarkMode } = useTheme();

  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      lead="Light or dark, on this device. Applies at once."
      action={
        <SegmentedControl
          aria-label="Appearance"
          value={isDarkMode ? "dark" : "light"}
          onValueChange={(v) => setDarkMode(v === "dark")}
        >
          <SegmentedControlItem value="light">Light</SegmentedControlItem>
          <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
        </SegmentedControl>
      }
    />
  );
}

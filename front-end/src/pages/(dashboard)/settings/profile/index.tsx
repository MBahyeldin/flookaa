import { useEffect, useState } from "react";
import { SettingsError, SettingsHeader, SettingsPage, SettingsSkeleton } from "@/components/settings/SettingsPage";
import { getUserData } from "@/services/user";
import type { Profile } from "@/types/user";
import { AppearanceSection } from "./AppearanceSection";
import { EmailSection } from "./EmailSection";
import { ProfileSection } from "./ProfileSection";
import { LanguageSection } from "./LanguageSection";
import { LOCALES } from "@/i18n";
import { useTranslation } from "react-i18next";

export default function ProfilePage() {
  const { t } = useTranslation("settings");
  const sections = [
    { id: "profile", label: t("profile.title") },
    { id: "email", label: t("email.title") },
    ...(LOCALES.length > 1 ? [{ id: "language", label: t("language.title") }] : []),
    { id: "appearance", label: t("appearance.title") },
  ];
  const [profile, setProfile] = useState<Profile | null | "failed">(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setProfile(null);
    getUserData().then((p) => alive && setProfile(p ?? "failed"));
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (profile === "failed") {
    return <SettingsError title={t("loadFailed")} onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!profile) return <SettingsSkeleton />;

  return (
    <SettingsPage
      header={<SettingsHeader title={t("title")} lead={t("lead")} />}
      sections={sections}
    >
      <ProfileSection profile={profile} />
      <EmailSection profile={profile} />
      {LOCALES.length > 1 && <LanguageSection />}
      <AppearanceSection />
    </SettingsPage>
  );
}

import { useEffect, useState } from "react";
import { SettingsError, SettingsHeader, SettingsPage, SettingsSkeleton } from "@/components/settings/SettingsPage";
import { getUserData } from "@/services/user";
import type { Profile } from "@/types/user";
import { AppearanceSection } from "./AppearanceSection";
import { EmailSection } from "./EmailSection";
import { ProfileSection } from "./ProfileSection";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "email", label: "Email" },
  { id: "appearance", label: "Appearance" },
] as const;

export default function ProfilePage() {
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
    return <SettingsError title="Couldn't load your settings" onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!profile) return <SettingsSkeleton />;

  return (
    <SettingsPage
      header={<SettingsHeader title="Settings" lead="Your account. Each persona has its own settings under Personas." />}
      sections={SECTIONS}
    >
      <ProfileSection profile={profile} />
      <EmailSection profile={profile} />
      <AppearanceSection />
    </SettingsPage>
  );
}

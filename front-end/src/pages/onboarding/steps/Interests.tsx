import { useState } from "react";
import SectionLoader from "@/components/section-loader";
import InterestPicker from "@/components/interests/InterestPicker";
import { usePersonaInterests } from "@/components/interests/usePersonaInterests";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import OnboardingFooter from "../OnboardingFooter";
import { useTranslation } from "react-i18next";

// The step's Done checks the default persona, which may not be the current one in a catch-up.
export default function Interests() {
  const { t } = useTranslation(["onboarding", "common"]);
  const personas = useUserProfileStore((s) => s.personas);
  const defaultPersona = personas.find((p) => p.is_default) ?? personas[0];
  const { data, value, setValue, save, loadError } = usePersonaInterests(
    defaultPersona ? Number(defaultPersona.id) : undefined,
  );
  const [saveFailed, setSaveFailed] = useState(false);

  if (loadError) {
    return <p className="text-sm text-destructive">{t("common:interests.loadFailedReload")}</p>;
  }
  if (!data) return <SectionLoader />;

  const onContinue = async () => {
    setSaveFailed(false);
    const r = await save();
    if (!r.ok) setSaveFailed(true);
    return r.ok;
  };

  return (
    <div className="flex flex-col gap-6">
      <InterestPicker
        groups={data.groups}
        retired={data.retired}
        value={value}
        onChange={setValue}
        showCount={false}
      />
      {saveFailed && (
        <p role="alert" className="text-sm text-destructive text-end">
          {t("saveFailed")}
        </p>
      )}
      <OnboardingFooter
        left={t("selected", { count: value.length })}
        onContinue={onContinue}
        continueDisabled={value.length === 0}
      />
    </div>
  );
}

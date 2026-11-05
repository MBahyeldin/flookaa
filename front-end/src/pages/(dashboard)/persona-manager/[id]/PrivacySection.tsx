import { useEffect, useState } from "react";
import { Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { RadioCard, RadioCardGroup } from "@/components/ui/radio-card";
import { Switch } from "@/components/ui/switch";
import { privacyChangeHint } from "@/lib/privacyChangeHint";
import { getInviteLink } from "@/services/persona";
import type { Persona } from "@/types/persona";
import { privacyOptions, type Privacy } from "@/pages/onboarding/persona-wizard/options";
import { PrivacyWarning } from "@/pages/onboarding/persona-wizard/PrivacyStep";
import { usePersonaUpdate } from "./usePersonaUpdate";
import { useTranslation } from "react-i18next";

import { errorMessage } from "@/lib/errors";

const inviteUrl = (token: string) => `${window.location.origin}/follow/${token}`;

function FollowLinkRow({ personaId }: { personaId: number }) {
  const { t } = useTranslation(["personas", "common"]);

  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getInviteLink(personaId)
      .then((token) => alive && setToken(token))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [personaId]);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success(t("common:share.copied"));
    } catch {
      toast.error(t("common:share.copyFailed"));
    }
  };

  const reset = async () => {
    if (!confirm(t("followLink.resetConfirm"))) return;
    setBusy(true);
    try {
      setToken(await getInviteLink(personaId, true));
      toast.success(t("followLink.resetDone"));
    } catch (err) {
      toast.error(errorMessage((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4">
      <p className="text-sm font-medium">{t("followLink.title")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 basis-full truncate text-sm font-medium sm:basis-0 sm:flex-1">
          {token ? inviteUrl(token).replace(/^https?:\/\//, "") : failed ? t("followLink.loadFailed") : t("common:states.loading")}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={!token} onClick={copy}>
          <Link2 />
          {t("common:share.copyLink")}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!token || busy} onClick={reset}>
          <RefreshCw />
          {t("followLink.reset")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("followLink.hint")}</p>
    </div>
  );
}

export function PrivacySection({ persona }: { persona: Persona }) {
  const { t } = useTranslation("personas");
  const [privacy, setPrivacy] = useState<Privacy>(persona.privacy);
  const [showOnProfile, setShowOnProfile] = useState(persona.show_on_profile);
  const { save, saving } = usePersonaUpdate(persona);

  const shows = privacy === "public" && showOnProfile;
  const dirty = privacy !== persona.privacy || shows !== (persona.privacy === "public" && persona.show_on_profile);
  const warning = privacyChangeHint(persona)(privacy);

  const onSave = () => {
    // show_on_profile is public-only; leaving public clears it on the server.
    const next: Partial<Persona> = { privacy };
    if (privacy === "public") next.show_on_profile = showOnProfile;
    return save(next);
  };

  return (
    <SettingsSection
      id="privacy"
      title={t("settings.privacy.title")}
      lead={t("settings.privacy.lead")}
      onSave={onSave}
      dirty={dirty}
      saving={saving}
    >
      <RadioCardGroup aria-label={t("privacy.whoCanSee")}>
        {privacyOptions().map(({ value, label, note, icon }) => (
          <RadioCard key={value} icon={icon} title={label} body={note} checked={value === privacy} onSelect={() => setPrivacy(value)} />
        ))}
      </RadioCardGroup>

      {privacy === "public" && (
        <label className="flex items-start justify-between gap-4 rounded-lg bg-surface-sunken p-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{t("privacy.showOnProfile")}</span>
            <span className="text-xs text-muted-foreground">{t("privacy.showOnProfileNote")}</span>
          </span>
          <Switch checked={showOnProfile} onCheckedChange={setShowOnProfile} />
        </label>
      )}

      {privacy === "private" && persona.privacy === "private" && <FollowLinkRow personaId={Number(persona.id)} />}

      {warning && <PrivacyWarning>{warning}</PrivacyWarning>}
    </SettingsSection>
  );
}

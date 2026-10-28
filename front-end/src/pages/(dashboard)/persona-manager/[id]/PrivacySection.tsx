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
import { PRIVACY_OPTIONS, type Privacy } from "@/pages/onboarding/persona-wizard/options";
import { PrivacyWarning } from "@/pages/onboarding/persona-wizard/PrivacyStep";
import { usePersonaUpdate } from "./usePersonaUpdate";

const inviteUrl = (token: string) => `${window.location.origin}/follow/${token}`;

function FollowLinkRow({ personaId }: { personaId: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getInviteLink(personaId)
      .then((t) => alive && setToken(t))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [personaId]);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const reset = async () => {
    if (!confirm("Reset the link? The old link will stop working.")) return;
    setBusy(true);
    try {
      setToken(await getInviteLink(personaId, true));
      toast.success("New link created");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-4">
      <p className="text-sm font-medium">Follow-request link</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 basis-full truncate text-sm font-medium sm:basis-0 sm:flex-1">
          {token ? inviteUrl(token).replace(/^https?:\/\//, "") : failed ? "Couldn't load the link." : "Loading…"}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={!token} onClick={copy}>
          <Link2 />
          Copy link
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!token || busy} onClick={reset}>
          <RefreshCw />
          Reset
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Anyone with the link can ask to follow. Reset stops the old link working.</p>
    </div>
  );
}

export function PrivacySection({ persona }: { persona: Persona }) {
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
      title="Privacy"
      lead="Privacy decides what others see of this persona, not what it can do."
      onSave={onSave}
      dirty={dirty}
      saving={saving}
    >
      <RadioCardGroup aria-label="Who can see this persona">
        {PRIVACY_OPTIONS.map(({ value, label, note, icon }) => (
          <RadioCard key={value} icon={icon} title={label} body={note} checked={value === privacy} onSelect={() => setPrivacy(value)} />
        ))}
      </RadioCardGroup>

      {privacy === "public" && (
        <label className="flex items-start justify-between gap-4 rounded-lg bg-surface-sunken p-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Show on my profile</span>
            <span className="text-xs text-muted-foreground">
              Your linked personas list each other, with this persona's label, for anyone who visits them.
            </span>
          </span>
          <Switch checked={showOnProfile} onCheckedChange={setShowOnProfile} />
        </label>
      )}

      {privacy === "private" && persona.privacy === "private" && <FollowLinkRow personaId={Number(persona.id)} />}

      {warning && <PrivacyWarning>{warning}</PrivacyWarning>}
    </SettingsSection>
  );
}

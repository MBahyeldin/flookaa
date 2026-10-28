import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Lock, UserRound, UserRoundX } from "lucide-react";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { personaPath } from "@/components/persona-link";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from "@/themes/palettes";
import type { Persona } from "@/types/persona";
import { BasicsSection } from "./BasicsSection";
import { FollowersSection } from "./FollowersSection";
import { InterestsSection } from "./InterestsSection";
import { LookSection } from "./LookSection";
import { PrivacySection } from "./PrivacySection";

/** The editable sections, also used by the onboarding Personas step's sheet. */
export function PersonaSettingsSections({
  persona,
  onThemeDraft,
}: {
  persona: Persona;
  onThemeDraft: (theme: PaletteId) => void;
}) {
  return (
    <>
      <BasicsSection persona={persona} />
      <LookSection persona={persona} onThemeDraft={onThemeDraft} />
      <PrivacySection persona={persona} />
      <InterestsSection personaId={Number(persona.id)} />
    </>
  );
}

function Header({ persona }: { persona: Persona }) {
  const name = `${persona.first_name} ${persona.last_name}`.trim();
  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Back to personas">
        <Link to="/persona-manager">
          <ArrowLeft />
        </Link>
      </Button>
      <Avatar className="size-12 text-base">
        {persona.thumbnail && <AvatarImage src={persona.thumbnail} className="object-cover" />}
        <GeneratedAvatarFallback name={name || persona.slug} />
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="truncate text-h2 font-semibold tracking-tight">{name || persona.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>@{persona.slug}</span>
          <Badge variant="secondary" title="Only you see this label">
            <Lock />
            {persona.name}
          </Badge>
        </div>
      </div>
      <Button asChild variant="outline" className="max-md:hidden">
        <Link to={personaPath(persona.id)}>
          <UserRound />
          View profile
        </Link>
      </Button>
      <Button asChild variant="outline" size="icon" className="md:hidden" aria-label="View profile">
        <Link to={personaPath(persona.id)}>
          <UserRound />
        </Link>
      </Button>
    </div>
  );
}

function PersonaSettings({ persona }: { persona: Persona }) {
  const [theme, setTheme] = useState<PaletteId>(isPaletteId(persona.theme) ? persona.theme : DEFAULT_PALETTE);
  const sections = [
    { id: "basics", label: "Basics" },
    { id: "look", label: "Look" },
    { id: "privacy", label: "Privacy" },
    { id: "interests", label: "Interests" },
    ...(persona.privacy === "only_me" ? [] : [{ id: "followers", label: "Followers" }]),
  ];

  return (
    <div data-theme={theme} className="min-h-full bg-background text-foreground">
      <SettingsPage header={<Header persona={persona} />} sections={sections}>
        <PersonaSettingsSections persona={persona} onThemeDraft={setTheme} />
        {persona.privacy !== "only_me" && <FollowersSection personaId={Number(persona.id)} />}
      </SettingsPage>
    </div>
  );
}

export default function PersonaSettingsPage() {
  const { id } = useParams();
  const persona = useUserProfileStore((s) => s.personas.find((p) => String(p.id) === id));

  if (!persona) {
    return (
      <div className="mx-auto w-full max-w-[672px] px-4 py-12">
        <EmptyState
          icon={UserRoundX}
          title="Persona not found"
          body="It doesn't exist, or it isn't one of yours."
          action={
            <Button asChild variant="outline">
              <Link to="/persona-manager">Back to personas</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <PersonaSettings key={persona.id} persona={persona} />;
}

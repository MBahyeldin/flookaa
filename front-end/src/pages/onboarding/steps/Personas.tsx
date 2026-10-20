import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Plus, Settings } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { cn } from "@/lib/utils";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Persona } from "@/types/persona";
import { PersonaInterestsSection, PersonaSettingsForm } from "@/pages/(dashboard)/persona-manager/[id]";
import OnboardingFooter from "../OnboardingFooter";
import PersonaWizard, { type WizardMode } from "../persona-wizard/PersonaWizard";
import { PRIVACY_OPTIONS } from "../persona-wizard/options";

function PersonaCard({ persona, onManage }: { persona: Persona; onManage: () => void }) {
  const name = [persona.first_name, persona.last_name].filter(Boolean).join(" ");
  const privacy = PRIVACY_OPTIONS.find((o) => o.value === persona.privacy);
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border-2",
        persona.is_default ? "border-primary" : "border-border",
      )}
    >
      <div
        className={cn(
          "relative flex min-h-48 flex-col items-center justify-center gap-3 p-6",
          persona.is_default ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground",
        )}
      >
        <div className="absolute left-3 top-3 flex gap-2">
          {persona.is_default && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/30 bg-black/15 px-3 py-1 text-xs font-medium">
              <Globe className="h-3.5 w-3.5" />
              Default persona
            </span>
          )}
          {privacy && !persona.is_default && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", privacy.tone)}>
              <privacy.icon className="h-3.5 w-3.5" />
              {privacy.label}
            </span>
          )}
        </div>
        <Avatar className="h-16 w-16 border-4 border-background/40">
          <AvatarImage src={persona.thumbnail || undefined} className="object-cover" />
          <GeneratedAvatarFallback name={name || persona.slug} />
        </Avatar>
        <div className="text-center">
          <p className="text-lg font-semibold">{name || persona.slug}</p>
          <p className={cn("text-sm", persona.is_default ? "text-primary-foreground/80" : "text-muted-foreground")}>
            @{persona.slug}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onManage}
        className="flex items-center justify-center gap-2 bg-background py-4 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Settings className="h-4 w-4" />
        Manage persona
      </button>
    </div>
  );
}

export default function Personas() {
  const navigate = useNavigate();
  const personas = useUserProfileStore((s) => s.personas);
  const [wizard, setWizard] = useState<WizardMode | null>(null);
  const [managing, setManaging] = useState<Persona | null>(null);

  const ordered = [...personas].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
  const defaultPersona = ordered.find((p) => p.is_default) ?? ordered[0];
  // Read from the store so the sheet shows a save made inside it.
  const managed = managing ? (personas.find((p) => p.id === managing.id) ?? managing) : null;

  return (
    <div className="flex flex-col gap-8">
      <p className="mx-auto max-w-2xl text-center text-muted-foreground">
        Manage different digital identities for various aspects of your life. Each persona can have its own privacy
        settings and be shared selectively.
      </p>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h2 className="text-lg font-medium">Your personas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ordered.map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              onManage={() => (p.is_default ? setWizard({ kind: "edit", persona: p }) : setManaging(p))}
            />
          ))}
          <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/60 bg-card/50 p-6">
            <button
              type="button"
              onClick={() => setWizard({ kind: "create", privacy: "public" })}
              className="flex flex-col items-center gap-3 rounded-lg text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-6 w-6" />
              </span>
              <span className="font-medium">Add another persona</span>
            </button>
            <div className="flex flex-wrap justify-center gap-2">
              {PRIVACY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setWizard({ kind: "create", privacy: o.value })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    o.tone,
                  )}
                >
                  <o.icon className="h-3.5 w-3.5" />
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OnboardingFooter continueLabel="Finish" hideSkip onMoved={() => navigate("/", { replace: true })} />

      {wizard && defaultPersona && (
        <PersonaWizard
          key={wizard.kind === "edit" ? `edit-${wizard.persona.id}` : `create-${wizard.privacy}`}
          mode={wizard}
          catalogPersonaId={Number(defaultPersona.id)}
          onClose={() => setWizard(null)}
        />
      )}

      <Sheet open={!!managed} onOpenChange={(open) => !open && setManaging(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Manage persona</SheetTitle>
            <SheetDescription>Changes save to this persona only.</SheetDescription>
          </SheetHeader>
          {managed && (
            <div className="px-4 pb-6">
              <PersonaSettingsForm persona={managed} />
              <PersonaInterestsSection personaId={Number(managed.id)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

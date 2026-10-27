import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { PALETTES } from "@/themes/palettes";
import type { Persona } from "@/types/persona";
import { PersonaInterestsSection, PersonaSettingsForm } from "@/pages/(dashboard)/persona-manager/[id]";
import OnboardingFooter from "../OnboardingFooter";
import PersonaWizard, { type WizardMode } from "../persona-wizard/PersonaWizard";
import { PRIVACY_OPTIONS } from "../persona-wizard/options";

function PersonaRow({ persona, onManage }: { persona: Persona; onManage: () => void }) {
  const name = [persona.first_name, persona.last_name].filter(Boolean).join(" ") || persona.slug;
  const theme = PALETTES.find((p) => p.id === persona.theme)?.label;
  const privacy = PRIVACY_OPTIONS.find((o) => o.value === persona.privacy)?.label;
  const facts = [`@${persona.slug}`, theme && `${theme} theme`, privacy].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 text-card-foreground">
      <Avatar className="size-12">
        <AvatarImage src={persona.thumbnail || undefined} className="object-cover" />
        <GeneratedAvatarFallback name={name} />
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="w-full truncate text-sm font-semibold">{name}</p>
        <p className="w-full truncate text-xs text-muted-foreground">{facts}</p>
        {persona.is_default && <Badge variant="secondary">Default</Badge>}
      </div>
      <Button variant="outline" size="sm" onClick={onManage} aria-label={`Manage ${name}`}>
        Manage
      </Button>
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
    <div className="flex flex-col gap-4">
      {ordered.map((p) => (
        <PersonaRow
          key={p.id}
          persona={p}
          onManage={() => (p.is_default ? setWizard({ kind: "edit", persona: p }) : setManaging(p))}
        />
      ))}
      <button
        type="button"
        onClick={() => setWizard({ kind: "create" })}
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-5 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Add another persona</span>
        <span className="text-xs text-muted-foreground">
          A work self, a cooking self… each with its own name and theme.
        </span>
      </button>

      <OnboardingFooter continueLabel="Finish" hideSkip onMoved={() => navigate("/", { replace: true })} />

      {wizard && defaultPersona && (
        <PersonaWizard
          key={wizard.kind === "edit" ? `edit-${wizard.persona.id}` : "create"}
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

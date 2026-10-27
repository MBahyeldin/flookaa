import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonaRow, personaDisplayName } from "@/components/persona-row";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Persona } from "@/types/persona";
import { PersonaInterestsSection, PersonaSettingsForm } from "@/pages/(dashboard)/persona-manager/[id]";
import OnboardingFooter from "../OnboardingFooter";
import PersonaWizard, { type WizardMode } from "../persona-wizard/PersonaWizard";

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
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => (p.is_default ? setWizard({ kind: "edit", persona: p }) : setManaging(p))}
              aria-label={`Manage ${personaDisplayName(p)}`}
            >
              Manage
            </Button>
          }
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

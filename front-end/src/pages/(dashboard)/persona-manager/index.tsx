import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonaRow, personaDisplayName } from "@/components/persona-row";
import PersonaWizard from "@/pages/onboarding/persona-wizard/PersonaWizard";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export default function PersonaManagerPage() {
  const { persona, personas } = useUserProfileStore();
  const [creating, setCreating] = useState(false);
  const ordered = [...personas].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1>Personas</h1>
          <p className="max-w-2xl text-muted-foreground">
            Each persona is a facet of you, with its own name, theme and followers. People follow a persona, not you.
          </p>
        </div>
        <Button className="self-start md:self-auto" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New persona
        </Button>
      </header>

      {ordered.length === 0 ? (
        <EmptyState icon={UserRound} title="No personas yet" body="A persona is how you show up in channels and communities." />
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((p) => (
            <PersonaRow
              key={p.id}
              persona={p}
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/persona-manager/${p.id}`} aria-label={`Manage ${personaDisplayName(p)}`}>
                    Manage
                  </Link>
                </Button>
              }
            />
          ))}
        </div>
      )}

      {creating && persona && (
        <PersonaWizard mode={{ kind: "create" }} catalogPersonaId={Number(persona.id)} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PersonaRow, personaDisplayName } from "@/components/persona-row";
import PersonaWizard from "@/pages/onboarding/persona-wizard/PersonaWizard";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useTranslation } from "react-i18next";

export default function PersonaManagerPage() {
  const { t } = useTranslation("personas");
  const { persona, personas } = useUserProfileStore();
  const [creating, setCreating] = useState(false);
  const ordered = [...personas].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1>{t("manager.title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("manager.lead")}</p>
        </div>
        <Button className="self-start md:self-auto" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          {t("select.newPersona")}
        </Button>
      </header>

      {ordered.length === 0 ? (
        <EmptyState icon={UserRound} title={t("select.emptyTitle")} body={t("manager.emptyBody")} />
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((p) => (
            <PersonaRow
              key={p.id}
              persona={p}
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/persona-manager/${p.id}`} aria-label={t("manager.manageNamed", { name: personaDisplayName(p) })}>
                    {t("manager.manage")}
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

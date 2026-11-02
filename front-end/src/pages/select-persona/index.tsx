import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { PersonaRow, personaDisplayName } from "@/components/persona-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/Auth.context";
import PersonaWizard from "@/pages/onboarding/persona-wizard/PersonaWizard";
import { setCurrentPersona } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useTranslation } from "react-i18next";

export default function SelectPersonaPage() {
    const { t } = useTranslation(["personas", "common"]);
    const { personas } = useUserProfileStore();
    const { handleLogOut } = useAuth();
    const [choosing, setChoosing] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const ordered = [...personas].sort((a, b) => Number(!!b.is_default) - Number(!!a.is_default));
    const defaultPersona = ordered.find((p) => p.is_default) ?? ordered[0];

    const choose = async (id: string) => {
        setChoosing(id);
        if (await setCurrentPersona(id)) {
            // Reload like the sidebar switcher does: the websocket subscribes to the persona's default channel only on load.
            window.location.reload();
            return;
        }
        setChoosing(null);
        toast.error(t("common:shell.switchFailed"));
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="flex items-center justify-between px-4 py-4 md:px-10">
                <Brand />
                <Button variant="ghost" onClick={handleLogOut}>
                    {t("common:shell.logOut")}
                </Button>
            </header>

            <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 md:py-16">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-2">
                        <h1>{t("select.title")}</h1>
                        <p className="text-muted-foreground">{t("select.lead")}</p>
                    </div>
                    {defaultPersona && (
                        <Button variant="outline" className="shrink-0 self-start md:self-auto" onClick={() => setCreating(true)}>
                            <Plus aria-hidden />
                            {t("select.newPersona")}
                        </Button>
                    )}
                </div>

                {ordered.length === 0 ? (
                    <EmptyState icon={UserRound} title={t("select.emptyTitle")} body={t("select.emptyBody")} />
                ) : (
                    <div className="flex flex-col gap-3">
                        {ordered.map((p) => (
                            <PersonaRow
                                key={p.id}
                                persona={p}
                                action={
                                    <Button
                                        size="sm"
                                        variant={p.id === defaultPersona?.id ? "default" : "outline"}
                                        loading={choosing === p.id}
                                        disabled={choosing !== null}
                                        onClick={() => choose(p.id)}
                                        aria-label={t("select.continueAs", { name: personaDisplayName(p) })}
                                    >
                                        {t("common:actions.continue")}
                                    </Button>
                                }
                            />
                        ))}
                    </div>
                )}
            </main>

            {creating && defaultPersona && (
                <PersonaWizard
                    mode={{ kind: "create" }}
                    catalogPersonaId={Number(defaultPersona.id)}
                    onClose={() => setCreating(false)}
                />
            )}
        </div>
    );
}

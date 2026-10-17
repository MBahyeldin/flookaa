import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, UserRound, UserRoundX } from "lucide-react";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { personaPath } from "@/components/persona-link";
import { Form } from "@/models/Forms/Form";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { DEFAULT_PALETTE, isPaletteId } from "@/themes/palettes";
import type { Persona } from "@/types/persona";

const SETTINGS_FIELDS = [
  "name",
  "privacy",
  "description",
  "show_on_profile",
  "theme",
  "thumbnail",
  "first_name",
  "last_name",
  "slug",
  "bio",
] as const;

function PersonaSettingsForm({ persona }: { persona: Persona }) {
  const { updatePersonaInStore } = useUserProfileStore();
  const form = useMemo(() => Form.personaSettings(persona), [persona]);
  // Formik keeps its own values, so the initial values only depend on which persona this is.
  const initialValues = useMemo(
    () => Object.fromEntries(SETTINGS_FIELDS.map((key) => [key, persona[key] ?? ""])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persona.id],
  );
  const [draftTheme, setDraftTheme] = useState(persona.theme);

  const onValuesChange = useCallback((values: Record<string, unknown>) => {
    if (isPaletteId(values.theme)) setDraftTheme(values.theme);
  }, []);

  const onStatusChange = useCallback(
    (status: { success: boolean; error: string | null; result: unknown }) => {
      if (status.success && status.result) {
        const saved = status.result as Partial<Persona>;
        const { personas, persona: current, setPersona } = useUserProfileStore.getState();
        const stored = personas.find((p) => String(p.id) === String(saved.id));
        if (stored) updatePersonaInStore({ ...stored, ...saved, id: stored.id });
        if (current && String(current.id) === String(saved.id)) {
          setPersona({ ...current, ...saved, id: current.id });
        }
        toast.success("Persona saved");
      }
      if (status.error) {
        toast.error(`Couldn't save the persona: ${status.error}`);
      }
    },
    [updatePersonaInStore],
  );

  return (
    <div data-theme={draftTheme ?? DEFAULT_PALETTE} className="rounded-2xl bg-background p-4 text-foreground md:p-6">
      <FormComponent
        form={form}
        initialValues={initialValues}
        onStatusChange={onStatusChange}
        onValuesChange={onValuesChange}
        changeOpacityWhenSubmitting
      >
        <div className="flex justify-end">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            {form.submitText}
          </Button>
        </div>
      </FormComponent>
    </div>
  );
}

export default function PersonaSettingsPage() {
  const { id } = useParams();
  const persona = useUserProfileStore((s) => s.personas.find((p) => String(p.id) === id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to personas">
            <Link to="/persona-manager">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {persona ? persona.name : "Persona settings"}
          </h1>
        </div>
        {persona && (
          <Button asChild variant="outline">
            <Link to={personaPath(persona.id)}>
              <UserRound className="mr-2 h-4 w-4" />
              View profile
            </Link>
          </Button>
        )}
      </div>

      {persona ? (
        <PersonaSettingsForm key={persona.id} persona={persona} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <UserRoundX className="h-10 w-10" />
          <p className="text-lg font-medium text-foreground">Persona not found</p>
          <p className="text-sm">It doesn't exist, or it isn't one of yours.</p>
        </div>
      )}
    </div>
  );
}

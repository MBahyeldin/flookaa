import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SectionLoader from "@/components/section-loader";
import InterestPicker from "@/components/interests/InterestPicker";
import { applySavedPersona } from "@/lib/applySavedPersona";
import { privacyChangeHint } from "@/lib/formFields/persona";
import { SLUG_PATTERN } from "@/lib/slug";
import { getPersonaInterests, setPersonaInterests } from "@/services/interests";
import { createPersona, fetchUserPersonas, updatePersona } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from "@/themes/palettes";
import type { PersonaInterests } from "@/types/interest";
import type { Persona } from "@/types/persona";
import BasicsStep from "./BasicsStep";
import PrivacyStep from "./PrivacyStep";
import { OTHER_TYPE, PERSONA_TYPES, type Privacy } from "./options";

export type Draft = {
  thumbnail: string;
  first_name: string;
  last_name: string;
  slug: string;
  type: string;
  customType: string;
  theme: PaletteId;
  bio: string;
  privacy: Privacy;
};

export type WizardMode = { kind: "edit"; persona: Persona } | { kind: "create" };

const SLUG_ERROR = "Use 3–50 lowercase letters, digits or single hyphens.";
const SLUG_TAKEN = "Another of your personas already uses this user name.";

function initialDraft(mode: WizardMode): Draft {
  if (mode.kind === "create") {
    return { thumbnail: "", first_name: "", last_name: "", slug: "", type: "", customType: "", theme: DEFAULT_PALETTE, bio: "", privacy: "public" };
  }
  const p = mode.persona;
  const known = (PERSONA_TYPES as readonly string[]).includes(p.name);
  // "Default" is the column default the signup trigger leaves, not a type the user chose.
  const name = p.is_default && p.name === "Default" ? "" : p.name;
  return {
    thumbnail: p.thumbnail ?? "",
    first_name: p.first_name,
    last_name: p.last_name,
    slug: p.slug,
    type: known ? name : name ? OTHER_TYPE : "",
    customType: known ? "" : name,
    theme: isPaletteId(p.theme) ? p.theme : DEFAULT_PALETTE,
    bio: p.bio ?? "",
    privacy: p.privacy,
  };
}

const label = (d: Draft) => (d.type === OTHER_TYPE ? d.customType.trim() : d.type);

export default function PersonaWizard({
  mode,
  catalogPersonaId,
  onClose,
}: {
  mode: WizardMode;
  /** Whose ranked interest catalogue a new persona picks from. */
  catalogPersonaId: number;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => initialDraft(mode));
  const [slugTaken, setSlugTaken] = useState(false);
  const [catalogue, setCatalogue] = useState<PersonaInterests | null>(null);
  const [interests, setInterests] = useState<number[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  // Set once a new persona exists, so a retry after failed interests doesn't create another.
  const [createdId, setCreatedId] = useState<number | null>(null);

  const editing = mode.kind === "edit" ? mode.persona : null;
  const interestsPersonaId = editing ? Number(editing.id) : catalogPersonaId;

  useEffect(() => {
    let alive = true;
    getPersonaInterests(interestsPersonaId).then((r) => {
      if (!alive) return;
      if (!r.ok) return setLoadError(true);
      setCatalogue(r.data);
      if (editing) setInterests(r.data.selected);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestsPersonaId]);

  const set = (patch: Partial<Draft>) => {
    if ("slug" in patch) setSlugTaken(false);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const slugError = slugTaken ? SLUG_TAKEN : draft.slug && !SLUG_PATTERN.test(draft.slug) ? SLUG_ERROR : null;
  const basicsValid =
    SLUG_PATTERN.test(draft.slug) &&
    !slugTaken &&
    label(draft) !== "" &&
    (!!editing || (draft.first_name.trim() !== "" && draft.last_name.trim() !== ""));
  const privacyWarning = useMemo(
    () => (editing ? privacyChangeHint(editing)(draft.privacy) : null),
    [editing, draft.privacy],
  );

  const interestsChanged =
    !editing ||
    !catalogue ||
    interests.length !== catalogue.selected.length ||
    interests.some((id) => !catalogue.selected.includes(id));

  const onSlugError = (error: string) => {
    if (error !== "slug_taken" && error !== "invalid_slug") return false;
    if (error === "slug_taken") setSlugTaken(true);
    setStep(1);
    return true;
  };

  const saveEdit = async (persona: Persona) => {
    const next = { thumbnail: draft.thumbnail, name: label(draft), slug: draft.slug, theme: draft.theme, bio: draft.bio, privacy: draft.privacy };
    const current = { thumbnail: persona.thumbnail ?? "", name: persona.name, slug: persona.slug, theme: persona.theme, bio: persona.bio ?? "", privacy: persona.privacy };
    const changes = Object.fromEntries(
      Object.entries(next).filter(([k, v]) => current[k as keyof typeof current] !== v),
    );
    if (Object.keys(changes).length > 0) {
      const r = await updatePersona(persona.id, changes);
      if (!r.ok) {
        if (!onSlugError(r.error)) toast.error("Couldn't save the persona. Please try again.");
        return false;
      }
      applySavedPersona(r.data);
    }
    if (interestsChanged) {
      const r = await setPersonaInterests(Number(persona.id), interests);
      if (!r.ok) {
        toast.error("Couldn't save the interests. Please try again.");
        return false;
      }
    }
    return true;
  };

  const saveNew = async () => {
    let id = createdId;
    if (id === null) {
      const r = await createPersona({
        name: label(draft),
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        slug: draft.slug,
        thumbnail: draft.thumbnail,
        bio: draft.bio,
        theme: draft.theme,
        privacy: draft.privacy,
      });
      if (!r.ok) {
        if (!onSlugError(r.error)) toast.error("Couldn't create the persona. Please try again.");
        return false;
      }
      id = r.data.persona_id;
      setCreatedId(id);
      fetchUserPersonas().then(useUserProfileStore.getState().setPersonas);
    }
    const r = await setPersonaInterests(id, interests);
    if (!r.ok) {
      toast.error("The persona was created, but its interests weren't saved. Please try again.");
      return false;
    }
    return true;
  };

  const save = async () => {
    setSaving(true);
    const ok = editing ? await saveEdit(editing) : await saveNew();
    setSaving(false);
    if (!ok) return;
    toast.success(editing ? "Persona saved" : "Persona created");
    onClose();
  };

  const title = editing?.is_default ? "Your default persona" : editing ? "Edit persona" : "New persona";

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent data-theme={draft.theme} className="max-h-[90vh] overflow-y-auto bg-background text-foreground sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && <BasicsStep draft={draft} set={set} creating={!editing} slugError={slugError} />}
        {step === 2 && <PrivacyStep value={draft.privacy} onChange={(privacy) => set({ privacy })} warning={privacyWarning} />}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold">Interests</h3>
              <p className="text-sm text-muted-foreground">Pick at least one. They shape what this persona is shown.</p>
            </div>
            {loadError ? (
              <p className="text-sm text-destructive">Couldn't load interests. Please reload.</p>
            ) : !catalogue ? (
              <SectionLoader />
            ) : (
              <InterestPicker
                groups={catalogue.groups}
                retired={editing ? catalogue.retired : []}
                value={interests}
                onChange={setInterests}
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          {step > 1 && (
            <Button variant="ghost" disabled={saving} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button disabled={step === 1 && !basicsValid} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button loading={saving} disabled={interests.length === 0 || !catalogue} onClick={save}>
              Save persona
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useInputImage from "@/hooks/useInpuImage";
import { SLUG_PATTERN } from "@/lib/slug";
import type { Persona } from "@/types/persona";
import { usePersonaUpdate } from "./usePersonaUpdate";

const SLUG_HELP = "3–50 lowercase letters, digits or single hyphens.";

const valuesOf = (p: Persona) => ({
  thumbnail: p.thumbnail ?? "",
  name: p.name,
  first_name: p.first_name,
  last_name: p.last_name,
  slug: p.slug,
  bio: p.bio ?? "",
});

export function BasicsSection({ persona }: { persona: Persona }) {
  const saved = valuesOf(persona);
  const [draft, setDraft] = useState(saved);
  const [slugError, setSlugError] = useState<string | null>(null);
  const { save, saving } = usePersonaUpdate(persona, ["slug_taken", "invalid_slug"]);
  const fileInput = useRef<HTMLInputElement>(null);
  const { handleInputChange, isUploading } = useInputImage({
    initValue: saved.thumbnail,
    id: "thumbnail",
    setFieldValue: async (_field, value) => setDraft((d) => ({ ...d, thumbnail: String(value ?? "") })),
  });

  const set = (patch: Partial<typeof draft>) => {
    if ("slug" in patch) setSlugError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const trimmed = { ...draft, name: draft.name.trim(), first_name: draft.first_name.trim(), last_name: draft.last_name.trim() };
  const dirty = (Object.keys(saved) as (keyof typeof saved)[]).some((k) => trimmed[k] !== saved[k]);
  const slugInvalid = draft.slug !== "" && !SLUG_PATTERN.test(draft.slug);
  const valid = trimmed.name !== "" && trimmed.first_name !== "" && trimmed.last_name !== "" && SLUG_PATTERN.test(draft.slug);
  const displayName = `${draft.first_name} ${draft.last_name}`.trim() || draft.slug;

  const onSave = async () => {
    const error = await save(trimmed);
    if (error === "slug_taken") setSlugError("Another of your personas already uses this handle.");
    else if (error === "invalid_slug") setSlugError(SLUG_HELP);
    else if (!error) setDraft(trimmed);
  };

  return (
    <SettingsSection
      id="basics"
      title="Basics"
      lead="How this persona shows up to others."
      onSave={onSave}
      dirty={dirty}
      canSave={valid && !isUploading}
      saving={saving}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar className="size-16 text-xl md:size-20 md:text-2xl">
            {draft.thumbnail && <AvatarImage src={draft.thumbnail} className="object-cover" />}
            <GeneratedAvatarFallback name={displayName} />
          </Avatar>
          {isUploading && (
            <div role="status" aria-label="Uploading photo" className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileInput.current?.click()}>
              <Upload />
              Upload photo
            </Button>
            {draft.thumbnail && (
              <Button type="button" variant="ghost" size="sm" disabled={isUploading} onClick={() => set({ thumbnail: "" })}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Without a photo, your initials show.</p>
        </div>
      </div>

      <FormField
        label="Label"
        helper="Only you see this. It tells your personas apart."
        error={trimmed.name === "" ? "Enter a label" : null}
      >
        <Input maxLength={255} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="First name" error={trimmed.first_name === "" ? "Enter a first name" : null}>
          <Input maxLength={255} value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} />
        </FormField>
        <FormField label="Last name" error={trimmed.last_name === "" ? "Enter a last name" : null}>
          <Input maxLength={255} value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} />
        </FormField>
      </div>

      <FormField label="Handle" helper={SLUG_HELP} error={slugError ?? (slugInvalid ? SLUG_HELP : null)}>
        <Input
          placeholder="@quiet-otter"
          value={draft.slug ? `@${draft.slug}` : ""}
          onChange={(e) => set({ slug: e.target.value.replace(/^@+/, "").toLowerCase() })}
        />
      </FormField>

      <FormField label="Bio">
        <Textarea rows={3} placeholder="Tell others about this persona…" value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
      </FormField>
    </SettingsSection>
  );
}

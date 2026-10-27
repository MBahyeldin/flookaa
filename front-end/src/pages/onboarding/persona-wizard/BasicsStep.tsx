import { Upload, Loader2 } from "lucide-react";
import { useRef } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { FormField as Field } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import ThemeInput from "@/components/inputs/theme";
import useInputImage from "@/hooks/useInpuImage";
import { FormField } from "@/models/Forms/FormField";
import { OTHER_TYPE, PERSONA_TYPES } from "./options";
import type { Draft } from "./PersonaWizard";

const themeField = new FormField({ id: "theme", label: "Theme", type: "theme", interfaceType: "theme", width: "full" });

export default function BasicsStep({
  draft,
  set,
  creating,
  slugError,
}: {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  creating: boolean;
  slugError: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { url, handleInputChange, isUploading } = useInputImage({
    initValue: draft.thumbnail,
    id: "thumbnail",
    setFieldValue: async (_field, value) => set({ thumbnail: String(value ?? "") }),
  });
  const displayName = [draft.first_name, draft.last_name].filter(Boolean).join(" ") || draft.slug;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-semibold">Basics</h3>
        <p className="text-sm text-muted-foreground">How this persona looks to others.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            <AvatarImage src={url || undefined} className="object-cover" />
            <GeneratedAvatarFallback name={displayName} />
          </Avatar>
          {isUploading && (
            <div role="status" aria-label="Uploading image" className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
        <Button type="button" variant="outline" disabled={isUploading} onClick={() => fileInput.current?.click()}>
          <Upload />
          Upload avatar
        </Button>
      </div>

      {creating && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} />
          </Field>
          <Field label="Last name">
            <Input value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} />
          </Field>
        </div>
      )}

      <Field label="User name" error={slugError}>
        <Input
          placeholder="@quiet-otter"
          value={draft.slug ? `@${draft.slug}` : ""}
          onChange={(e) => set({ slug: e.target.value.replace(/^@+/, "").toLowerCase() })}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Label id="wizard-type-label">Persona type</Label>
        <div role="radiogroup" aria-labelledby="wizard-type-label" className="flex flex-wrap gap-2">
          {[...PERSONA_TYPES, OTHER_TYPE].map((t) => (
            <Chip
              key={t}
              kind="filter"
              role="radio"
              aria-checked={draft.type === t}
              aria-pressed={undefined}
              selected={draft.type === t}
              onClick={() => set({ type: t })}
            >
              {t}
            </Chip>
          ))}
        </div>
        {draft.type === OTHER_TYPE && (
          <Input
            aria-label="Your own type"
            placeholder="sporty, funny, family…"
            maxLength={100}
            value={draft.customType}
            onChange={(e) => set({ customType: e.target.value })}
          />
        )}
        <p className="text-xs text-muted-foreground">Only you see the type.</p>
      </div>

      <ThemeInput field={themeField} value={draft.theme} error={undefined} setFieldValue={async (_f, v) => set({ theme: v as Draft["theme"] })} />

      <Field label="Bio (optional)">
        <Textarea rows={3} placeholder="Tell others about this persona…" value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
      </Field>
    </div>
  );
}

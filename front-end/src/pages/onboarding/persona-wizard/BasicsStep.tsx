import { Upload, Loader2 } from "lucide-react";
import { useRef } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import ThemeInput from "@/components/inputs/theme";
import useInputImage from "@/hooks/useInpuImage";
import { cn } from "@/lib/utils";
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
        <h3 className="font-medium">Basic information</h3>
        <p className="text-sm text-muted-foreground">Give your persona a name and select its type</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-primary/40">
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
          <Upload className="mr-2 h-4 w-4" />
          Upload avatar
        </Button>
      </div>

      {creating && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wizard-first-name">First name *</Label>
            <Input id="wizard-first-name" value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wizard-last-name">Last name *</Label>
            <Input id="wizard-last-name" value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="wizard-slug">User name *</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <Input
            id="wizard-slug"
            className="pl-7"
            placeholder="quiet-otter"
            value={draft.slug}
            aria-invalid={!!slugError}
            onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
          />
        </div>
        {slugError && <p className="text-sm text-destructive">{slugError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label id="wizard-type-label">Persona type *</Label>
        <div role="radiogroup" aria-labelledby="wizard-type-label" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...PERSONA_TYPES, OTHER_TYPE].map((t) => {
            const checked = draft.type === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => set({ type: t })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  checked ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {t}
              </button>
            );
          })}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="wizard-bio">Bio (optional)</Label>
        <Textarea id="wizard-bio" rows={3} placeholder="Tell others about this persona..." value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
      </div>
    </div>
  );
}

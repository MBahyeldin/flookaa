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
import { ThemeSwatchGroup } from "@/components/ui/theme-swatch";
import useInputImage from "@/hooks/useInpuImage";
import { OTHER_TYPE, PERSONA_TYPES, personaTypeLabel, type PersonaType } from "./options";
import { useTranslation } from "react-i18next";
import type { Draft } from "./PersonaWizard";

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
  const { t } = useTranslation(["personas", "auth", "common"]);
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
        <h3 className="font-semibold">{t("settings.basics.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("wizard.basicsLead")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            <AvatarImage src={url || undefined} className="object-cover" />
            <GeneratedAvatarFallback name={displayName} />
          </Avatar>
          {isUploading && (
            <div role="status" aria-label={t("photo.uploading")} className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
        <Button type="button" variant="outline" disabled={isUploading} onClick={() => fileInput.current?.click()}>
          <Upload />
          {t("photo.upload")}
        </Button>
      </div>

      {creating && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth:fields.firstName")}>
            <Input value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} />
          </Field>
          <Field label={t("auth:fields.lastName")}>
            <Input value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} />
          </Field>
        </div>
      )}

      <Field label={t("fields.handle")} error={slugError}>
        <Input
          placeholder={t("fields.handlePlaceholder")}
          value={draft.slug ? `@${draft.slug}` : ""}
          onChange={(e) => set({ slug: e.target.value.replace(/^@+/, "").toLowerCase() })}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Label id="wizard-type-label">{t("wizard.type")}</Label>
        <div role="radiogroup" aria-labelledby="wizard-type-label" className="flex flex-wrap gap-2">
          {([...PERSONA_TYPES, OTHER_TYPE] as PersonaType[]).map((type) => (
            <Chip
              key={type}
              kind="filter"
              role="radio"
              aria-checked={draft.type === type}
              aria-pressed={undefined}
              selected={draft.type === type}
              onClick={() => set({ type })}
            >
              {personaTypeLabel(type)}
            </Chip>
          ))}
        </div>
        {draft.type === OTHER_TYPE && (
          <Input
            aria-label={t("wizard.ownType")}
            placeholder={t("wizard.ownTypePlaceholder")}
            maxLength={100}
            value={draft.customType}
            onChange={(e) => set({ customType: e.target.value })}
          />
        )}
        <p className="text-xs text-muted-foreground">{t("wizard.typeOnlyYou")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label id="wizard-theme-label">{t("common:look.theme")}</Label>
        <ThemeSwatchGroup aria-labelledby="wizard-theme-label" value={draft.theme} onChange={(theme) => set({ theme })} />
      </div>

      <Field label={t("wizard.bioOptional")}>
        <Textarea rows={3} placeholder={t("fields.bioPlaceholder")} value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
      </Field>
    </div>
  );
}

import { useEffect, useState } from "react";
import { CreatePreview } from "@/components/create-form/CreatePreview";
import { LogoUpload } from "@/components/create-form/LogoUpload";
import { CoverField, FieldError, ThemeField } from "@/components/create-form/fields";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { DEFAULT_PALETTE, type PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";
import type { Interest } from "@/types/interest";
import { t } from "@/i18n";
import { errorMessage } from "@/lib/errors";

const FIELDS: Record<string, string> = { invalid_logo: "thumbnail", invalid_theme: "theme", invalid_cover_pattern: "cover_pattern" };

export type Look = { thumbnail: string; theme: PaletteId | null; cover_pattern: CoverPattern };

/** onSave gets only the changed fields (theme null = the community's) and answers an error code or null. */
export function LookSection({
  look,
  inherit,
  name,
  description,
  interests,
  facts,
  lead,
  onSave,
}: {
  look: Look;
  /** The community's palette, offered as the first swatch. */
  inherit?: PaletteId;
  name: string;
  description: string;
  interests: Interest[];
  facts: string[];
  lead: string;
  onSave: (changes: Partial<Look>) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(look);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);

  useEffect(() => setDraft(look), [look]);

  const changes: Partial<Look> = {};
  if (draft.thumbnail !== look.thumbnail) changes.thumbnail = draft.thumbnail;
  if (draft.theme !== look.theme) changes.theme = draft.theme;
  if (draft.cover_pattern !== look.cover_pattern) changes.cover_pattern = draft.cover_pattern;
  const dirty = Object.keys(changes).length > 0;
  const shown = draft.theme ?? inherit ?? DEFAULT_PALETTE;

  const save = async () => {
    setSaving(true);
    setError(null);
    const code = await onSave(changes);
    setSaving(false);
    if (code && FIELDS[code]) setError({ field: FIELDS[code], message: errorMessage(code) });
  };

  return (
    <SettingsSection id="look" title={t("common:look.title")} lead={lead} dirty={dirty} saving={saving} onSave={save}>
      <CreatePreview
        theme={shown}
        cover={draft.cover_pattern}
        name={name}
        placeholder={name}
        logo={draft.thumbnail}
        description={description}
        interests={interests}
        facts={facts}
      />
      <LogoUpload
        name={name}
        theme={shown}
        value={draft.thumbnail}
        error={error?.field === "thumbnail" ? error.message : undefined}
        onChange={(thumbnail) => setDraft((d) => ({ ...d, thumbnail }))}
      />
      <ThemeField
        value={draft.theme}
        inherit={inherit}
        onChange={(theme) => setDraft((d) => ({ ...d, theme }))}
      />
      <FieldError>{error?.field === "theme" ? error.message : undefined}</FieldError>
      <CoverField value={draft.cover_pattern} onChange={(cover_pattern) => setDraft((d) => ({ ...d, cover_pattern }))} />
      <FieldError>{error?.field === "cover_pattern" ? error.message : undefined}</FieldError>
    </SettingsSection>
  );
}

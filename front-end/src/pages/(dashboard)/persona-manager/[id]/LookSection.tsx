import { useState } from "react";
import { Cover } from "@/components/cover";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CoverOptionGroup } from "@/components/ui/cover-option";
import { Label } from "@/components/ui/label";
import { ThemeSwatchGroup } from "@/components/ui/theme-swatch";
import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";
import type { Persona } from "@/types/persona";
import { usePersonaUpdate } from "./usePersonaUpdate";

const DEFAULT_COVER: CoverPattern = "waves";

function Preview({ persona, theme, cover }: { persona: Persona; theme: PaletteId; cover: CoverPattern }) {
  const name = `${persona.first_name} ${persona.last_name}`.trim();
  return (
    <div data-theme={theme} className="flex justify-center rounded-lg bg-surface-sunken p-4 md:p-6" aria-label="Preview">
      <div className="w-full max-w-[340px] overflow-hidden rounded-lg border bg-background text-foreground">
        <div className="-mb-7 h-24">
          <Cover pattern={cover} />
        </div>
        <div className="flex flex-col items-start gap-2 px-4 pb-4">
          <Avatar className="size-14 text-lg ring-4 ring-background">
            {persona.thumbnail && <AvatarImage src={persona.thumbnail} className="object-cover" />}
            <GeneratedAvatarFallback name={name || persona.slug} />
          </Avatar>
          <Badge variant="secondary">@{persona.slug}</Badge>
          <p className="text-h3 font-semibold tracking-tight break-words">{name}</p>
          {persona.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{persona.bio}</p>}
        </div>
      </div>
    </div>
  );
}

export function LookSection({ persona, onThemeDraft }: { persona: Persona; onThemeDraft: (theme: PaletteId) => void }) {
  const savedTheme = isPaletteId(persona.theme) ? persona.theme : DEFAULT_PALETTE;
  const savedCover = persona.cover_pattern ?? DEFAULT_COVER;
  const [theme, setTheme] = useState(savedTheme);
  const [cover, setCover] = useState(savedCover);
  const { save, saving } = usePersonaUpdate(persona);

  const pickTheme = (next: PaletteId) => {
    setTheme(next);
    onThemeDraft(next);
  };

  return (
    <SettingsSection
      id="look"
      title="Look"
      lead="Your profile's colours and cover. The preview changes as you pick."
      onSave={() => save({ theme, cover_pattern: cover })}
      dirty={theme !== savedTheme || cover !== savedCover}
      saving={saving}
    >
      <Preview persona={persona} theme={theme} cover={cover} />
      <div className="flex flex-col gap-2">
        <Label id="look-theme">Theme</Label>
        <ThemeSwatchGroup aria-labelledby="look-theme" value={theme} onChange={pickTheme} />
      </div>
      <div className="flex flex-col gap-2">
        <Label id="look-cover">Cover</Label>
        <CoverOptionGroup aria-labelledby="look-cover" value={cover} onChange={setCover} />
      </div>
    </SettingsSection>
  );
}

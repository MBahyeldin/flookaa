import type { ReactNode } from "react";
import { EyeOff, Globe, Lock, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { personaInitials } from "@/lib/personaInitials";
import { cn } from "@/lib/utils";
import { DEFAULT_PALETTE, isPaletteId, paletteLabel } from "@/themes/palettes";
import type { Persona } from "@/types/persona";
import { useTranslation } from "react-i18next";

const PRIVACY_ICONS: Record<Persona["privacy"], LucideIcon> = { public: Globe, private: Lock, only_me: EyeOff };

export function personaDisplayName(p: Persona) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || `@${p.slug}`;
}

export function PersonaRow({ persona, action, className }: { persona: Persona; action?: ReactNode; className?: string }) {
  const { t } = useTranslation("personas");
  const theme = isPaletteId(persona.theme) ? persona.theme : DEFAULT_PALETTE;
  const PrivacyIcon = PRIVACY_ICONS[persona.privacy];

  return (
    <div
      data-theme={theme}
      className={cn("flex items-center gap-4 rounded-xl border bg-card p-4 text-card-foreground", className)}
    >
      <span aria-hidden className="h-10 w-1 shrink-0 self-center rounded-full bg-primary" />
      <Avatar size="md">
        <AvatarImage src={persona.thumbnail || undefined} className="object-cover" />
        <AvatarFallback>{personaInitials(persona)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p dir="auto" className="truncate text-match-parent text-sm font-semibold">{personaDisplayName(persona)}</p>
        <p className="text-xs break-words text-muted-foreground">
          <span dir="ltr">@{persona.slug}</span>
          {` · ${t("row.theme", { theme: paletteLabel(theme) })}`}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        {PrivacyIcon && (
          <Badge variant="secondary">
            <PrivacyIcon aria-hidden />
            {t(`privacy.${persona.privacy}.label`)}
          </Badge>
        )}
        {persona.is_default && <Badge variant="secondary">{t("row.default")}</Badge>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

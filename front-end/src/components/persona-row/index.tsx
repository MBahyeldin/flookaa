import type { ReactNode } from "react";
import { EyeOff, Globe, Lock, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { personaInitials } from "@/lib/personaInitials";
import { cn } from "@/lib/utils";
import { DEFAULT_PALETTE, PALETTES, isPaletteId } from "@/themes/palettes";
import type { Persona } from "@/types/persona";

const PRIVACY: Record<Persona["privacy"], { label: string; icon: LucideIcon }> = {
  public: { label: "Public", icon: Globe },
  private: { label: "Private", icon: Lock },
  only_me: { label: "Only me", icon: EyeOff },
};

export function personaDisplayName(p: Persona) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || `@${p.slug}`;
}

export function PersonaRow({ persona, action, className }: { persona: Persona; action?: ReactNode; className?: string }) {
  const theme = isPaletteId(persona.theme) ? persona.theme : DEFAULT_PALETTE;
  const themeLabel = PALETTES.find((p) => p.id === theme)?.label;
  const privacy = PRIVACY[persona.privacy];
  const PrivacyIcon = privacy?.icon;

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
        <p className="truncate text-sm font-semibold">{personaDisplayName(persona)}</p>
        <p className="text-xs break-words text-muted-foreground">
          @{persona.slug}
          {themeLabel && ` · ${themeLabel} theme`}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        {privacy && (
          <Badge variant="secondary">
            <PrivacyIcon aria-hidden />
            {privacy.label}
          </Badge>
        )}
        {persona.is_default && <Badge variant="secondary">Default</Badge>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

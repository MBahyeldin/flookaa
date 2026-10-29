import { Cover } from "@/components/cover";
import InterestChips from "@/components/interests/InterestChips";
import { Logo } from "@/components/ui/logo";
import type { PaletteId } from "@/themes/palettes";
import type { CoverPattern } from "@/types/cover";
import type { Interest } from "@/types/interest";

export function CreatePreview({
  theme,
  cover,
  name,
  placeholder,
  logo,
  description,
  interests,
  facts,
}: {
  theme: PaletteId;
  cover: CoverPattern;
  name: string;
  placeholder: string;
  logo: string;
  description: string;
  interests: Interest[];
  facts: string[];
}) {
  const shown = name.trim() || placeholder;
  return (
    <div data-theme={theme} className="overflow-hidden rounded-lg border bg-background text-foreground">
      <div className="-mb-10 h-[130px]">
        <Cover pattern={cover} />
      </div>
      <div className="flex flex-col items-start gap-2 px-4 pb-5">
        <Logo name={name.trim() || "?"} src={logo || null} size="lg" className="relative" />
        <InterestChips interests={interests} limit={3} />
        <p className="w-full text-h2 font-semibold tracking-tight break-words">{shown}</p>
        {description.trim() && <p className="line-clamp-2 text-muted-foreground">{description}</p>}
        <p className="text-xs text-muted-foreground">{facts.join(" · ")}</p>
      </div>
    </div>
  );
}

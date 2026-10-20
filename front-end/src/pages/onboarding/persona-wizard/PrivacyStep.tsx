import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIVACY_OPTIONS, type Privacy } from "./options";

export default function PrivacyStep({
  value,
  onChange,
  warning,
}: {
  value: Privacy;
  onChange: (privacy: Privacy) => void;
  warning: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Who can see this persona" className="flex flex-col gap-3">
        {PRIVACY_OPTIONS.map(({ value: option, label, note, icon: Icon, tone }) => {
          const checked = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option)}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                checked ? tone : "border-transparent bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex flex-col">
                <span className={cn("flex items-center gap-2 font-medium", checked && "text-foreground")}>
                  {label}
                  {checked && <Check className="h-4 w-4" />}
                </span>
                <span className={cn("text-sm", checked && "text-foreground/80")}>{note}</span>
              </span>
            </button>
          );
        })}
      </div>
      {warning && (
        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          {warning}
        </p>
      )}
      <p className="rounded-lg border bg-muted/50 p-3 text-sm">
        <span className="font-semibold">Tip:</span> You can change privacy settings at any time.
      </p>
    </div>
  );
}

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
        {PRIVACY_OPTIONS.map(({ value: option, label, note, icon: Icon }) => {
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
                checked ? "border-primary bg-accent" : "bg-card hover:tint",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {label}
                  {checked && <Check className="size-4 text-primary" />}
                </span>
                <span className="text-xs text-muted-foreground">{note}</span>
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
      <p className="text-xs text-muted-foreground">You can change this any time.</p>
    </div>
  );
}

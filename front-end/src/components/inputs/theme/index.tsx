import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEFAULT_PALETTE, PALETTES } from "@/themes/palettes";
import type { FormFieldProps } from "@/types/FormFields";

export default function ThemeInput({
  setFieldValue,
  error,
  touched,
  className,
  value,
  field,
}: FormFieldProps) {
  const selected = value || DEFAULT_PALETTE;

  return (
    <div className={cn(className, field.width)}>
      <Label id={`${field.id}-label`}>{field.label}</Label>
      <div
        role="radiogroup"
        aria-labelledby={`${field.id}-label`}
        className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {PALETTES.map((palette) => {
          const checked = palette.id === selected;
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={checked}
              data-theme={palette.id}
              onClick={() => setFieldValue(field.id, palette.id)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border bg-background p-3 text-left text-foreground transition-shadow",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                checked ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{palette.label}</span>
                {checked && <Check className="size-4 text-primary" />}
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2">
                <span className="h-1.5 w-3/4 rounded-full bg-foreground/70" />
                <span className="h-1.5 w-1/2 rounded-full bg-muted-foreground/50" />
                <span className="mt-1 h-4 w-12 rounded-md bg-primary" />
              </div>
            </button>
          );
        })}
      </div>
      {error && touched && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

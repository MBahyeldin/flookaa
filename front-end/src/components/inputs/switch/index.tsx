import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "@/types/FormFields";

export default function SwitchInput({
  setFieldValue,
  error,
  touched,
  className,
  value,
  field,
}: FormFieldProps) {
  const hint = field.hint?.(String(value === true));
  return (
    <div className={cn(className, field.width)}>
      <div className="flex items-center gap-2">
        <Switch
          id={field.id}
          checked={value === true}
          onCheckedChange={(checked) => setFieldValue(field.id, checked)}
        />
        <Label htmlFor={field.id}>{field.label}</Label>
      </div>
      {error && touched ? (
        <p className="text-sm text-destructive mt-1">{error}</p>
      ) : (
        hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
}

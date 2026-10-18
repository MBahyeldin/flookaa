import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import InterestPicker from "@/components/interests/InterestPicker";
import { cn } from "@/lib/utils";
import { listInterests } from "@/services/interests";
import { MAX_CHANNEL_INTERESTS, type InterestGroup } from "@/types/interest";
import type { FormFieldProps } from "@/types/FormFields";

export default function InterestsInput({ field, value, error, touched, setFieldValue, className }: FormFieldProps) {
  const [groups, setGroups] = useState<InterestGroup[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const ids = Array.isArray(value) ? (value as number[]) : [];

  useEffect(() => {
    let alive = true;
    listInterests().then((r) => {
      if (!alive) return;
      if (r.ok) setGroups(r.data);
      else setLoadError(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={cn(className, field.width, "flex flex-col gap-2")}>
      <Label id={`${field.id}-label`}>{field.label}</Label>
      {loadError ? (
        <p className="text-sm text-destructive">Couldn't load interests. Please reload.</p>
      ) : !groups ? (
        <p className="text-sm text-muted-foreground">Loading interests…</p>
      ) : (
        <InterestPicker
          groups={groups}
          retired={[]}
          value={ids}
          onChange={(next) => setFieldValue(field.id, next)}
          max={MAX_CHANNEL_INTERESTS}
        />
      )}
      {error && (touched || ids.length > 0) && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

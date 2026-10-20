import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MIN_AGES, MIN_AGE_ERROR } from "@/lib/minAge";
import { setChannelMinAge } from "@/services/channels";

export default function ChannelSettingsPanel({
  channelId,
  minAge,
  onSaved,
}: {
  channelId: string;
  minAge: number;
  onSaved?: (minAge: number) => void;
}) {
  const [value, setValue] = useState(String(minAge));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setValue(String(minAge)), [minAge]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const next = Number(value);
    const result = await setChannelMinAge(channelId, next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error === "invalid_min_age" ? MIN_AGE_ERROR : "Couldn't save the age limit.");
      return;
    }
    toast.success(`Only people ${next} and over can see this channel`);
    onSaved?.(result.minAge);
  };

  return (
    <div className="space-y-3 py-2">
      <div className="space-y-2">
        <Label htmlFor="channel-min-age">Minimum age</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id="channel-min-age" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MIN_AGES.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Younger users won't see the channel at all, members included.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button size="sm" onClick={save} disabled={saving || value === String(minAge)}>
        Save
      </Button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import InterestPicker from "@/components/interests/InterestPicker";
import { getChannelInterests, setChannelInterests } from "@/services/channels";
import { listInterests } from "@/services/interests";
import { MAX_CHANNEL_INTERESTS, type Interest, type InterestGroup } from "@/types/interest";

export default function ChannelInterestsEditor({
  channelId,
  onSaved,
}: {
  channelId: string;
  onSaved?: (interests: Interest[]) => void;
}) {
  const [groups, setGroups] = useState<InterestGroup[] | null>(null);
  const [current, setCurrent] = useState<Interest[]>([]);
  const [value, setValue] = useState<number[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([listInterests(), getChannelInterests(channelId)]).then(([catalogue, tags]) => {
      if (!alive) return;
      if (!catalogue.ok || !tags.ok) {
        setLoadError(true);
        return;
      }
      setGroups(catalogue.data);
      setCurrent(tags.data.interests);
      setValue(tags.data.interests.map((i) => i.id));
    });
    return () => {
      alive = false;
    };
  }, [channelId]);

  if (loadError) return <p className="py-6 text-sm text-destructive">Couldn't load interests. Please try again.</p>;
  if (!groups) {
    return (
      <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const active = new Set(groups.flatMap((g) => g.interests.map((i) => i.id)));
  const retired = current.filter((i) => !active.has(i.id));
  const dirty = value.length !== current.length || value.some((id) => !current.some((i) => i.id === id));

  const save = async () => {
    setSaving(true);
    const r = await setChannelInterests(channelId, value);
    setSaving(false);
    if (!r.ok) {
      toast.error("Couldn't save the interests. Please try again.");
      return;
    }
    setCurrent(r.data.interests);
    setValue(r.data.interests.map((i) => i.id));
    onSaved?.(r.data.interests);
    toast.success("Interests saved");
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <InterestPicker groups={groups} retired={retired} value={value} onChange={setValue} max={MAX_CHANNEL_INTERESTS} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {value.length === 0 && <p className="text-sm text-muted-foreground">Pick at least one.</p>}
        <Button onClick={save} disabled={!dirty || value.length === 0 || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save interests"}
        </Button>
      </div>
    </div>
  );
}

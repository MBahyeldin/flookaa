import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getSuggestedChannels, type SuggestedChannel } from "@/services/suggestions";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { ChannelTile } from "@/components/tile/ChannelTile";
import OnboardingFooter from "../OnboardingFooter";

const groups = [
  { source: "community", title: "From your communities" },
  { source: "interest", title: "Based on your interests" },
] as const;

// Suggestions are public only. The onboarding page made the default persona current, so its suggestions and actions are the same persona's.
export default function Channels() {
  const persona = useUserProfileStore((s) => s.persona);
  const [items, setItems] = useState<SuggestedChannel[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!persona) return;
    let cancelled = false;
    setLoadError(false);
    getSuggestedChannels(Number(persona.id), { limit: 50 }).then((r) => {
      if (cancelled) return;
      if (r.ok) setItems(r.data.channels);
      else setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [persona, attempt]);

  if (loadError) {
    return <ErrorState title="Couldn't load channels" onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!items) return <SkeletonList count={3} variant="post" className="grid gap-4 sm:grid-cols-2" />;

  const update = (id: string, patch: (c: SuggestedChannel) => Partial<SuggestedChannel>) =>
    setItems((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)) ?? null);

  const selected = items.filter((c) => c.is_member || c.is_follower).length;
  const shown = groups
    .map((g) => ({ ...g, channels: items.filter((c) => c.source === g.source) }))
    .filter((g) => g.channels.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {shown.length === 0 && (
        <EmptyState
          icon={Hash}
          title="No suggestions yet"
          body="Nothing matches your interests yet. You can skip this step."
        />
      )}
      {shown.map((g) => (
        <section key={g.source} className="flex flex-col gap-3">
          {shown.length > 1 && <h2 className="text-overline font-semibold uppercase text-muted-foreground">{g.title}</h2>}
          <div className="grid gap-4 sm:grid-cols-2">
            {g.channels.map((c) => (
              <ChannelTile
                key={c.id}
                channel={c}
                linked={false}
                onChange={(patch) => update(c.id, () => patch)}
              />
            ))}
          </div>
        </section>
      ))}
      <OnboardingFooter left={`${selected} selected`} continueDisabled={selected === 0} />
    </div>
  );
}

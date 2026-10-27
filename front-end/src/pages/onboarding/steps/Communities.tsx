import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getSuggestedCommunities } from "@/services/suggestions";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Community } from "@/types/community";
import { CommunityTile } from "@/components/tile/CommunityTile";
import OnboardingFooter from "../OnboardingFooter";

// Suggestions are public only. The onboarding page made the default persona current, so its suggestions and actions are the same persona's.
export default function Communities() {
  const persona = useUserProfileStore((s) => s.persona);
  const [items, setItems] = useState<Community[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!persona) return;
    let cancelled = false;
    setLoadError(false);
    getSuggestedCommunities(Number(persona.id), { limit: 50 }).then((r) => {
      if (cancelled) return;
      if (r.ok) setItems(r.data.communities);
      else setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [persona, attempt]);

  if (loadError) {
    return <ErrorState title="Couldn't load communities" onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!items) return <SkeletonList count={3} variant="post" className="grid gap-4 sm:grid-cols-2" />;

  const update = (id: number, patch: (c: Community) => Partial<Community>) =>
    setItems((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)) ?? null);

  const selected = items.filter((c) => c.membership_status === "active" || c.following).length;

  return (
    <div className="flex flex-col gap-6">
      {items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No suggestions yet"
          body="Nothing matches your interests yet. You can skip this step."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((c) => (
            <CommunityTile key={c.id} community={c} linked={false} onChange={(patch) => update(c.id, () => patch)} />
          ))}
        </div>
      )}
      <OnboardingFooter left={`${selected} selected`} continueDisabled={selected === 0} />
    </div>
  );
}

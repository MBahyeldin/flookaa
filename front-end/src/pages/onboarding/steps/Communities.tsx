import { useEffect, useState } from "react";
import { Boxes, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CommunityRulesDialog } from "@/components/community-rules-dialog";
import { followCommunity, joinCommunity, leaveCommunity, unfollowCommunity } from "@/services/communities";
import { getSuggestedCommunities } from "@/services/suggestions";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Community } from "@/types/community";
import { CommunityCardBody } from "@/pages/(dashboard)/communities/CommunityCard";
import OnboardingFooter from "../OnboardingFooter";

// Suggestions are public only. The onboarding page made the default persona current, so its suggestions and actions are the same persona's.
export default function Communities() {
  const persona = useUserProfileStore((s) => s.persona);
  const [items, setItems] = useState<Community[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rulesFor, setRulesFor] = useState<Community | null>(null);

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
  if (!items) return <SkeletonList count={3} variant="post" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />;

  const update = (id: number, patch: (c: Community) => Partial<Community>) =>
    setItems((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)) ?? null);

  const run = async <T,>(
    id: number,
    action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
    onDone: (data: T) => void,
    failure: string,
  ) => {
    setBusyId(id);
    const r = await action();
    setBusyId(null);
    if (r.ok) onDone(r.data);
    else toast.error(failure);
  };

  const doJoin = (c: Community) =>
    run(
      c.id,
      () => joinCommunity(c.id),
      ({ status }) =>
        update(c.id, (prev) => ({
          membership_status: status,
          members_count: prev.members_count + (status === "active" ? 1 : 0),
        })),
      "Couldn't join. Please try again.",
    );

  const leave = (c: Community) => {
    if (!confirm(`Leave ${c.name}?`)) return;
    run(
      c.id,
      () => leaveCommunity(c.id),
      () => update(c.id, (prev) => ({ membership_status: "none", members_count: prev.members_count - 1 })),
      "Couldn't leave. Please try again.",
    );
  };

  const toggleFollow = (c: Community) =>
    run(
      c.id,
      () => (c.following ? unfollowCommunity(c.id) : followCommunity(c.id)),
      ({ following }) => update(c.id, () => ({ following })),
      c.following ? "Couldn't unfollow. Please try again." : "Couldn't follow. Please try again.",
    );

  const selected = items.filter((c) => c.membership_status === "active" || c.following).length;

  return (
    <div className="flex flex-col gap-8">
      {items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No suggestions yet"
          body="Nothing matches your interests yet. You can skip this step."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const busy = busyId === c.id;
            return (
              <Card key={c.id} className="overflow-hidden pt-0">
                <CommunityCardBody community={c}>
                  <div className="flex flex-wrap gap-2">
                    {c.membership_status === "active" ? (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => leave(c)}>
                        <Check className="mr-2 h-4 w-4" />
                        Joined
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busy} onClick={() => (c.rules ? setRulesFor(c) : doJoin(c))}>
                        Join
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => toggleFollow(c)}>
                      {c.following ? "Following" : "Follow"}
                    </Button>
                  </div>
                </CommunityCardBody>
              </Card>
            );
          })}
        </div>
      )}
      <OnboardingFooter left={`${selected} selected`} continueDisabled={selected === 0} />
      {rulesFor && (
        <CommunityRulesDialog
          community={rulesFor}
          open
          onOpenChange={(open) => !open && setRulesFor(null)}
          onAgree={() => doJoin(rulesFor)}
        />
      )}
    </div>
  );
}

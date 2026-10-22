import { useEffect, useState } from "react";
import { Check, Heart, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SectionLoader from "@/components/section-loader";
import { joinChannel, leaveChannel, setFollowing } from "@/services/channels";
import { getSuggestedChannels, type SuggestedChannel } from "@/services/suggestions";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { ChannelCardBody } from "@/pages/(dashboard)/channels/ChannelCard";
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
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!persona) return;
    let cancelled = false;
    getSuggestedChannels(Number(persona.id), { limit: 50 }).then((r) => {
      if (cancelled) return;
      if (r.ok) setItems(r.data.channels);
      else setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [persona]);

  if (loadError) {
    return <p className="text-center text-sm text-destructive">Couldn't load channels. Please reload.</p>;
  }
  if (!items) return <SectionLoader />;

  const update = (id: string, patch: (c: SuggestedChannel) => Partial<SuggestedChannel>) =>
    setItems((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)) ?? null);

  const join = async (c: SuggestedChannel) => {
    setBusyId(c.id);
    const r = await joinChannel(c.id);
    setBusyId(null);
    if (r.error) {
      toast.error("Couldn't join. Please try again.");
      return;
    }
    const active = r.status === "active";
    update(c.id, (prev) => ({
      is_member: active,
      is_pending: !active,
      members_count: prev.members_count + (active ? 1 : 0),
    }));
  };

  const leave = async (c: SuggestedChannel) => {
    if (!confirm(`Leave ${c.name}?`)) return;
    setBusyId(c.id);
    const error = await leaveChannel(c.id);
    setBusyId(null);
    if (error) {
      toast.error("Couldn't leave. Please try again.");
      return;
    }
    update(c.id, (prev) => ({ is_member: false, members_count: prev.members_count - 1 }));
  };

  const toggleFollow = async (c: SuggestedChannel) => {
    const next = !c.is_follower;
    setBusyId(c.id);
    const error = await setFollowing(c.id, next);
    setBusyId(null);
    if (error) {
      toast.error(next ? "Couldn't follow. Please try again." : "Couldn't unfollow. Please try again.");
      return;
    }
    update(c.id, (prev) => ({ is_follower: next, followers_count: prev.followers_count + (next ? 1 : -1) }));
  };

  const selected = items.filter((c) => c.is_member || c.is_follower).length;
  const shown = groups
    .map((g) => ({ ...g, channels: items.filter((c) => c.source === g.source) }))
    .filter((g) => g.channels.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {shown.length === 0 && (
        <p className="text-center text-muted-foreground">No channels match your interests yet.</p>
      )}
      {shown.map((g) => (
        <section key={g.source} className="flex flex-col gap-4">
          {shown.length > 1 && <h2 className="text-lg font-semibold">{g.title}</h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.channels.map((c) => {
              const busy = busyId === c.id;
              return (
                <ChannelCardBody
                  key={c.id}
                  channel={c}
                  membersCount={c.members_count}
                  followersCount={c.followers_count}
                  linked={false}
                >
                  <div className="flex flex-wrap gap-2">
                    {c.is_member ? (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => leave(c)}>
                        <Check className="mr-2 h-4 w-4" />
                        Joined
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busy} onClick={() => join(c)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Join
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => toggleFollow(c)}>
                      <Heart className="mr-2 h-4 w-4" />
                      {c.is_follower ? "Following" : "Follow"}
                    </Button>
                  </div>
                </ChannelCardBody>
              );
            })}
          </div>
        </section>
      ))}
      <OnboardingFooter left={`${selected} selected`} continueDisabled={selected === 0} />
    </div>
  );
}

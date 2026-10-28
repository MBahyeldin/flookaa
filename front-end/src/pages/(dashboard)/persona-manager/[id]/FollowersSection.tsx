import { useCallback, useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { fetchPersonaProfile, listFollowRequests } from "@/services/persona";
import FollowersSheet, { type FollowersTab } from "@/pages/(dashboard)/personas/[id]/FollowersSheet";

type Counts = { followers: number; requests: number };

function describe({ followers, requests }: Counts) {
  const parts = [formatCount(followers, "follower", "followers")];
  if (requests > 0) parts.push(formatCount(requests, "request waiting", "requests waiting"));
  return parts.join(" · ");
}

export function FollowersSection({ personaId }: { personaId: number }) {
  const [counts, setCounts] = useState<Counts | null | "failed">(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FollowersTab>("followers");

  const load = useCallback(async () => {
    try {
      const [profile, requests] = await Promise.all([fetchPersonaProfile(String(personaId)), listFollowRequests(personaId)]);
      if (!profile || profile === "not_found" || profile.locked) return setCounts("failed");
      setCounts({ followers: profile.followers_count, requests: requests.length });
    } catch {
      setCounts("failed");
    }
  }, [personaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const manage = () => {
    setTab(counts && counts !== "failed" && counts.requests > 0 ? "requests" : "followers");
    setOpen(true);
  };

  return (
    <SettingsSection
      id="followers"
      title="Followers"
      lead={
        counts === null ? (
          <Skeleton className="h-3 w-48" />
        ) : counts === "failed" ? (
          "Couldn't load the counts."
        ) : counts.followers === 0 && counts.requests === 0 ? (
          "No followers yet."
        ) : (
          describe(counts)
        )
      }
      action={
        <Button variant="outline" onClick={manage}>
          Manage
        </Button>
      }
    >
      <FollowersSheet
        personaId={personaId}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) void load();
        }}
        tab={tab}
        onTabChange={setTab}
        reloadKey={0}
      />
    </SettingsSection>
  );
}

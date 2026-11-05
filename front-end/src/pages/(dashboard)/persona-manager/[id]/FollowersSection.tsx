import { useCallback, useEffect, useState } from "react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact } from "@/lib/format";
import { t } from "@/i18n";
import { useTranslation } from "react-i18next";
import { fetchPersonaProfile, listFollowRequests } from "@/services/persona";
import FollowersSheet, { type FollowersTab } from "@/pages/(dashboard)/personas/[id]/FollowersSheet";

type Counts = { followers: number; requests: number };

function describe({ followers, requests }: Counts) {
  const parts = [t("common:counts.followers", { count: followers, n: formatCompact(followers) })];
  if (requests > 0) parts.push(t("personas:settings.followers.requestsWaiting", { count: requests, n: formatCompact(requests) }));
  return parts.join(" · ");
}

export function FollowersSection({ personaId }: { personaId: number }) {
  const { t } = useTranslation(["personas", "common"]);
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
      title={t("settings.followers.title")}
      lead={
        counts === null ? (
          <Skeleton className="h-3 w-48" />
        ) : counts === "failed" ? (
          t("settings.followers.loadFailed")
        ) : counts.followers === 0 && counts.requests === 0 ? (
          t("settings.followers.none")
        ) : (
          describe(counts)
        )
      }
      action={
        <Button variant="outline" onClick={manage}>
          {t("manager.manage")}
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

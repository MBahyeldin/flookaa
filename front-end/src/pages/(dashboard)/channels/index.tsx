"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Hash } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getChannels } from "@/services/channels";
import InterestFilter from "@/components/interests/InterestFilter";
import { interestNamesLabel, useInterestParams } from "@/components/interests/useInterestParams";
import type { Channel } from "@/types/channel";
import { ChannelTile } from "@/components/tile/ChannelTile";
import { useIsUserLoggedIn } from "@/stores/UserProfileStore";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useTranslation } from "react-i18next";

export default function ChannelsPage() {
  const { t } = useTranslation(["channels", "common"]);
  const nagivate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isUserLoggedIn = useIsUserLoggedIn();
  const { interests, setInterests } = useInterestParams();
  const interestsKey = interests.join(",");
  const [interestNames, setInterestNames] = useState<string[]>([]);

  if (!isUserLoggedIn) {
    nagivate("/");
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getChannels({ interests: interestsKey ? interestsKey.split(",") : [] }).then((response) => {
      if (!alive) return;
      setFailed(!response);
      setChannels(response?.channels ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [interestsKey, attempt]);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start gap-3">
        <h1>{t("list.title")}</h1>
        <p className="text-muted-foreground">{t("list.lead")}</p>
        <Button asChild>
          <Link to="/channels/create">
            <Plus />
            {t("create.submit")}
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <InterestFilter value={interests} onChange={setInterests} onSelectedNames={setInterestNames} />
      </div>

      {loading ? (
        <SkeletonList count={6} variant="post" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      ) : failed ? (
        <ErrorState title={t("list.loadFailed")} onRetry={() => setAttempt((n) => n + 1)} />
      ) : channels.length === 0 ? (
        interests.length > 0 ? (
          <EmptyState
            icon={Hash}
            title={interestNames.length ? t("list.noneFor", { names: interestNamesLabel(interestNames) }) : t("list.noneWithInterests")}
            body={t("common:list.tryOtherInterests")}
            action={<Button onClick={() => setInterests([])}>{t("common:actions.showAll")}</Button>}
          />
        ) : (
          <EmptyState
            icon={Hash}
            title={t("list.empty")}
            body={t("common:list.startFirst")}
            action={
              <Button asChild>
                <Link to="/channels/create">{t("create.submit")}</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelTile key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}

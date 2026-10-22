"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Hash } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getChannels } from "@/services/channels";
import InterestFilter from "@/components/interests/InterestFilter";
import type { Channel } from "@/types/channel";
import { ChannelTile } from "@/components/tile/ChannelTile";
import { useIsUserLoggedIn } from "@/stores/UserProfileStore";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function ChannelsPage() {
  const nagivate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isUserLoggedIn = useIsUserLoggedIn();
  const [searchParams, setSearchParams] = useSearchParams();
  const interest = searchParams.get("interest") ?? "";
  const [interestName, setInterestName] = useState("");

  if (!isUserLoggedIn) {
    nagivate("/");
  }

  const selectInterest = (slug: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (slug) next.set("interest", slug);
        else next.delete("interest");
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getChannels({ interest: interest || undefined }).then((response) => {
      if (!alive) return;
      setFailed(!response);
      setChannels(response?.channels ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [interest, attempt]);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start gap-3">
        <h1>Channels</h1>
        <p className="text-muted-foreground">
          Every channel you can see. Public ones open at once; private ones take a request.
        </p>
        <Button asChild>
          <Link to="/channels/create">
            <Plus />
            Create channel
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <InterestFilter value={interest} onChange={selectInterest} onSelectedName={setInterestName} />
      </div>

      {loading ? (
        <SkeletonList count={6} variant="post" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      ) : failed ? (
        <ErrorState title="Couldn't load channels" onRetry={() => setAttempt((n) => n + 1)} />
      ) : channels.length === 0 ? (
        interest ? (
          <EmptyState
            icon={Hash}
            title={interestName ? `No channels for ${interestName} yet` : "No channels with this interest yet"}
            body="Try another interest, or start the first one."
            action={<Button onClick={() => selectInterest("")}>Show all</Button>}
          />
        ) : (
          <EmptyState
            icon={Hash}
            title="No channels yet"
            body="Start the first one."
            action={
              <Button asChild>
                <Link to="/channels/create">Create channel</Link>
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

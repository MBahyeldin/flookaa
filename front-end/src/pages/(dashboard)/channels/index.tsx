"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, Plus, Hash } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getChannels } from "@/services/channels";
import InterestFilter from "@/components/interests/InterestFilter";
import type { Channel } from "@/types/channel";
import { Input } from "@/components/ui/input";
import { ChannelCard } from "./ChannelCard";
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-3xl">Explore Channels</h1>
            <Link to="/channels/create" className="ml-auto">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover and join communities that match your interests
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search channels..." className="pl-10 py-6" />
          </div>

          <InterestFilter value={interest} onChange={selectInterest} />
        </div>

        {/* Channels Grid */}
        {loading ? (
          <SkeletonList count={6} variant="post" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" />
        ) : failed ? (
          <ErrorState title="Couldn't load channels" onRetry={() => setAttempt((n) => n + 1)} />
        ) : channels.length === 0 ? (
          interest ? (
            <EmptyState
              icon={Hash}
              title="No channels with this interest yet"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, Filter, Plus } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getChannels } from "@/services/channels";
import { listInterests } from "@/services/interests";
import type { Interest } from "@/types/interest";
import type { Channel } from "@/types/channel";
import { Input } from "@/components/ui/input";
import { ChannelCard } from "./ChannelCard";
import { useIsUserLoggedIn } from "@/stores/UserProfileStore";

export default function ChannelsPage() {
  const nagivate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const isUserLoggedIn = useIsUserLoggedIn();
  const [searchParams, setSearchParams] = useSearchParams();
  const interest = searchParams.get("interest") ?? "";
  const [filters, setFilters] = useState<Interest[]>([]);

  if (!isUserLoggedIn) {
    nagivate("/");
  }


  useEffect(() => {
    listInterests().then((r) => {
      if (r.ok) setFilters(r.data.flatMap((g) => g.interests));
    });
  }, []);

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
    const fetchChannels = async () => {
      setLoading(true);
      try {
        const response = await getChannels(interest || undefined);

        if (response) {
          setChannels(response.channels ?? []);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [interest]);

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

          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Interests:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={interest ? "outline" : "default"} size="sm" onClick={() => selectInterest("")}>
                  All
                </Button>
                {filters.map((i) => (
                  <Button
                    key={i.id}
                    variant={interest === i.slug ? "default" : "outline"}
                    size="sm"
                    aria-pressed={interest === i.slug}
                    onClick={() => selectInterest(interest === i.slug ? "" : i.slug)}
                  >
                    <span aria-hidden>{i.emoji}</span>
                    {i.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Channels Grid */}
        {loading ? (
          <p className="py-16 text-center text-muted-foreground">Loading channels...</p>
        ) : channels.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            {interest ? "No channels with this interest yet." : "No channels yet."}
          </p>
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

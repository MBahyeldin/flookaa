"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, Filter, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getChannels } from "@/services/channels";
import type { Channel } from "@/types/channel";
import { Input } from "@/components/ui/input";
import { ChannelCard } from "./ChannelCard";
import { useIsUserLoggedIn } from "@/stores/UserProfileStore";

export default function ChannelsPage() {
  const nagivate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const isUserLoggedIn = useIsUserLoggedIn();

  if (!isUserLoggedIn) {
    nagivate("/");
  }


  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await getChannels();
        console.log("Fetched channels:", response);

        if (response) {
          setChannels(response.channels);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading channels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Categories:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={"default"} size="sm">
                All
              </Button>
              {/* {categories.map((category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))} */}
            </div>
          </div>
        </div>

        {/* Channels Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels?.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      </div>
    </div>
  );
}

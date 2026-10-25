import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Hash } from "lucide-react";
import { ChannelTile } from "@/components/tile/ChannelTile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { fetchPersonaChannels } from "@/services/persona";
import type { Channel } from "@/types/channel";

const PAGE_SIZE = 24;

export function ProfileChannels({ personaId, isOwn }: { personaId: number; isOwn: boolean }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const gen = ++generation.current;
    setStatus("loading");
    const page = await fetchPersonaChannels(String(personaId), { limit: PAGE_SIZE, offset: 0 });
    if (gen !== generation.current) return;
    if (!page) {
      setStatus("error");
      return;
    }
    setChannels(page);
    setHasMore(page.length === PAGE_SIZE);
    setStatus("ready");
  }, [personaId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    const gen = generation.current;
    setLoadingMore(true);
    const page = await fetchPersonaChannels(String(personaId), { limit: PAGE_SIZE, offset: channels.length });
    setLoadingMore(false);
    if (gen !== generation.current || !page) return;
    setChannels((prev) => [...prev, ...page.filter((c) => !prev.some((p) => p.id === c.id))]);
    setHasMore(page.length === PAGE_SIZE);
  };

  if (status === "loading") return <SkeletonList count={3} className="flex flex-col gap-3" />;
  if (status === "error") return <ErrorState title="Couldn't load channels" onRetry={load} />;
  if (channels.length === 0) {
    return isOwn ? (
      <EmptyState
        icon={Hash}
        title="You haven't joined any channels"
        body="Channels you join show up here."
        action={
          <Button asChild>
            <Link to="/channels">Browse channels</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState icon={Hash} title="No channels to show" body="Not in any channels you can see." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <ChannelTile key={channel.id} channel={channel} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

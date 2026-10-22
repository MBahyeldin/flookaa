import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Boxes, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import InterestFilter from "@/components/interests/InterestFilter";
import { listCommunities } from "@/services/communities";
import type { Community } from "@/types/community";
import { SkeletonList } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CommunityTile } from "@/components/tile/CommunityTile";

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const interest = searchParams.get("interest") ?? "";
  const [interestName, setInterestName] = useState("");

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
    listCommunities(interest || undefined).then((r) => {
      if (!alive) return;
      setFailed(!r.ok);
      setCommunities(r.ok ? r.data.communities : []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [interest, attempt]);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start gap-3">
        <h1>Communities</h1>
        <p className="text-muted-foreground">
          Groups of channels around one place or passion. Join to take part, follow to keep up.
        </p>
        <Button asChild>
          <Link to="/communities/create">
            <Plus />
            Create community
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <InterestFilter value={interest} onChange={selectInterest} onSelectedName={setInterestName} />
      </div>

      {loading ? (
        <SkeletonList count={6} variant="post" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      ) : failed ? (
        <ErrorState title="Couldn't load communities" onRetry={() => setAttempt((n) => n + 1)} />
      ) : communities.length === 0 ? (
        interest ? (
          <EmptyState
            icon={Boxes}
            title={interestName ? `No communities for ${interestName} yet` : "No communities with this interest yet"}
            body="Try another interest, or start the first one."
            action={<Button onClick={() => selectInterest("")}>Show all</Button>}
          />
        ) : (
          <EmptyState
            icon={Boxes}
            title="No communities yet"
            body="Start the first one."
            action={
              <Button asChild>
                <Link to="/communities/create">Create community</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <CommunityTile key={community.id} community={community} />
          ))}
        </div>
      )}
    </div>
  );
}

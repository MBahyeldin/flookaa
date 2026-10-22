import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Boxes, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import InterestFilter from "@/components/interests/InterestFilter";
import { listCommunities } from "@/services/communities";
import type { Community } from "@/types/community";
import { CommunityCard } from "./CommunityCard";

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const interest = searchParams.get("interest") ?? "";

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
  }, [interest]);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-6 w-6 text-primary" />
          <h1 className="text-3xl">Communities</h1>
          <Link to="/communities/create" className="ml-auto">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create community
            </Button>
          </Link>
        </div>
        <p className="text-lg text-muted-foreground">Spaces that bring channels about the same topics together.</p>
      </div>

      <div className="mb-8">
        <InterestFilter value={interest} onChange={selectInterest} />
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">Loading communities...</p>
      ) : failed ? (
        <p className="py-16 text-center text-destructive">Couldn't load communities. Please reload.</p>
      ) : communities.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {interest ? "No communities with this interest yet." : "No communities yet."}
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}
    </div>
  );
}

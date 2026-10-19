import { Link } from "react-router-dom";
import { Lock, Rss, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import InterestChips from "@/components/interests/InterestChips";
import type { Community } from "@/types/community";

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Link to={`/communities/${community.slug}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
      <Card className="h-full overflow-hidden border-0 pt-0 shadow-sm transition-shadow hover:shadow-md">
        <div className="relative h-24 bg-gradient-to-br from-primary/30 to-secondary">
          {community.banner && <img src={community.banner} alt="" className="h-full w-full object-cover" />}
          {community.visibility === "private" && (
            <Badge variant="secondary" className="absolute right-3 top-3 border-0 bg-black/50 text-white">
              <Lock className="mr-1 h-3 w-3" />
              Private
            </Badge>
          )}
        </div>
        <CardContent className="-mt-8 space-y-3 px-6 pb-6">
          <Avatar className="h-14 w-14 rounded-xl border-4 border-card">
            <AvatarImage src={community.thumbnail || ""} className="object-cover" />
            <GeneratedAvatarFallback name={community.name} className="rounded-xl" />
          </Avatar>
          <div>
            <h3 className="line-clamp-1 font-semibold">{community.name}</h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{community.description}</p>
          </div>
          <InterestChips interests={community.interests} limit={3} />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {community.members_count === 1 ? "1 member" : `${community.members_count} members`}
            </span>
            <span className="flex items-center gap-1">
              <Rss className="h-4 w-4" />
              {community.channels_count === 1 ? "1 channel" : `${community.channels_count} channels`}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

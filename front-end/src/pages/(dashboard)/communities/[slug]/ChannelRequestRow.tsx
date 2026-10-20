import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import type { CommunityChannelRequest } from "@/types/community";
import { formatDateOnly } from "@/utils/formateDate";

export default function ChannelRequestRow({
  request,
  busy,
  onResolve,
}: {
  request: CommunityChannelRequest;
  busy: boolean;
  onResolve: (decision: "approve" | "reject") => void;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
        <AvatarImage src={request.thumbnail || ""} className="object-cover" />
        <GeneratedAvatarFallback name={request.name} className="rounded-lg" />
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link to={`/channels/${request.channel_id}`} className="flex items-center gap-1 text-sm font-medium hover:underline">
          <span className="truncate">{request.name}</span>
          {request.visibility === "private" && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private" />}
        </Link>
        <p className="truncate text-xs text-muted-foreground">Asked on {formatDateOnly(request.requested_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" disabled={busy} onClick={() => onResolve("approve")}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onResolve("reject")}>
          Decline
        </Button>
      </div>
    </li>
  );
}

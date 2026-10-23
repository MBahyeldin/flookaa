import { Avatar, AvatarImage } from "../ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import type { Persona } from "@/generated/graphql";
import { cn } from "@/lib/utils";
import formatDate, { formatRelativeDate } from "@/utils/formateDate";

export type PostChannel = { id: number | string; name: string; theme?: string | null };

export function PostByline({
  authorId,
  author,
  createdAt,
  channel,
  sticker = false,
}: {
  authorId: string | number;
  author?: Pick<Persona, "fullName" | "profileImageUrl" | "anonymous"> | null;
  createdAt?: string | null;
  channel?: PostChannel;
  // Canvas: the byline sits on the board as a card pill.
  sticker?: boolean;
}) {
  const link = {
    personaId: authorId,
    anonymous: author?.anonymous ?? true,
    name: author?.fullName ?? "",
    thumbnail: author?.profileImageUrl ?? undefined,
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        sticker && "rounded-full bg-card py-1.5 ps-1.5 pe-3 text-card-foreground shadow-sm"
      )}
    >
      <PersonaLink {...link} tabIndex={-1} className="shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={author?.profileImageUrl || ""} />
          <GeneratedAvatarFallback name={author?.fullName ?? ""} />
        </Avatar>
      </PersonaLink>
      <span className="min-w-0 truncate text-sm font-medium">
        <PersonaLink {...link}>{author?.fullName}</PersonaLink>
      </span>
      {channel ? (
        <span className="shrink-0 truncate rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground max-w-40">
          {channel.name}
        </span>
      ) : null}
      {createdAt ? (
        <time dateTime={createdAt} title={formatDate(createdAt)} className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeDate(createdAt)}
        </time>
      ) : null}
    </div>
  );
}

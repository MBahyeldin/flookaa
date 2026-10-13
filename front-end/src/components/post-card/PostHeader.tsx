import type { ReactNode } from "react";
import { Avatar, AvatarImage } from "../ui/avatar";
import { GeneratedAvatarFallback } from "@/components/generated-avatar";
import { PersonaLink } from "@/components/persona-link";
import type { Persona } from "@/generated/graphql";
import formatDate, { formatRelativeDate } from "@/utils/formateDate";

export function PostHeader({
  authorId,
  author,
  createdAt,
  actions,
}: {
  authorId: string | number;
  author?: Pick<Persona, "fullName" | "username" | "profileImageUrl" | "anonymous"> | null;
  createdAt?: string | null;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <PersonaLink
          personaId={authorId}
          anonymous={author?.anonymous ?? true}
          name={author?.fullName ?? ""}
          thumbnail={author?.profileImageUrl ?? undefined}
          tabIndex={-1}
          className="shrink-0"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={author?.profileImageUrl || ""} />
            <GeneratedAvatarFallback name={author?.fullName ?? ""} />
          </Avatar>
        </PersonaLink>
        <div>
          <div className="flex flex-wrap items-center gap-x-2">
            <h4 className="text-base font-medium">
              <PersonaLink
                personaId={authorId}
                anonymous={author?.anonymous ?? true}
                name={author?.fullName ?? ""}
                thumbnail={author?.profileImageUrl ?? undefined}
              >
                {author?.fullName}
              </PersonaLink>
            </h4>
            <span className="text-sm text-muted-foreground">
              @{author?.username}
            </span>
          </div>
          {createdAt && (
            <p className="text-sm text-muted-foreground">
              <time dateTime={createdAt} title={formatDate(createdAt)}>
                {formatRelativeDate(createdAt)}
              </time>
            </p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}

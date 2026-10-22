import { useState } from "react";
import { ImageIcon, Mic, User2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCreator } from "@/components/post-creator";
import { useUserProfileStore } from "@/stores/UserProfileStore";

// Slim bar that opens the current writer in place; the v2 composer is WWW-109.
export function ComposerBar({ channelName }: { channelName: string }) {
  const [open, setOpen] = useState(false);
  const persona = useUserProfileStore((s) => s.persona);

  if (open) return <PostCreator onCancel={() => setOpen(false)} onPosted={() => setOpen(false)} />;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-start outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={persona?.thumbnail} />
        <AvatarFallback className="bg-accent text-primary">
          <User2 className="size-4" />
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">Write in {channelName}…</span>
      <ImageIcon aria-hidden className="m-2 size-4 shrink-0" />
      <Mic aria-hidden className="m-2 size-4 shrink-0" />
    </button>
  );
}

import { useState } from "react";
import { ImageIcon, Mic, User2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCreator } from "@/components/post-creator";
import { useIsMobile } from "@/hooks/useMobile";
import { personaInitials } from "@/lib/personaInitials";
import { useUserProfileStore } from "@/stores/UserProfileStore";

type Opened = { block?: string };

export function ComposerBar({ channelName }: { channelName: string }) {
  const [opened, setOpened] = useState<Opened | null>(null);
  const persona = useUserProfileStore((s) => s.persona);
  const isMobile = useIsMobile();
  const close = () => setOpened(null);

  const composer = opened ? (
    <PostCreator
      channelName={channelName}
      layout={isMobile ? "sheet" : "card"}
      initialBlock={opened.block}
      onCancel={close}
      onPosted={close}
    />
  ) : null;

  if (composer && !isMobile) return composer;

  return (
    <>
      <div className="flex w-full items-center gap-1 rounded-lg border bg-card p-2 ps-3 hover:border-primary has-[button:first-of-type:focus-visible]:ring-2 has-[button:first-of-type:focus-visible]:ring-ring">
        <button
          type="button"
          onClick={() => setOpened({})}
          className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-3 text-start outline-none"
        >
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={persona?.thumbnail} />
            <AvatarFallback className="bg-accent text-xs text-primary">
              {persona ? personaInitials(persona) : <User2 className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">Write in {channelName}…</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 max-md:size-11"
          aria-label="Add an image"
          title="Add an image"
          onClick={() => setOpened({ block: "image" })}
        >
          <ImageIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 max-md:size-11"
          aria-label="Add a voice note"
          title="Add a voice note"
          onClick={() => setOpened({ block: "voiceNote" })}
        >
          <Mic className="size-4" />
        </Button>
      </div>
      {composer}
    </>
  );
}
